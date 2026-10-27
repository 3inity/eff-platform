import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/constants";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  res.cookies.set(AUTH_COOKIES.ADMIN, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return res;
}
