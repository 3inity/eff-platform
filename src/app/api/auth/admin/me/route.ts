import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-admin";
import { prisma } from "@/db";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    include: {
      player: {
        select: {
          id: true,
          username: true,
          teamName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin record not found" }, { status: 404 });
  }

  return NextResponse.json({
    admin: {
      id: admin.id,
      role: admin.role,
      username: admin.player.username,
      avatarUrl: admin.player.avatarUrl,
    },
  });
}
