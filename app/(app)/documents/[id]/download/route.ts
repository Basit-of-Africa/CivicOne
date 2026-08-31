import { NextRequest, NextResponse } from "next/server";
import {
  getWalletDocumentBytes,
  verifyDocumentSignature,
} from "@/modules/documents/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const exp = Number(request.nextUrl.searchParams.get("exp") ?? 0);
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  if (!verifyDocumentSignature(id, sig, exp)) {
    return NextResponse.json({ error: "This link has expired or is invalid." }, { status: 410 });
  }
  try {
    const document = await getWalletDocumentBytes(id);
    return new NextResponse(new Uint8Array(document.fileData), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Content-Length": String(document.sizeBytes),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
