import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { fetchTerrariumLabels } from "@/lib/data/terrarium-labels";
import { buildTerrariumLabelsPdf } from "@/lib/terrarium-label-pdf";

export const dynamic = "force-dynamic";

function parseIds(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") ?? undefined;
  const ids = parseIds(searchParams.get("ids"));

  if (!ids?.length) {
    return NextResponse.json({ error: "Select at least one label." }, { status: 400 });
  }

  const labels = await fetchTerrariumLabels({ locationFilter: location, ids });
  if (labels.length === 0) {
    return NextResponse.json({ error: "No matching specimens." }, { status: 404 });
  }

  const pdfBytes = await buildTerrariumLabelsPdf(labels);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `terrarium-labels-${labels.length}-${stamp}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** POST body: `{ ids: string[], location?: string }` — safer when many labels are selected. */
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { ids?: string[]; location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = body.ids?.filter(Boolean);
  if (!ids?.length) {
    return NextResponse.json({ error: "Select at least one label." }, { status: 400 });
  }

  const labels = await fetchTerrariumLabels({
    locationFilter: body.location,
    ids,
  });
  if (labels.length === 0) {
    return NextResponse.json({ error: "No matching specimens." }, { status: 404 });
  }

  const pdfBytes = await buildTerrariumLabelsPdf(labels);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `terrarium-labels-${labels.length}-${stamp}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
