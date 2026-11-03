/**
 * HEAVIX store — payment gateway integration (Zarinpal-compatible).
 *
 * Real Zarinpal API flow:
 *   1) POST /pg/v4/payment/request.json → { authority }
 *   2) Redirect to https://www.zarinpal.com/pg/StartPay/{authority}
 *   3) Callback with ?Authority=...&Status=OK
 *   4) POST /pg/v4/payment/verify.json → { ref_id }
 *
 * When ZARINPAL_MERCHANT_ID is NOT set (sandbox), we use a local mock
 * gateway callback URL so the full UX is demoable end-to-end.
 */

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || ""; // empty = mock mode
const SANDBOX = !MERCHANT_ID;
const API_BASE = "https://api.zarinpal.com/pg/v4/payment";
const START_PAY = "https://www.zarinpal.com/pg/StartPay/";

export interface GatewayRequest {
  amountIrr: number; // Zarinpal requires Tomans (not Rial). Our amounts are already Tomans.
  description: string;
  callbackUrl: string;
  mobile?: string;
  orderNumber?: string;
}

export interface GatewayRequestResult {
  authority: string;
  gatewayUrl: string;
  method: "ZARINPAL" | "MOCK";
}

export interface GatewayVerify {
  authority: string;
  status: string; // OK | NOK
  amountIrr: number;
}

export interface GatewayVerifyResult {
  refId: string | null;
  success: boolean;
}

/** Step 1: request a payment authority from the gateway. */
export async function requestPayment(opts: GatewayRequest): Promise<GatewayRequestResult> {
  if (SANDBOX) {
    // Mock: generate a fake authority and a local mock-gateway URL.
    const authority = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const gatewayUrl = `/store?payment=mock&Authority=${authority}&Amount=${opts.amountIrr}`;
    return { authority, gatewayUrl, method: "MOCK" };
  }

  const body = {
    merchant_id: MERCHANT_ID,
    amount: opts.amountIrr,
    description: opts.description,
    callback_url: opts.callbackUrl,
    mobile: opts.mobile,
    ...(opts.orderNumber ? { order_id: opts.orderNumber } : {}),
  };
  const res = await fetch(`${API_BASE}/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  const authority = data?.data?.authority;
  if (!authority) throw new Error(data?.errors?.message || "زرین‌پال authority دریافت نشد");
  return { authority, gatewayUrl: `${START_PAY}${authority}`, method: "ZARINPAL" };
}

/** Step 2: verify the payment after the user returns from the gateway. */
export async function verifyPayment(opts: GatewayVerify): Promise<GatewayVerifyResult> {
  if (SANDBOX) {
    // Mock: success when status is OK (our mock gateway always returns OK).
    return { refId: `MOCK-REF-${Date.now()}`, success: opts.status === "OK" };
  }

  const body = {
    merchant_id: MERCHANT_ID,
    amount: opts.amountIrr,
    authority: opts.authority,
  };
  const res = await fetch(`${API_BASE}/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  const refId = data?.data?.ref_id;
  const code = data?.data?.code;
  // code 100 or 200 = success
  return { refId: refId ? String(refId) : null, success: code === 100 || code === 200 };
}

export function isSandbox(): boolean {
  return SANDBOX;
}
