import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import crypto from "crypto";
import axios from "axios";
import { z } from "zod";
import { createInvoice, getInvoice } from "./btcpay.js";
import type { BtcpayWebhookEvent, CreateInvoiceBody } from "./types.js";

// Keep minimal state; you likely want Postgres/Redis in prod
const invoices = new Map<string, { orderId: string; status: string }>();

const {
  PORT = "8081",
  ALLOWED_ORIGIN,
  WEBHOOK_SECRET,
  DJANGO_CALLBACK_URL,
  DJANGO_CALLBACK_TOKEN
} = process.env;

if (!WEBHOOK_SECRET || !DJANGO_CALLBACK_URL || !DJANGO_CALLBACK_TOKEN) {
  throw new Error("WEBHOOK_SECRET, DJANGO_CALLBACK_URL, DJANGO_CALLBACK_TOKEN are required");
}

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS strictly to your Django frontend/api origin
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
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

  const parsed = schema.safeParse(req.body as CreateInvoiceBody);
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
  } catch (e: any) {
    console.error("Create invoice error:", e?.response?.data || e.message);
    return res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Get invoice status (optional)
app.get("/api/invoices/:id", async (req, res) => {
  try {
   
