import Link from "next/link";

export default function Denied() {
  return (
    <div className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-4xl font-semibold tracking-tight">No admin access</h1>
      <p className="mt-3 text-muted">
        This account is not an admin. Admin access is given to the phone numbers listed in <code>ADMIN_PHONES</code>.
      </p>
      <Link href="/mn" className="btn mt-8">Back to the shop</Link>
    </div>
  );
}
