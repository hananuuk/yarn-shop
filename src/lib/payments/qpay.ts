import type { PaymentProvider, InvoiceInput, Invoice, PaymentStatus } from "./types";

// QPay merchant API v2.
// Flow: get token (basic auth) -> create invoice -> customer pays in bank app ->
// QPay calls our callback URL -> we confirm with payment/check (never trust the callback alone).
//
// NOTE: written against QPay's public v2 API but NOT yet tested against a live merchant.
// Test with sandbox credentials (QPAY_ENDPOINT=https://merchant-sandbox.qpay.mn/v2) before going live.
export class QPayProvider implements PaymentProvider {
  readonly name = "qpay";
  readonly isTest = false;

  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private cfg = {
      endpoint: (process.env.QPAY_ENDPOINT || "https://merchant.qpay.mn/v2").replace(/\/$/, ""),
      username: process.env.QPAY_USERNAME || "",
      password: process.env.QPAY_PASSWORD || "",
      invoiceCode: process.env.QPAY_INVOICE_CODE || "",
    },
  ) {
    if (!cfg.username || !cfg.password || !cfg.invoiceCode) {
      throw new Error("QPay is selected but QPAY_USERNAME, QPAY_PASSWORD or QPAY_INVOICE_CODE is missing.");
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const res = await fetch(`${this.cfg.endpoint}/auth/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.cfg.username}:${this.cfg.password}`).toString("base64"),
      },
    });
    if (!res.ok) throw new Error(`QPay auth failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    // expires_in is a unix timestamp (seconds) in QPay v2 responses; fall back to 50 minutes.
    const exp = data.expires_in > 1e9 ? data.expires_in * 1000 : Date.now() + 50 * 60_000;
    this.token = { value: data.access_token, expiresAt: exp };
    return data.access_token;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.cfg.endpoint}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await this.getToken()}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`QPay ${path} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createInvoice(input: InvoiceInput): Promise<Invoice> {
    const data = await this.call<{
      invoice_id: string;
      qr_text: string;
      qr_image: string;
      qPay_shortUrl?: string;
      urls?: { name: string; description?: string; logo?: string; link: string }[];
    }>("/invoice", {
      invoice_code: this.cfg.invoiceCode,
      sender_invoice_no: input.orderNumber,
      invoice_receiver_code: "terminal",
      invoice_description: input.description,
      amount: input.amount,
      callback_url: input.callbackUrl,
    });
    return {
      invoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage: data.qr_image,
      shortUrl: data.qPay_shortUrl,
      bankLinks: (data.urls || []).map((u) => ({ name: u.description || u.name, logo: u.logo, link: u.link })),
    };
  }

  async checkPayment(invoiceId: string): Promise<PaymentStatus> {
    const data = await this.call<{
      count: number;
      paid_amount?: number;
      rows?: { payment_status: string; payment_amount: string | number }[];
    }>("/payment/check", {
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    });
    const paidRows = (data.rows || []).filter((r) => r.payment_status === "PAID");
    const paidAmount = data.paid_amount ?? paidRows.reduce((s, r) => s + Number(r.payment_amount || 0), 0);
    return { paid: paidRows.length > 0, paidAmount, raw: data };
  }
}
