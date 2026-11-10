import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { GOOGLE_REFRESH_COOKIE } from "@/lib/server/google-oauth";

export const POST = route(async () => {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(GOOGLE_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
});
