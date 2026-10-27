import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAdminSession } from "@/lib/auth-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getAdminSession(req);
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN access required." }, { status: 403 });
  }

  const admins = await prisma.admin.findMany({
    include: {
      player: {
        select: {
          id: true,
          username: true,
          teamName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ admins });
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "SUPER_ADMIN access required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, playerId, role, adminId } = body;

    if (action === "APPOINT") {
      if (!playerId || !role) {
        return NextResponse.json(
          { error: "playerId and role are required for appointing an admin." },
          { status: 400 }
        );
      }

      // Check if already an admin
      const existing = await prisma.admin.findFirst({
        where: { playerId },
        include: { player: true },
      });

      if (existing) {
        const updated = await prisma.admin.update({
          where: { id: existing.id },
          data: { role },
          include: { player: true },
        });

        await createAuditLog({
          adminId: session.adminId,
          actionType: "UPDATE_ADMIN_ROLE",
          targetTable: "Admin",
          targetId: updated.id,
          oldValue: { role: existing.role },
          newValue: { role: updated.role, player: updated.player.username },
        });

        return NextResponse.json({ success: true, admin: updated });
      }

      const created = await prisma.admin.create({
        data: { playerId, role },
        include: { player: true },
      });

      await createAuditLog({
        adminId: session.adminId,
        actionType: "APPOINT_ADMIN",
        targetTable: "Admin",
        targetId: created.id,
        newValue: { role: created.role, player: created.player.username },
      });

      return NextResponse.json({ success: true, admin: created });
    } else if (action === "DISMISS") {
      if (!adminId) {
        return NextResponse.json(
          { error: "adminId is required for dismissing an admin." },
          { status: 400 }
        );
      }

      // Prevent dismissing yourself if you're the only super admin
      if (adminId === session.adminId) {
        return NextResponse.json(
          { error: "You cannot dismiss your own active admin session." },
          { status: 400 }
        );
      }

      const existing = await prisma.admin.findUnique({
        where: { id: adminId },
        include: { player: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Admin record not found." }, { status: 404 });
      }

      await prisma.admin.delete({ where: { id: adminId } });

      await createAuditLog({
        adminId: session.adminId,
        actionType: "DISMISS_ADMIN",
        targetTable: "Admin",
        targetId: adminId,
        oldValue: { role: existing.role, player: existing.player.username },
      });

      return NextResponse.json({ success: true, message: "Admin dismissed successfully." });
    } else {
      return NextResponse.json({ error: "Invalid action. Use APPOINT or DISMISS." }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/admin/admins error:", error);
    return NextResponse.json(
      { error: "Failed to process admin appointment/dismissal." },
      { status: 500 }
    );
  }
}
