import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getPlayerSession } from "@/lib/auth-player";

export async function POST(req: Request) {
  try {
    const session = await getPlayerSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Verify player is registered in at least one competition with status REGISTRATION_OPEN
    const eligibleParticipant = await prisma.competitionParticipant.findFirst({
      where: {
        playerId: session.playerId,
        status: { in: ["APPROVED", "PENDING"] },
        competition: {
          status: "REGISTRATION_OPEN",
        },
      },
      include: {
        competition: true,
      },
    });

    if (!eligibleParticipant) {
      return NextResponse.json(
        {
          error:
            "Customizing club branding is only allowed while actively registered in a competition with open registration.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { clubName, clubLogoUrl } = body;

    if (!clubName && !clubLogoUrl) {
      return NextResponse.json(
        { error: "Please provide a clubName or clubLogoUrl to update." },
        { status: 400 }
      );
    }

    const updated = await prisma.competitionParticipant.update({
      where: { id: eligibleParticipant.id },
      data: {
        ...(clubName !== undefined && { teamName: clubName }),
        ...(clubLogoUrl !== undefined && { teamLogoUrl: clubLogoUrl }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Club identity updated successfully for your active competition.",
      participant: updated,
    });
  } catch (error) {
    console.error("POST /api/portal/profile/club error:", error);
    return NextResponse.json(
      { error: "Failed to update club profile." },
      { status: 500 }
    );
  }
}
