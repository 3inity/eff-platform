import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN"])) {
      return NextResponse.json({ error: "Only SUPER_ADMIN can delete all fixtures." }, { status: 403 });
    }

    const { id: competitionId } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: { matches: true },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    const matchCount = competition.matches.length;

    // Delete all matches and reset competition matchday
    await prisma.$transaction([
      prisma.match.deleteMany({
        where: { competitionId },
      }),
      prisma.competition.update({
        where: { id: competitionId },
        data: { currentMatchday: null },
      }),
    ]);

    await createAuditLog({
      adminId: session.adminId,
      actionType: "DELETE_FIXTURES",
      targetTable: "Competition",
      targetId: competitionId,
      oldValue: { matchCount },
      newValue: { matchCount: 0 },
    });

    revalidatePath(`/competition/${competitionId}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal");

    return NextResponse.json({
      success: true,
      deletedCount: matchCount,
      message: `Deleted ${matchCount} fixtures.`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/competitions/[id]/fixtures error:", error);
    return NextResponse.json({ error: "Failed to delete fixtures." }, { status: 500 });
  }
}
