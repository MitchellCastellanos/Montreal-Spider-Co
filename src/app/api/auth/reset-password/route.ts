import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/customer-auth";
import { getAccountSnapshot } from "@/lib/data/customer-account";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await resetPasswordWithToken(body.token ?? "", body.password ?? "");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await getAccountSnapshot();
  return NextResponse.json({ user });
}
