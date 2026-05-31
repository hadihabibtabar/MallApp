import { NextRequest, NextResponse } from "next/server";
import {
  adminSessionCookieName,
  adminSessionMaxAge,
  getAdminSessionValue,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!isValidAdminCredentials(body.username || "", body.password || "")) {
      return NextResponse.json(
        { message: "نام کاربری یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(adminSessionCookieName, getAdminSessionValue(), {
      httpOnly: true,
      maxAge: adminSessionMaxAge,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "ورود انجام نشد. دوباره تلاش کنید." },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
