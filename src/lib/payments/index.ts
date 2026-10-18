import type { PaymentProvider } from "./types";
import { MockProvider } from "./mock";
import { QPayProvider } from "./qpay";

const g = globalThis as unknown as { __pay?: PaymentProvider };

// PAYMENT_PROVIDER=mock (default) or qpay. Add card payments later as another provider.
export function getPayments(): PaymentProvider {
  if (g.__pay) return g.__pay;
  const name = process.env.PAYMENT_PROVIDER || "mock";
  if (name === "mock") g.__pay = new MockProvider();
  else if (name === "qpay") g.__pay = new QPayProvider();
  else throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
  return g.__pay;
}

export type { PaymentProvider } from "./types";
