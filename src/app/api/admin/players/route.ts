import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { generateTempPassword } from "@/lib/auth-player";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const players = await prisma.player.findMany({
    include: {
      admins: true,
      credential: {
        select: {
          mustChangePassword: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ players });
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["PLAYER_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const body = await req.json();
    const {
      username,
      xHandle,
      teamName,
      clubName,
      avatarUrl,
      clubLogoUrl,
      nationality,
      coins,
    } = body;

    if (!username || !xHandle || !teamName) {
      return NextResponse.json(
        { error: "Username, X Handle, and Team Name are required." },
        { status: 400 }
      );
    }

    // Check duplicate username
    const existing = await prisma.player.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: `Player with username "${username}" already exists.` },
        { status: 400 }
      );
    }

    // Generate random 10-char temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const player = await prisma.player.create({
      data: {
        username,
        xHandle,
        teamName,
        avatarUrl: avatarUrl || null,
        nationality: nationality || null,
        coins: coins ? parseInt(coins, 10) : 0,
        credential: {
          create: {
            passwordHash,
            mustChangePassword: true,
          },
        },
      },
      include: {
        credential: true,
      },
    });

    // Write AuditLog
    await createAuditLog({
      adminId: session.adminId,
      actionType: "CREATE_PLAYER",
      targetTable: "Player",
      targetId: player.id,
      newValue: {
        username: player.username,
        teamName: player.teamName,
        coins: player.coins,
      },
    });

    return NextResponse.json({
      success: true,
      player,
      tempPassword, // Displayed to admin ONCE upon creation
    });
  } catch (error) {
    console.error("POST /api/admin/players error:", error);
    return NextResponse.json(
      { error: "Failed to create player." },
      { status: 500 }
    );
  }
}
