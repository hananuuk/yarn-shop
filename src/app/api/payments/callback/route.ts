import { NextResponse, type NextRequest } from "next/server";
import { getOrderByNumber, confirmPayment } from "@/lib/orders";

// QPay calls this URL after a payment. We never trust the call itself:
// confirmPayment() asks QPay's payment/check API whether the invoice is really paid.
async function handle(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("order");
  if (number) {
    const order = await getOrderByNumber(number);
    if (order) {
      try {
        await confirmPayment(order.id);
      } catch (e) {
        console.error("[payments] callback check failed", number, e);
      }
    }
  }
  // QPay expects HTTP 200 with body "SUCCESS".
  return new NextResponse("SUCCESS", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export const GET = handle;
export const POST = handle;
