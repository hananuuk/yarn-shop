export interface InvoiceInput {
  orderNumber: string;
  amount: number; // tugrik
  description: string;
  callbackUrl: string;
}

export interface Invoice {
  invoiceId: string;
  qrText?: string; // raw QR payload
  qrImage?: string; // base64 PNG (QPay returns one)
  shortUrl?: string;
  bankLinks?: { name: string; logo?: string; link: string }[];
}

export interface PaymentStatus {
  paid: boolean;
  paidAmount: number;
  raw?: unknown;
}

// Every payment method implements this. The order flow only talks to this interface,
// so switching from the test provider to QPay (or adding cards later) is configuration.
export interface PaymentProvider {
  readonly name: string;
  readonly isTest: boolean;
  createInvoice(input: InvoiceInput): Promise<Invoice>;
  checkPayment(invoiceId: string): Promise<PaymentStatus>;
}
