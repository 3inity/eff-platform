import { NextResponse } from "next/server";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";
import { ensureSuperAdmin, signAdminToken } from "@/lib/auth-admin";
import { SUPER_ADMIN_CONFIG } from "@/lib/auth-config";
import { AUTH_COOKIES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, passcode, password } = body;
    const providedPass = passcode || password;

    if (!username || !providedPass) {
      return NextResponse.json(
        { error: "Username and passcode are required." },
        { status: 400 }
      );
    }

    // Always ensure super admin is seeded
    await ensureSuperAdmin();

    // 1. Check if user is logging in as the root SUPER_ADMIN
    if (
      username.toLowerCase() === SUPER_ADMIN_CONFIG.username.toLowerCase() &&
      providedPass === SUPER_ADMIN_CONFIG.passcode
    ) {
      const superAdmin = await prisma.admin.findFirst({
        where: { role: "SUPER_ADMIN" },
        include: { player: true },
      });

      if (superAdmin) {
        const token = await signAdminToken({
          adminId: superAdmin.id,
          role: "SUPER_ADMIN",
          username: superAdmin.player.username,
        });

        const res = NextResponse.json({
          success: true,
          admin: {
            id: superAdmin.id,
            role: superAdmin.role,
            username: superAdmin.player.username,
          },
        });

        res.cookies.set(AUTH_COOKIES.ADMIN, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return res;
      }
    }

    // 2. Otherwise look up an appointed Admin linked to a Player
    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        admins: true,
        credential: true,
      },
    });

    if (!player || player.admins.length === 0 || !player.credential) {
      return NextResponse.json(
        { error: "Invalid credentials or unauthorized admin." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(providedPass, player.credential.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials or unauthorized admin." },
        { status: 401 }
      );
    }

    const adminRecord = player.admins[0];
    const token = await signAdminToken({
      adminId: adminRecord.id,
      role: adminRecord.role,
      username: player.username,
    });

    const res = NextResponse.json({
      success: true,
      admin: {
        id: adminRecord.id,
        role: adminRecord.role,
        username: player.username,
      },
    });

    res.cookies.set(AUTH_COOKIES.ADMIN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during admin login." },
      { status: 500 }
    );
  }
}
