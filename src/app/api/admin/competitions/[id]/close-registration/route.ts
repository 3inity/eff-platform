import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    const competition = await prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    }

    const updated = await prisma.competition.update({
      where: { id },
      data: {
        status: "REGISTRATION_CLOSED",
        registrationCloseAt: new Date(),
      },
    });

    await createAuditLog({
      adminId: session.adminId,
      actionType: "CLOSE_REGISTRATION",
      targetTable: "Competition",
      targetId: id,
      oldValue: { status: competition.status },
      newValue: { status: updated.status },
    });

    revalidatePath(`/competition/${id}`);
    revalidatePath("/admin/competitions");
    revalidatePath("/portal/competitions");
    revalidatePath("/");

    return NextResponse.json({ success: true, competition: updated });
  } catch (error) {
    console.error("POST /api/admin/competitions/[id]/close-registration error:", error);
    return NextResponse.json(
      { error: "Failed to close registration." },
      { status: 500 }
    );
  }
}
