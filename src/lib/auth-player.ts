import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_SECRET } from "./auth-config";
import { AUTH_COOKIES, PASSWORD_MIN_LENGTH } from "./constants";

export interface PlayerJwtPayload {
  playerId: string;
  username: string;
  mustChangePassword: boolean;
}

export async function signPlayerToken(payload: PlayerJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SESSION_SECRET);
}

export async function verifyPlayerToken(token: string): Promise<PlayerJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as PlayerJwtPayload;
  } catch {
    return null;
  }
}

export async function getPlayerSession(req?: NextRequest | Request): Promise<PlayerJwtPayload | null> {
  let token: string | undefined;

  if (req && "cookies" in req && typeof req.cookies.get === "function") {
    token = req.cookies.get(AUTH_COOKIES.PLAYER)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIES.PLAYER)?.value;
    } catch {
      // Running where cookies() is unavailable
    }
  }

  if (!token) return null;
  return await verifyPlayerToken(token);
}

/**
 * Validates password meets the required minimum length of 8 characters.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  return { valid: true };
}

/**
 * Generates a random 10-character temporary password for newly registered players.
 */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
