import QRCode from "qrcode";

function asciiSafe(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Build PDF graphics commands that render a QR code as vector rectangles.
 * Returns an array of PDF content stream lines.
 */
function buildQrGraphics(qrData: QRCode.QRCode, x: number, y: number, size: number): string[] {
  const modules = qrData.modules;
  const count = modules.size;
  const moduleSize = size / count;
  const lines: string[] = [];

  // Start a new path for all black modules
  lines.push("0 0 0 rg"); // black fill color
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.get(row, col)) {
        const rx = x + col * moduleSize;
        // PDF y-axis is bottom-up; invert row
        const ry = y + size - (row + 1) * moduleSize;
        lines.push(`${rx.toFixed(2)} ${ry.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);
      }
    }
  }
  return lines;
}

export interface CertificatePdfOptions {
  title: string;
  subtitle: string;
  lines: Array<[string, string]>;
  footer: string;
  /** Optional verification URL — renders a QR code on the certificate. */
  verificationUrl?: string;
}

export function buildCertificatePdf(opts: CertificatePdfOptions): Buffer {
  const streamLines: string[] = [];
  streamLines.push(`BT /F1 22 Tf 72 740 Td (${escapePdfText(asciiSafe(opts.title))}) Tj ET`);
  streamLines.push(`BT /F1 11 Tf 72 716 Td (${escapePdfText(asciiSafe(opts.subtitle))}) Tj ET`);
  streamLines.push("0.6 0.6 0.6 RG 72 704 m 540 704 l S");
  let y = 668;
  for (const [label, value] of opts.lines) {
    streamLines.push(`BT /F1 11 Tf 72 ${y} Td (${escapePdfText(asciiSafe(`${label}: ${value}`))}) Tj ET`);
    y -= 26;
  }

  // QR code in bottom-right corner
  const qrSize = 80;
  const qrX = 612 - 72 - qrSize; // right-aligned with 72pt margin
  const qrY = 36; // near bottom

  if (opts.verificationUrl) {
    const qrData = QRCode.create(opts.verificationUrl, { errorCorrectionLevel: "M" });
    const qrLines = buildQrGraphics(qrData, qrX, qrY, qrSize);
    streamLines.push(...qrLines);

    // Label under QR code
    streamLines.push(`BT /F1 7 Tf ${qrX} ${qrY - 12} Td (${escapePdfText("Scan to verify")}) Tj ET`);

    // Footer wraps around QR area — place it to the left of the QR
    streamLines.push(`BT /F1 8 Tf 72 60 Td (${escapePdfText(asciiSafe(opts.footer))}) Tj ET`);
  } else {
    streamLines.push(`BT /F1 8 Tf 72 60 Td (${escapePdfText(asciiSafe(opts.footer))}) Tj ET`);
  }

  const stream = streamLines.join("\n");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}
