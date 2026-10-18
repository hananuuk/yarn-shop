import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { replyReviewAction } from "../actions";
import { DeleteReviewButton } from "./DeleteReviewButton";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const db = await getDb();
  const r = schema.reviews;
  const rows = await db
    .select({ r, product: { id: schema.products.id, nameEn: schema.products.nameEn, colorNameEn: schema.products.colorNameEn, slug: schema.products.slug }, user: { phone: schema.users.phone, name: schema.users.name } })
    .from(r)
    .innerJoin(schema.products, eq(schema.products.id, r.productId))
    .innerJoin(schema.users, eq(schema.users.id, r.userId))
    .where(show === "unanswered" ? isNull(r.adminReply) : undefined)
    .orderBy(desc(r.createdAt))
    .limit(300);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight">Reviews</h1>
      <div className="flex gap-1">
        {[["all", "All"], ["unanswered", "Not replied"]].map(([k, l]) => (
          <Link key={k} href={`/admin/reviews?show=${k}`} aria-current={show === k ? "true" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${show === k ? "bg-ink text-white" : "border border-line bg-white hover:bg-cream"}`}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 && <p className="text-muted">No reviews yet.</p>}
      <ul className="flex flex-col gap-4">
        {rows.map(({ r: x, product, user }) => (
          <li key={x.id} className="card flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/mn/p/${product.slug}#reviews`} className="font-semibold hover:underline">{product.nameEn}{product.colorNameEn ? ` · ${product.colorNameEn}` : ""}</Link>
              <span className="text-sm text-muted">{x.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Ulaanbaatar", dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            <div className="text-sm"><span className="text-accent" aria-label={`${x.rating} out of 5`}>{"★".repeat(x.rating)}{"☆".repeat(5 - x.rating)}</span> · {user.name ?? "—"} · +976 {user.phone}</div>
            <p className="whitespace-pre-line">{x.body}</p>
            <form action={replyReviewAction} className="flex flex-col gap-2">
              <input type="hidden" name="reviewId" value={x.id} />
              <label className="label">Your public reply
                <textarea name="reply" rows={2} defaultValue={x.adminReply ?? ""} className="field py-2" placeholder="Shown under the review on the product page" />
              </label>
              <button className="btn-outline self-start">{x.adminReply ? "Update reply" : "Reply"}</button>
            </form>
            <DeleteReviewButton reviewId={x.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
