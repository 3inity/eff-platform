import { NextResponse } from "next/server";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";
import { getPlayerSession, signPlayerToken, validatePassword } from "@/lib/auth-player";
import { AUTH_COOKIES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    // Enforce minimum 8 characters rule
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const credential = await prisma.playerCredential.findUnique({
      where: { playerId: session.playerId },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Player credential record not found." },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, credential.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password does not match our records." },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.playerCredential.update({
      where: { id: credential.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    // Re-issue cookie with mustChangePassword = false
    const token = await signPlayerToken({
      playerId: session.playerId,
      username: session.username,
      mustChangePassword: false,
    });

    const res = NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });

    res.cookies.set(AUTH_COOKIES.PLAYER, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while changing password." },
      { status: 500 }
    );
  }
}
