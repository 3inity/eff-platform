import { NextResponse } from "next/server";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";
import { signPlayerToken } from "@/lib/auth-player";
import { AUTH_COOKIES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { username },
      include: { credential: true },
    });

    if (!player || !player.credential) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, player.credential.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await prisma.playerCredential.update({
      where: { id: player.credential.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signPlayerToken({
      playerId: player.id,
      username: player.username,
      mustChangePassword: player.credential.mustChangePassword,
    });

    const res = NextResponse.json({
      success: true,
      mustChangePassword: player.credential.mustChangePassword,
      player: {
        id: player.id,
        username: player.username,
        teamName: player.teamName,
        avatarUrl: player.avatarUrl,
        nationality: player.nationality,
      },
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
    console.error("Player login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
