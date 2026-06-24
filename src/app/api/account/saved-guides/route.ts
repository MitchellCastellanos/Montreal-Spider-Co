import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { CARE_GUIDES, getCareGuide } from "@/lib/care";

export async function GET() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const saved = await prisma.savedCareGuide.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });

  const guides = saved
    .map((s) => {
      const guide = getCareGuide(s.guideSlug);
      if (!guide) return null;
      return {
        slug: s.guideSlug,
        titleEn: guide.title.en,
        titleFr: guide.title.fr,
        level: guide.level,
        minRead: guide.minRead,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug || !getCareGuide(slug)) {
    return NextResponse.json({ error: "Unknown guide." }, { status: 400 });
  }

  await prisma.savedCareGuide.upsert({
    where: { customerId_guideSlug: { customerId, guideSlug: slug } },
    create: { customerId, guideSlug: slug },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

  await prisma.savedCareGuide.deleteMany({ where: { customerId, guideSlug: slug } });
  return NextResponse.json({ ok: true });
}
