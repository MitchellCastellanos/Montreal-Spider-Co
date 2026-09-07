import { NextResponse } from "next/server";

/** Key file location for IndexNow (see src/lib/indexnow.ts). Plain text, exactly the key. */
export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new NextResponse("", { status: 404 });
  return new NextResponse(key, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
