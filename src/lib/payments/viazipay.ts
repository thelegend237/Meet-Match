import { getAppUrl } from "@/lib/stripe";

export type ViaziPayChannel = "mtn" | "orange";

function getViaziPayConfig() {
  const publicKey = process.env.VIAZIPAY_PUBLIC_KEY?.trim();
  const privateKey = process.env.VIAZIPAY_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    throw new Error("VIAZIPAY_PUBLIC_KEY / VIAZIPAY_PRIVATE_KEY manquants");
  }
  return { publicKey, privateKey };
}

function getViaziPayBaseUrl(): string {
  const mode = process.env.VIAZIPAY_MODE?.trim().toUpperCase();
  return mode === "PROD" || mode === "LIVE"
    ? "https://pay.small-deals.com"
    : "https://devpay.small-deals.com";
}

function basicAuthHeader(): string {
  const { publicKey, privateKey } = getViaziPayConfig();
  return `Basic ${Buffer.from(`${publicKey}:${privateKey}`).toString("base64")}`;
}

/**
 * ViaziPay OM/MOMO facture en XAF.
 * Convertit USD → XAF via VIAZIPAY_USD_TO_XAF (défaut 600).
 */
export function toViaziPayXafAmount(amount: number, currency: string): number {
  const cur = currency.toUpperCase();
  if (cur === "XAF" || cur === "XOF") {
    return Math.max(10, Math.round(amount));
  }
  const rate = Number(process.env.VIAZIPAY_USD_TO_XAF?.trim() || "600");
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 600;
  return Math.max(10, Math.round(amount * safeRate));
}

export function buildViaziPayOrderId(paymentId: string): string {
  // min 5 caractères — UUID ok ; préfixe pour traçabilité
  return `mm-${paymentId}`;
}

export function parseViaziPayOrderId(orderId: string): string | null {
  const trimmed = orderId.trim();
  if (trimmed.startsWith("mm-")) return trimmed.slice(3);
  // fallback : order_id = payment UUID brut
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}

export interface InitViaziPayParams {
  paymentId: string;
  amount: number;
  currency: string;
  channel: ViaziPayChannel;
  successPath: string;
  cancelPath: string;
  lang?: "fr" | "en";
}

export interface ViaziPayInitResult {
  paymentUrl: string;
  orderId: string;
  amountXaf: number;
}

interface ViaziPayInitResponse {
  message?: string;
  status?: number;
  datas?: {
    payment_url?: string;
  };
}

export async function initViaziPayPayment(
  params: InitViaziPayParams
): Promise<ViaziPayInitResult> {
  const appUrl = getAppUrl();
  const orderId = buildViaziPayOrderId(params.paymentId);
  const amountXaf = toViaziPayXafAmount(params.amount, params.currency);
  const path = params.channel === "orange" ? "/api/om" : "/api/momo";

  const body: Record<string, unknown> = {
    order_id: orderId,
    amount: amountXaf,
    currency: "XAF",
    return_url: `${appUrl}${params.successPath}`,
    cancel_url: `${appUrl}${params.cancelPath}`,
    notif_url: `${appUrl}/api/webhooks/viazipay`,
    lang: params.lang ?? "fr",
    with_costs: false,
  };

  if (params.channel === "mtn") {
    body.payer_message = "Meet & Match";
    body.payee_note = orderId;
  } else {
    body.reference = orderId;
  }

  const res = await fetch(`${getViaziPayBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as ViaziPayInitResponse;
  const paymentUrl = data.datas?.payment_url;
  if (!res.ok || data.status !== 200 || !paymentUrl) {
    const raw = (data.message || "").trim();
    const code = data.status ?? res.status;
    if (code === 401 || /^ERROR!?$/i.test(raw)) {
      throw new Error(
        "ViaziPay : authentification refusée. Vérifiez les clés et VIAZIPAY_MODE (DEV vs PROD)."
      );
    }
    throw new Error(raw || `ViaziPay init échoué (${code})`);
  }

  return { paymentUrl, orderId, amountXaf };
}

export function isViaziPayStatusSuccessful(status: string | undefined): boolean {
  const s = (status || "").toUpperCase();
  return s === "SUCCESSFUL" || s === "SUCCESS";
}
