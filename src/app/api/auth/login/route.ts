import { NextResponse } from "next/server";
import { loginCustomer } from "@/lib/customer-auth";
import { getAccountSnapshot } from "@/lib/data/customer-account";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const customer = await loginCustomer(email, password);
  if (!customer) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const user = await getAccountSnapshot();
  return NextResponse.json({ user });
}
