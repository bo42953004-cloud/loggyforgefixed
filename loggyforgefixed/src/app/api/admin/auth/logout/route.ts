import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin/auth";
import { logoutMember } from "@/lib/member/auth";
export async function POST() {
  await logoutMember();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
