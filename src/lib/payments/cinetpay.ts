import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/stripe";

const CINETPAY_API = "https://api-checkout.cinetpay.com/v2";

function getCinetPayConfig() {
  const apikey = process.env.CINETPAY_API_KEY?.trim();
  const siteId = process.env.CINETPAY_SITE_ID?.trim();
  const secretKey = process.env.CINETPAY_SECRET_KEY?.trim();
  if (!apikey || !siteId) {
    throw new Error("CINETPAY_API_KEY / CINETPAY_SITE_ID manquants");
  }
  return { apikey, siteId, secretKey };
}

export type CinetPayChannelPreference = "mtn" | "orange" | "mobile_money";

export interface InitCinetPayParams {
  paymentId: string;
  /** Identifiant transaction CinetPay (unique marchand). */
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  /** Préférence UI (MTN / Orange) — CinetPay affiche le canal mobile money. */
  channelPreference?: CinetPayChannelPreference;
  returnPath: string;
}

export interface CinetPayInitResult {
  paymentUrl: string;
  transactionId: string;
}

interface CinetPayInitResponse {
  code: string;
  message?: string;
  description?: string;
  data?: {
    payment_url?: string;
    payment_token?: string;
  };
}

interface CinetPayCheckResponse {
  code: string;
  message?: string;
  data?: {
    status?: string;
    amount?: string | number;
    currency?: string;
    payment_method?: string;
    metadata?: string;
  };
}

/**
 * CinetPay exige souvent des montants entiers (XOF/XAF multiples de 5).
 * Pour USD on envoie le montant arrondi à 2 décimales puis entier si besoin.
 */
function formatCinetPayAmount(amount: number, currency: string): number {
  const cur = currency.toUpperCase();
  if (cur === "XOF" || cur === "XAF") {
    const rounded = Math.round(amount);
    return Math.max(5, Math.ceil(rounded / 5) * 5);
  }
  return Math.round(amount * 100) / 100;
}

export async function initCinetPayPayment(
  params: InitCinetPayParams
): Promise<CinetPayInitResult> {
  const { apikey, siteId } = getCinetPayConfig();
  const appUrl = getAppUrl();
  const currency = params.currency.toUpperCase();
  const amount = formatCinetPayAmount(params.amount, currency);

  const body = {
    apikey,
    site_id: siteId,
    transaction_id: params.transactionId,
    amount,
    currency,
    description: params.description.slice(0, 100),
    notify_url: `${appUrl}/api/webhooks/cinetpay`,
    return_url: `${appUrl}${params.returnPath}`,
    channels: "MOBILE_MONEY",
    metadata: JSON.stringify({
      payment_id: params.paymentId,
      preference: params.channelPreference ?? "mobile_money",
    }),
    customer_name: params.customerName?.slice(0, 50) || "MeetMatch",
    customer_surname: "Member",
    customer_email: params.customerEmail || undefined,
  };

  const res = await fetch(`${CINETPAY_API}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as CinetPayInitResponse;
  if (!res.ok || data.code !== "201" || !data.data?.payment_url) {
    throw new Error(
      data.message ||
        data.description ||
        `CinetPay init échoué (${data.code ?? res.status})`
    );
  }

  return {
    paymentUrl: data.data.payment_url,
    transactionId: params.transactionId,
  };
}

export async function checkCinetPayPayment(
  transactionId: string
): Promise<CinetPayCheckResponse> {
  const { apikey, siteId } = getCinetPayConfig();

  const res = await fetch(`${CINETPAY_API}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey,
      site_id: siteId,
      transaction_id: transactionId,
    }),
  });

  const data = (await res.json()) as CinetPayCheckResponse;
  if (!res.ok) {
    throw new Error(
      data.message || `CinetPay check échoué (${res.status})`
    );
  }
  return data;
}

export function isCinetPayPaymentAccepted(
  check: CinetPayCheckResponse
): boolean {
  const status = check.data?.status?.toUpperCase();
  return check.code === "00" && status === "ACCEPTED";
}

/** Champs POST notification CinetPay (ordre HMAC doc officiel). */
const HMAC_FIELDS = [
  "cpm_site_id",
  "cpm_trans_id",
  "cpm_trans_date",
  "cpm_amount",
  "cpm_currency",
  "signature",
  "payment_method",
  "cel_phone_num",
  "cpm_phone_prefixe",
  "cpm_language",
  "cpm_version",
  "cpm_payment_config",
  "cpm_page_action",
  "cpm_custom",
  "cpm_designation",
  "cpm_error_message",
] as const;

export function verifyCinetPayHmac(
  payload: Record<string, string>,
  xToken: string | null
): boolean {
  const secretKey = process.env.CINETPAY_SECRET_KEY?.trim();
  if (!secretKey) {
    // Secret optionnel en TEST — on s'appuie sur l'API check.
    return true;
  }
  if (!xToken) return false;

  const data = HMAC_FIELDS.map((field) => payload[field] ?? "").join("");
  const generated = createHmac("sha256", secretKey).update(data).digest("hex");

  try {
    const a = Buffer.from(generated, "utf8");
    const b = Buffer.from(xToken, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Génère un transaction_id CinetPay unique à partir du payment UUID. */
export function buildCinetPayTransactionId(paymentId: string): string {
  const compact = paymentId.replace(/-/g, "");
  return `mm${compact}${Date.now().toString(36)}`.slice(0, 50);
}
