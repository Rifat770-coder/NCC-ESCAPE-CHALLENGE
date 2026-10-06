/**
 * Server-side admin session helpers.
 *
 * The admin panel uses a simple cookie-based password gate. In a real
 * production deployment swap this out for proper auth (NextAuth,
 * Appwrite users, OAuth, …). For a university orientation stall the
 * password gate is sufficient — the URL is also kept obscure.
 */
import { cookies } from "next/headers";

const COOKIE = "ncc_admin";

export function checkAdminCreds(password: string): boolean {
  const raw = process.env.ADMIN_PASSWORDS || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    // Default dev password if env not set
    return password === "admin123";
  }
  return list.includes(password);
}

export function setAdminCookie() {
  cookies().set({
    name: COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
}

export function isAdmin(): boolean {
  try {
    return cookies().get(COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export function clearAdminCookie() {
  cookies().delete(COOKIE);
}