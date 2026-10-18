import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PaymentProvider, InvoiceInput, Invoice, PaymentStatus } from "./types";

// Test-mode provider. Behaves like QPay from the order flow's point of view:
// an invoice is created, and "payment" is detected by checking the invoice.
// The pay page shows a "simulate payment" button that marks the invoice paid.
export class MockProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isTest = true;

  async createInvoice(input: InvoiceInput): Promise<Invoice> {
    const id = `MOCK-${input.orderNumber}-${Date.now().toString(36)}`;
    return { invoiceId: id, qrText: `TEST|${input.orderNumber}|${input.amount}` };
  }

  async checkPayment(invoiceId: string): Promise<PaymentStatus> {
    const db = await getDb();
    const [p] = await db.select().from(schema.payments).where(eq(schema.payments.invoiceId, invoiceId));
    const paid = !!p && (p.data as { simulatedPaid?: boolean } | null)?.simulatedPaid === true;
    return { paid, paidAmount: paid ? p!.amount : 0 };
  }
}
