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
        participants: {
          where: { playerId: session.playerId },
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    // Only allowed while REGISTRATION_OPEN
    if (competition.status !== "REGISTRATION_OPEN") {
      return NextResponse.json(
        { error: "Withdrawals are only permitted while competition registration is open." },
        { status: 400 }
      );
    }

    const participant = competition.participants[0];
    if (!participant || participant.status === "WITHDRAWN") {
      return NextResponse.json(
        { error: "You are not actively registered in this competition." },
        { status: 400 }
      );
    }

    const updated = await prisma.competitionParticipant.update({
      where: { id: participant.id },
      data: { status: "WITHDRAWN" },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully withdrawn from competition.",
      participant: updated,
    });
  } catch (error) {
    console.error("POST /api/portal/competitions/[id]/withdraw error:", error);
    return NextResponse.json(
      { error: "Failed to withdraw from competition." },
      { status: 500 }
    );
  }
}
