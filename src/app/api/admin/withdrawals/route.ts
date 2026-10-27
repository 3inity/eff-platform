import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "BET_ADMIN"])) {
    return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    include: {
      player: {
        select: {
          id: true,
          username: true,
          teamName: true,
          coins: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}
