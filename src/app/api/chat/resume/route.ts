import { NextResponse } from "next/server";
import { verifyResumeToken } from "@/lib/chat/resume-token";
import { setVisitorId } from "@/lib/chat/visitor-session";

/** Magic-link target from the "resume my chat" email — adopts that conversation on this browser. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const verified = verifyResumeToken(token);

  const dest = new URL("/", req.url);
  dest.searchParams.set("chat", verified ? "open" : "expired");
  if (!verified) return NextResponse.redirect(dest);

  await setVisitorId(verified.visitorId);
  return NextResponse.redirect(dest);
}
