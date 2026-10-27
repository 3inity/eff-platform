import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession, checkAdminPermission } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const competitions = await prisma.competition.findMany({
    include: {
      _count: {
        select: {
          participants: true,
          matches: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ competitions });
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session || !checkAdminPermission(session.role, ["SUPER_ADMIN", "MATCH_ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized permission." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      additionalInfo,
      matchdayDurationHours,
      matchdayEndsAt,
      type,
      format,
      season,
      badgeKey,
      status,
      registrationOpenAt,
      registrationCloseAt,
      maxParticipants,
      requiresApproval,
    } = body;

    if (!name || !type || !format || !season) {
      return NextResponse.json(
        { error: "Name, type, format, and season are required." },
        { status: 400 }
      );
    }

    const competition = await prisma.competition.create({
      data: {
        name,
        description: description || null,
        additionalInfo: additionalInfo || null,
        matchdayDurationHours: matchdayDurationHours ? parseInt(matchdayDurationHours, 10) : 24,
        matchdayEndsAt: matchdayEndsAt ? new Date(matchdayEndsAt) : null,
        type,
        format,
        season,
        badgeKey: badgeKey || null,
        status: status || "DRAFT",
        registrationOpenAt: registrationOpenAt ? new Date(registrationOpenAt) : null,
        registrationCloseAt: registrationCloseAt ? new Date(registrationCloseAt) : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        requiresApproval: Boolean(requiresApproval),
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "CREATE_COMPETITION",
      targetTable: "Competition",
      targetId: competition.id,
      newValue: competition,
    });

    return NextResponse.json({ success: true, competition });
  } catch (error) {
    console.error("POST /api/admin/competitions error:", error);
    return NextResponse.json(
      { error: "Failed to create competition." },
      { status: 500 }
    );
  }
}
