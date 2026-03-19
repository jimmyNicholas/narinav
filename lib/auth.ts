import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export type AuthRole = "admin" | "teacher" | "student";

export type AuthUser = {
  username: string;
  role: AuthRole;
};

const COOKIE_NAME = "narinav_auth";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function getAuthCookieName(): string {
  return COOKIE_NAME;
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  const secret = getAuthSecret();
  return await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.username)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const secret = getAuthSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const username = typeof payload.sub === "string" ? payload.sub : "";
    const role = payload.role;
    if (!username) return null;
    if (role !== "admin" && role !== "teacher" && role !== "student") return null;
    return { username, role };
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAuthToken(token);
}

export type TestUserRecord = {
  username: string;
  role: AuthRole;
  password: string;
};

export function loadTestUsersFromEnv(): TestUserRecord[] {
  const raw = process.env.TEST_USERS_JSON;
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("TEST_USERS_JSON is not valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("TEST_USERS_JSON must be a JSON array");

  const out: TestUserRecord[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const username = String(r.username ?? "").trim();
    const role = r.role;
    const password = String(r.password ?? "");
    if (!username || !password) continue;
    if (role !== "admin" && role !== "teacher" && role !== "student") continue;
    out.push({ username, role, password });
  }
  return out;
}

