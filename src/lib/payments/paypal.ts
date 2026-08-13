import { getAppUrl } from "@/lib/stripe";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

function getPayPalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();
  return mode === "live" ? LIVE_BASE : SANDBOX_BASE;
}

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants");
  }
  return { clientId, clientSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth échoué: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function paypalFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${getPayPalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal API ${path}: ${res.status} ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export interface CreatePayPalOrderParams {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  successPath: string;
  cancelPath: string;
  customId?: string;
  /** Inscription vs mise en relation — évite le vocabulaire « match/jeux ». */
  paymentType?: "registration" | "matching";
}

export interface PayPalOrderResult {
  orderId: string;
  approveUrl: string;
}

interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    reference_id?: string;
    payments?: {
      captures?: Array<{ id: string; status: string }>;
    };
  }>;
}

function paypalCatalog(paymentType?: "registration" | "matching") {
  if (paymentType === "matching") {
    return {
      sku: "MM-INTRODUCTION",
      name: "Mise en relation accompagnee",
      description:
        "Frais de mise en relation sur la plateforme de rencontre Meet and Match",
      unitDescription:
        "Service de rencontre accompagnee — mise en relation",
    };
  }
  return {
    sku: "MM-MEMBERSHIP",
    name: "Adhesion plateforme de rencontre",
    description:
      "Frais d'inscription Meet and Match — service de rencontre accompagnee",
    unitDescription: "Adhesion — service de rencontre accompagnee",
  };
}

export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<PayPalOrderResult> {
  const appUrl = getAppUrl();
  const currency = params.currency.toUpperCase();
  const value = Number(params.amount).toFixed(2);
  const catalog = paypalCatalog(params.paymentType);
  const description = (params.description || catalog.description).slice(0, 127);

  const order = await paypalFetch<PayPalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.paymentId,
          custom_id: params.customId ?? params.paymentId,
          description,
          soft_descriptor: "MEETNMATCH SVC",
          amount: {
            currency_code: currency,
            value,
            breakdown: {
              item_total: {
                currency_code: currency,
                value,
              },
            },
          },
          items: [
            {
              name: catalog.name.slice(0, 127),
              description: catalog.unitDescription.slice(0, 127),
              sku: catalog.sku,
              quantity: "1",
              category: "DIGITAL_GOODS",
              unit_amount: {
                currency_code: currency,
                value,
              },
            },
          ],
        },
      ],
      application_context: {
        brand_name: "Meet and Match",
        landing_page: "NO_PREFERENCE",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${appUrl}${params.successPath}`,
        cancel_url: `${appUrl}${params.cancelPath}`,
      },
    }),
  });

  const approveUrl = order.links?.find((l) => l.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("PayPal: URL d'approbation manquante");
  }

  return { orderId: order.id, approveUrl };
}

export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalOrderResponse> {
  return paypalFetch<PayPalOrderResponse>(
    `/v2/checkout/orders/${orderId}/capture`,
    { method: "POST", body: "{}" }
  );
}

export async function getPayPalOrder(
  orderId: string
): Promise<PayPalOrderResponse> {
  return paypalFetch<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}`, {
    method: "GET",
  });
}

/** Extrait le payment_id stocké dans custom_id / reference_id. */
export function extractPaymentIdFromPayPalOrder(
  order: PayPalOrderResponse
): string | null {
  const unit = order.purchase_units?.[0];
  return unit?.custom_id || unit?.reference_id || null;
}

export async function verifyPayPalWebhookSignature(params: {
  headers: Headers;
  body: string;
  event: unknown;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    console.warn(
      "[paypal] PAYPAL_WEBHOOK_ID manquant — signature non vérifiée"
    );
    return true;
  }

  const transmissionId = params.headers.get("paypal-transmission-id");
  const transmissionTime = params.headers.get("paypal-transmission-time");
  const transmissionSig = params.headers.get("paypal-transmission-sig");
  const certUrl = params.headers.get("paypal-cert-url");
  const authAlgo = params.headers.get("paypal-auth-algo");

  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo
  ) {
    return false;
  }

  const result = await paypalFetch<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: params.event,
      }),
    }
  );

  return result.verification_status === "SUCCESS";
}
