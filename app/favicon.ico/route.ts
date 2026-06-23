import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(req: Request) {
  return NextResponse.redirect(new URL("/icon.svg", req.url), 308);
}
