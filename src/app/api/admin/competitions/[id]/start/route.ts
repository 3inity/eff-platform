import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // Check if there are any unresolved PENDING participants
    const pendingParticipants = competition.participants.filter(
      (p) => p.status === "PENDING"
    );

    if (pendingParticipants.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot start competition. There are ${pendingParticipants.length} pending registration(s) that must be approved or rejected first.`,
          pendingCount: pendingParticipants.length,
        },
        { status: 400 }
      );
    }

    const approvedCount = competition.participants.filter(
      (p) => p.status === "APPROVED"
    ).length;

    if (approvedCount < 2) {
      return NextResponse.json(
        { error: "At least 2 approved participants are required to start a competition." },
        { status: 400 }
      );
    }

    const updated = await prisma.competition.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "START_COMPETITION",
      targetTable: "Competition",
      targetId: id,
      oldValue: { status: competition.status },
      newValue: { status: updated.status, approvedParticipants: approvedCount },
    });

    return NextResponse.json({ success: true, competition: updated });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/start error:", error);
    return NextResponse.json(
      { error: "Failed to start competition." },
      { status: 500 }
    );
  }
}
