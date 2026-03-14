import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildSimplePdf(title: string, lines: string[]) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  page.drawText(title, { x: 40, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;

  for (const line of lines.slice(0, 42)) {
    page.drawText(line, { x: 40, y, size: 11, font, color: rgb(0.15, 0.15, 0.15), maxWidth: 510 });
    y -= 16;
  }

  return await pdfDoc.save();
}
