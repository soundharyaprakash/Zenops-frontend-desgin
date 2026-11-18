import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login?banner=signed-out", request.url);
  const response = NextResponse.redirect(loginUrl);

  // Expire session cookie
  response.cookies.set("zenops_session", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
