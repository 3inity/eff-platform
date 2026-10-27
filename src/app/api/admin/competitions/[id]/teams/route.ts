import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: competitionId } = await params;
    const teams = await prisma.team.findMany({
      where: { competitionId },
      include: {
        participants: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("GET /api/admin/competitions/[id]/teams error:", error);
    return NextResponse.json({ error: "Failed to fetch teams." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id: competitionId } = await params;
    const body = await req.json();
    const { name, logoUrl } = body;

    if (!name) {
      return NextResponse.json({ error: "Team name is required." }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        competitionId,
        name: name.trim(),
        logoUrl: logoUrl ? logoUrl.trim() : null,
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "CREATE_TEAM",
      targetTable: "Team",
      targetId: team.id,
      newValue: { competitionId, name: team.name },
    });

    return NextResponse.json({ success: true, team });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/teams error:", error);
    return NextResponse.json({ error: "Failed to create team." }, { status: 500 });
  }
}
