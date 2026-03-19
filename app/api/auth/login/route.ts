import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAuthCookieName,
  loadTestUsersFromEnv,
  signAuthToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 }
    );
  }

  const users = loadTestUsersFromEnv();
  if (users.length === 0) {
    return NextResponse.json(
      { error: "No test users configured (TEST_USERS_JSON)" },
      { status: 500 }
    );
  }

  const user = users.find((u) => u.username === username);
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signAuthToken({ username: user.username, role: user.role });
  const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
  res.cookies.set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

