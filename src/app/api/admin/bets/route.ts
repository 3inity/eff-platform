import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "BET_ADMIN"])) {
    return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (statusParam) {
    where.status = statusParam;
  }

  const bets = await prisma.bet.findMany({
    where,
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

  return NextResponse.json({ bets });
}
