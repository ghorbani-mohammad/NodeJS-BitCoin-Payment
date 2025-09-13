import axios from "axios";

const {
  BTCPAY_BASE_URL,
  BTCPAY_API_KEY,
  BTCPAY_STORE_ID
} = process.env;

if (!BTCPAY_BASE_URL || !BTCPAY_API_KEY || !BTCPAY_STORE_ID) {
  throw new Error("BTCPAY_* env vars are required");
}

export const btcpay = axios.create({
  baseURL: `${BTCPAY_BASE_URL.replace(/\/+$/, "")}/api/v1`,
  headers: { Authorization: `token ${BTCPAY_API_KEY}` },
  timeout: 15000
});

export async function createInvoice(input: {
  amount: string;
  currency: string;
  metadata?: Record<string, unknown>;
  description?: string;
}) {
  const { data } = await btcpay.post(
    `/stores/${BTCPAY_STORE_ID}/invoices`,
    {
      amount: input.amount,
      currency: input.currency,
      metadata: input.metadata,
      checkout: {
        speedPolicy: "HighSpeed" // enables Lightning if configured
      },
      // optional freeform description
      // will be visible to payer in checkout
      ...(input.description ? { metadataAdditional: { description: input.description } } : {})
    }
  );
  return data as any;
}

export async function getInvoice(invoiceId: string) {
  const { data } = await btcpay.get(`/stores/${BTCPAY_STORE_ID}/invoices/${invoiceId}`);
  return data as any;
}
