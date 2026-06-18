import { NextResponse } from "next/server";
import { registerCustomer } from "@/lib/customer-auth";
import { getAccountSnapshot } from "@/lib/data/customer-account";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await registerCustomer({
    email: body.email ?? "",
    password: body.password ?? "",
    name: body.name ?? "",
    phone: body.phone,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await getAccountSnapshot();
  return NextResponse.json({ user });
}
