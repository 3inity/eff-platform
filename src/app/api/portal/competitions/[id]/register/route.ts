import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getPlayerSession } from "@/lib/auth-player";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { id: competitionId } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        participants: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // 1. Check status is REGISTRATION_OPEN
    if (competition.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        { error: "Registration is not currently open for this competition." },
        { status: 400 }
      );
    }

    // 2. Check registration time window
    const now = new Date();
    if (competition.registrationOpenAt && now < competition.registrationOpenAt) {
      return NextResponse.json(
        { error: "Registration window has not opened yet." },
        { status: 400 }
      );
    }

    if (competition.registrationCloseAt && now > competition.registrationCloseAt) {
      return NextResponse.json(
        { error: "Registration window has expired." },
        { status: 400 }
      );
    }

    // 3. Check capacity limit
    const approvedCount = competition.participants.filter(
      (p) => p.status === "APPROVED"
    ).length;

    if (competition.maxParticipants && approvedCount >= competition.maxParticipants) {
      return NextResponse.json(
        { error: "This competition has reached its maximum participant capacity." },
        { status: 400 }
      );
    }

    // 4. Check if already registered
    const existing = competition.participants.find(
      (p) => p.playerId === session.playerId
    );

    if (existing) {
      if (existing.status === "WITHDRAWN") {
        // Re-activate registration
        const newStatus = competition.requiresApproval ? "PENDING" : "APPROVED";
        const updated = await prisma.competitionParticipant.update({
          where: { id: existing.id },
          data: { status: newStatus },
        });
        return NextResponse.json({
          success: true,
          participant: updated,
          message: competition.requiresApproval
            ? "Re-registration submitted and pending admin approval."
            : "Successfully registered for competition.",
        });
      }

      return NextResponse.json(
        { error: `You are already registered with status: ${existing.status}.` },
        { status: 400 }
      );
    }

    // 5. Create participant
    const status = competition.requiresApproval ? "PENDING" : "APPROVED";
    const participant = await prisma.competitionParticipant.create({
      data: {
        competitionId,
        playerId: session.playerId,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      participant,
      message: competition.requiresApproval
        ? "Registration submitted and pending admin review."
        : "Successfully registered for the competition!",
    });
  } catch (error) {
    console.error("POST /api/portal/competitions/[id]/register error:", error);
    return NextResponse.json(
      { error: "Failed to register for competition." },
      { status: 500 }
    );
  }
}
