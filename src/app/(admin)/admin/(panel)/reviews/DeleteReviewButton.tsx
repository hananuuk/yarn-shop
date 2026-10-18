"use client";

import { deleteReviewAction } from "../actions";

export function DeleteReviewButton({ reviewId }: { reviewId: number }) {
  return (
    <form
      action={deleteReviewAction}
      onSubmit={(e) => { if (!confirm("Delete this review? This can't be undone.")) e.preventDefault(); }}
      className="self-end"
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <button className="btn-ghost text-accent">Delete review</button>
    </form>
  );
}
