export type CreateInvoiceBody = {
    order_id: string;
    amount: number | string;
    currency: string; // e.g., "USD", "EUR"
    description?: string;
  };
  
  export type BtcpayInvoice = {
    id: string;
    status: "New" | "Processing" | "Settled" | "Expired" | "Invalid";
    checkoutLink: string;
    // ... other fields omitted
  };
  
  export type BtcpayWebhookEvent = {
    type: string;                // "InvoiceStatusChanged" etc.
    invoiceId: string;
    storeId: string;
    deliveryId?: string;
    data: {
      status: BtcpayInvoice["status"];
      // more fields available if you need them
    };
  };
  