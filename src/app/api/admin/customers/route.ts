import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { listCustomers, searchCustomersByPhone } from "@/lib/data/customer-account";

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const phone = new URL(req.url).searchParams.get("phone");
  const results = phone != null ? await searchCustomersByPhone(phone) : await listCustomers();
  return NextResponse.json({ results });
}
