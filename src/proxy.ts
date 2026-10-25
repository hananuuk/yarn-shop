import { NextResponse, type NextRequest } from "next/server";

// Runs before every page request:
// 1. "/" goes to the Mongolian shop.
// 2. Every visitor gets an anonymous id cookie ("aid") so baskets and analytics work before login.
// 3. If PREVIEW_PASSWORD is set, the whole site asks for a password (for private online previews).
function previewLocked(req: NextRequest) {
  const pass = process.env.PREVIEW_PASSWORD;
  if (!pass) return null;
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, value] = auth.split(" ");
  if (scheme === "Basic" && value) {
    const decoded = atob(value);
    if (decoded.slice(decoded.indexOf(":") + 1) === pass) return null;
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="loop preview", charset="UTF-8"' },
  });
}

export function proxy(req: NextRequest) {
  const locked = previewLocked(req);
  if (locked) return locked;
  const { pathname } = req.nextUrl;
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/mn";
    return NextResponse.redirect(url);
  }

  if (req.cookies.get("aid")) return NextResponse.next();

  const aid = crypto.randomUUID();
  // Make the new cookie visible to this same request, not only the next one.
  const headers = new Headers(req.headers);
  const cookie = headers.get("cookie");
  headers.set("cookie", cookie ? `${cookie}; aid=${aid}` : `aid=${aid}`);
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set("aid", aid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/|uploads/|api/|favicon.ico).*)"],
};
