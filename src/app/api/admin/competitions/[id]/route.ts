import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.competition.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    const updated = await prisma.competition.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.additionalInfo !== undefined && { additionalInfo: body.additionalInfo || null }),
        ...(body.matchdayDurationHours !== undefined && {
          matchdayDurationHours: parseInt(body.matchdayDurationHours, 10) || 24,
        }),
        ...(body.matchdayEndsAt !== undefined && {
          matchdayEndsAt: body.matchdayEndsAt ? new Date(body.matchdayEndsAt) : null,
        }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.format !== undefined && { format: body.format }),
        ...(body.season !== undefined && { season: body.season }),
        ...(body.badgeKey !== undefined && { badgeKey: body.badgeKey }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.startDate !== undefined && {
          startDate: body.startDate ? new Date(body.startDate) : null,
        }),
        ...(body.currentMatchday !== undefined && {
          currentMatchday: body.currentMatchday ? parseInt(body.currentMatchday, 10) : 1,
        }),
        ...(body.roundRobinLegs !== undefined && {
          roundRobinLegs: parseInt(body.roundRobinLegs, 10) || 1,
        }),
        ...(body.knockoutLegs !== undefined && {
          knockoutLegs: parseInt(body.knockoutLegs, 10) || 1,
        }),
        ...(body.groupCount !== undefined && {
          groupCount: body.groupCount ? parseInt(body.groupCount, 10) : null,
        }),
        ...(body.teamsPerGroup !== undefined && {
          teamsPerGroup: body.teamsPerGroup ? parseInt(body.teamsPerGroup, 10) : null,
        }),
        ...(body.qualifiersPerGroup !== undefined && {
          qualifiersPerGroup: body.qualifiersPerGroup ? parseInt(body.qualifiersPerGroup, 10) : null,
        }),
        ...(body.registrationOpenAt !== undefined && {
          registrationOpenAt: body.registrationOpenAt ? new Date(body.registrationOpenAt) : null,
        }),
        ...(body.registrationCloseAt !== undefined && {
          registrationCloseAt: body.registrationCloseAt ? new Date(body.registrationCloseAt) : null,
        }),
        ...(body.maxParticipants !== undefined && {
          maxParticipants: body.maxParticipants ? parseInt(body.maxParticipants, 10) : null,
        }),
        ...(body.requiresApproval !== undefined && {
          requiresApproval: Boolean(body.requiresApproval),
        }),
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "UPDATE_COMPETITION",
      targetTable: "Competition",
      targetId: id,
      oldValue: existing,
      newValue: updated,
    });

    revalidatePath(`/competition/${id}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");
    revalidatePath("/");

    return NextResponse.json({ success: true, competition: updated });
  } catch (error) {
    console.error("PATCH /api/admin/competitions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update competition." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission. SUPER_ADMIN or MATCH_ADMIN required." }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.competition.findUnique({
      where: { id },
      include: {
        participants: true,
        matches: true,
        teams: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // Write audit log before deleting
    await createAuditLog({
      adminId: session.adminId,
      actionType: "DELETE_COMPETITION",
      targetTable: "Competition",
      targetId: id,
      oldValue: {
        id: existing.id,
        name: existing.name,
        season: existing.season,
        type: existing.type,
        format: existing.format,
        status: existing.status,
        participantsCount: existing.participants.length,
        matchesCount: existing.matches.length,
        teamsCount: existing.teams.length,
      },
      newValue: { deletedAt: new Date().toISOString(), deletedBy: session.username },
    });

    // Database foreign keys cascade delete participants, matches, teams
    await prisma.competition.delete({
      where: { id },
    });

    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: `Competition "${existing.name}" and all associated records have been permanently deleted.`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/competitions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete competition." },
      { status: 500 }
    );
  }
}

