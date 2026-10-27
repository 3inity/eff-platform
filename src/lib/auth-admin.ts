import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "../db";
import { SESSION_SECRET, SUPER_ADMIN_CONFIG } from "./auth-config";
import { AUTH_COOKIES } from "./constants";
import bcrypt from "bcryptjs";

export type AdminRole = "SUPER_ADMIN" | "MATCH_ADMIN" | "BET_ADMIN" | "PLAYER_ADMIN";

export interface AdminJwtPayload {
  adminId: string;
  role: AdminRole;
  username: string;
}

export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SESSION_SECRET);
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as AdminJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Seeds SUPER_ADMIN on first run if it does not exist.
 */
export async function ensureSuperAdmin() {
  const existingSuper = await prisma.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    include: { player: true },
  });

  if (existingSuper) {
    return existingSuper;
  }

  // Ensure backing player exists for the super admin
  let player = await prisma.player.findUnique({
    where: { username: SUPER_ADMIN_CONFIG.username },
  });

  if (!player) {
    player = await prisma.player.create({
      data: {
        username: SUPER_ADMIN_CONFIG.username,
        xHandle: "@eff_superadmin",
        teamName: "EFF Commissioner",
      },
    });
  }

  // Ensure PlayerCredential exists
  const credential = await prisma.playerCredential.findUnique({
    where: { playerId: player.id },
  });

  if (!credential) {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_CONFIG.passcode, 10);
    await prisma.playerCredential.create({
      data: {
        playerId: player.id,
        passwordHash,
        mustChangePassword: false,
      },
    });
  }

  // Create the Admin record with SUPER_ADMIN role
  const admin = await prisma.admin.create({
    data: {
      playerId: player.id,
      role: "SUPER_ADMIN",
    },
    include: { player: true },
  });

  return admin;
}

export async function getAdminSession(req?: NextRequest | Request): Promise<AdminJwtPayload | null> {
  let token: string | undefined;

  if (req && "cookies" in req && typeof req.cookies.get === "function") {
    token = req.cookies.get(AUTH_COOKIES.ADMIN)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIES.ADMIN)?.value;
    } catch {
      // Running in environment where cookies() is unavailable
    }
  }

  if (!token) return null;
  return await verifyAdminToken(token);
}

/**
 * Role check helper: SUPER_ADMIN bypasses all permission checks!
 */
export function checkAdminPermission(adminRole: AdminRole, allowedRoles?: AdminRole[]): boolean {
  if (adminRole === "SUPER_ADMIN") return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(adminRole);
}
