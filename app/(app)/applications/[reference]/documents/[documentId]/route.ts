import { NextRequest, NextResponse } from "next/server";
import { getApplicationDocument } from "@/modules/applications/service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reference: string; documentId: string }> },
) {
  const { reference, documentId } = await context.params;
  try {
    const document = await getApplicationDocument(reference, documentId);
    return new NextResponse(new Uint8Array(document.fileData), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Content-Length": String(document.fileData.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
