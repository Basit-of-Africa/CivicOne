function asciiSafe(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildCertificatePdf(opts: {
  title: string;
  subtitle: string;
  lines: Array<[string, string]>;
  footer: string;
}): Buffer {
  const streamLines: string[] = [];
  streamLines.push(`BT /F1 22 Tf 72 740 Td (${escapePdfText(asciiSafe(opts.title))}) Tj ET`);
  streamLines.push(`BT /F1 11 Tf 72 716 Td (${escapePdfText(asciiSafe(opts.subtitle))}) Tj ET`);
  streamLines.push("0.6 0.6 0.6 RG 72 704 m 540 704 l S");
  let y = 668;
  for (const [label, value] of opts.lines) {
    streamLines.push(`BT /F1 11 Tf 72 ${y} Td (${escapePdfText(asciiSafe(`${label}: ${value}`))}) Tj ET`);
    y -= 26;
  }
  streamLines.push(`BT /F1 8 Tf 72 60 Td (${escapePdfText(asciiSafe(opts.footer))}) Tj ET`);
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
