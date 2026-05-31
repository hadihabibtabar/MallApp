import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const adminSessionCookieName = "hamilia_admin_session";
export const adminSessionMaxAge = 60 * 60 * 8;

const adminUsername = "HadiAdmin";
const adminPassword = "1379HadiAd";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "hamilia-center-admin-session";
}

export function getAdminSessionValue(): string {
  return createHash("sha256")
    .update(`${adminUsername}:${adminPassword}:${getSessionSecret()}`)
    .digest("hex");
}

export function isValidAdminCredentials(username: string, password: string): boolean {
  return safeEqual(username, adminUsername) && safeEqual(password, adminPassword);
}

export function hasAdminAccess(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN?.trim();

  if (adminToken && request.headers.get("x-admin-token") === adminToken) {
    return true;
  }

  return request.cookies.get(adminSessionCookieName)?.value === getAdminSessionValue();
}
