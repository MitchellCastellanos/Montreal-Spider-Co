import { NextResponse } from "next/server";
import { getAccountSnapshot } from "@/lib/data/customer-account";

export async function GET() {
  const user = await getAccountSnapshot();
  return NextResponse.json({ user });
}
