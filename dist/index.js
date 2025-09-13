import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import crypto from "crypto";
import axios from "axios";
import { z } from "zod";
import { createInvoice, getInvoice } from "./btcpay";
// Keep minimal state; you likely want Postgres/Redis in prod
const invoices = new Map();
const { PORT = "8081", ALLOWED_ORIGIN, WEBHOOK_SECRET, DJANGO_CALLBACK_URL, DJANGO_CALLBACK_TOKEN } = process.env;
if (!WEBHOOK_SECRET || !DJANGO_CALLBACK_URL || !DJANGO_CALLBACK_TOKEN) {
    throw new Error("WEBHOOK_SECRET, DJANGO_CALLBACK_URL, DJANGO_CALLBACK_TOKEN are required");
}
const app = express();
// Security
app.use(helmet({ crossOriginResourcePolicy: false }));
// CORS strictly to your Django frontend/api origin
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || origin === ALLOWED_ORIGIN)
            return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: false
}));
// JSON for normal routes
app.use(bodyParser.json());
// Health
app.get("/healthz", (_req, res) => res.send("ok"));
// Create invoice
app.post("/api/invoices", async (req, res) => {
    const schema = z.object({
        order_id: z.string().min(1),
        amount: z.union([z.number(), z.string()]),
        currency: z.string().min(3).max(5),
        description: z.string().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    try {
        const { order_id, amount, currency, description } = parsed.data;
        const inv = await createInvoice({
            amount: String(amount),
            currency,
            metadata: { orderId: order_id },
            description
        });
        invoices.set(inv.id, { orderId: order_id, status: inv.status });
        return res.json({
            invoice_id: inv.id,
            invoice_status: inv.status,
            checkout_url: inv.checkoutLink
        });
    }
    catch (e) {
        console.error("Create invoice error:", e?.response?.data || e.message);
        return res.status(500).json({ error: "Failed to create invoice" });
    }
});
// Get invoice status (optional)
app.get("/api/invoices/:id", async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const inv = await getInvoice(invoiceId);
        // Update local state
        if (invoices.has(invoiceId)) {
            invoices.set(invoiceId, {
                orderId: invoices.get(invoiceId).orderId,
                status: inv.status
            });
        }
        return res.json({
            invoice_id: inv.id,
            invoice_status: inv.status,
            checkout_url: inv.checkoutLink
        });
    }
    catch (e) {
        console.error("Get invoice error:", e?.response?.data || e.message);
        return res.status(500).json({ error: "Failed to get invoice" });
    }
});
// Webhook endpoint for BTCPay Server
app.post("/api/webhooks/btcpay", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers["btcpay-sig"];
        if (!signature) {
            return res.status(400).json({ error: "Missing signature" });
        }
        const expectedSig = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(req.body)
            .digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
            return res.status(401).json({ error: "Invalid signature" });
        }
        const event = JSON.parse(req.body.toString());
        if (event.type === "InvoiceStatusChanged") {
            const { invoiceId, data } = event;
            // Update local state
            if (invoices.has(invoiceId)) {
                const invoice = invoices.get(invoiceId);
                invoice.status = data.status;
                invoices.set(invoiceId, invoice);
                // Notify Django backend
                try {
                    await axios.post(DJANGO_CALLBACK_URL, {
                        order_id: invoice.orderId,
                        invoice_id: invoiceId,
                        status: data.status,
                        payment_method: "crypto"
                    }, {
                        headers: {
                            "Authorization": `Bearer ${DJANGO_CALLBACK_TOKEN}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 10000
                    });
                }
                catch (callbackError) {
                    console.error("Django callback failed:", callbackError?.response?.data || callbackError.message);
                    // Don't fail the webhook - BTCPay expects 200
                }
            }
        }
        return res.status(200).json({ received: true });
    }
    catch (e) {
        console.error("Webhook error:", e.message);
        return res.status(500).json({ error: "Webhook processing failed" });
    }
});
const server = app.listen(PORT, () => {
    console.log(`🚀 Crypto payments service running on port ${PORT}`);
});
