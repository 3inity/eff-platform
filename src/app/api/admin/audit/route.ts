import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession } from "@/lib/auth-admin";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

  const logs = await prisma.auditLog.findMany({
    include: {
      admin: {
        include: {
          player: {
            select: { username: true, teamName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}
