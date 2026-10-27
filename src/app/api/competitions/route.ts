import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (statusParam) {
      where.status = statusParam;
    }

    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          include: {
            team: true,
          },
        },
        _count: {
          select: {
            participants: {
              where: { status: "APPROVED" },
            },
            matches: true,
          },
        },
      },
    });

    const formatted = competitions.map((comp) => ({
      ...comp,
      registeredCount: comp._count.participants,
      matchCount: comp._count.matches,
    }));

    return NextResponse.json({ competitions: formatted });
  } catch (error) {
    console.error("GET /api/competitions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitions." },
      { status: 500 }
    );
  }
}
