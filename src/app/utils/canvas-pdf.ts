/**
 * Canvas to PDF Export Utility for KlassenDesktop Paint
 * Generates an ISO 32000-1 / PDF 1.4 compliant document embedding the canvas
 * as a high-resolution JPEG XObject. Suitable for offline archiving, sharing, and printing.
 */

export interface CanvasPdfOptions {
  title?: string;
  author?: string;
  classroomGroup?: string;
  dateStr?: string;
}

/**
 * Escapes characters for PDF literal strings (parentheses, backslashes).
 */
function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Keep ASCII printable range for Type 1 Helvetica font
    .replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Converts canvas contents to a self-contained PDF 1.4 document Blob.
 */
export function generateCanvasPdfBlob(
  canvas: HTMLCanvasElement,
  options: CanvasPdfOptions = {}
): Blob {
  // 1. Obtain JPEG binary data from canvas
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64Index = dataUrl.indexOf(',');
  const base64 = dataUrl.substring(base64Index + 1);
  const binaryString = atob(base64);
  const jpegBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    jpegBytes[i] = binaryString.charCodeAt(i);
  }

  const imgW = canvas.width;
  const imgH = canvas.height;

  // 2. Determine Page Dimensions (A4: 595.28 x 841.89 points)
  // Use Landscape if canvas width >= canvas height, Portrait otherwise
  const isLandscape = imgW >= imgH;
  const pageWidth = isLandscape ? 842 : 595;
  const pageHeight = isLandscape ? 595 : 842;

  const margin = 36; // 0.5 inch
  const headerHeight = 44;
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2 - headerHeight;

  // Compute scaled image placement preserving aspect ratio
  const scale = Math.min(availW / imgW, availH / imgH);
  const renderW = Math.round(imgW * scale);
  const renderH = Math.round(imgH * scale);
  const renderX = Math.round(margin + (availW - renderW) / 2);
  const renderY = Math.round(margin + (availH - renderH) / 2);

  // Metadata labels
  const title = options.title || 'Zeichnung / Kunstwerk';
  const author = options.author || 'Schüler/in';
  const group = options.classroomGroup || 'KlassenDesktop';
  const dateStr = options.dateStr || new Date().toLocaleDateString();

  const safeTitle = escapePdfString(title);
  const safeSub = escapePdfString(`${author} • ${group} • ${dateStr}`);

  // 3. Build PDF Content Stream
  // Y coordinates in PDF start at bottom-left
  const headerY = pageHeight - margin - 14;
  const subY = headerY - 14;

  const contentStreamText = [
    'q',
    // Header Title
    'BT',
    '/F1 14 Tf',
    `1 0 0 1 ${margin} ${headerY} Tm`,
    `(${safeTitle}) Tj`,
    'ET',
    // Subtitle / Author & Date
    'BT',
    '/F2 9 Tf',
    `0.35 0.35 0.40 rg`,
    `1 0 0 1 ${margin} ${subY} Tm`,
    `(${safeSub}) Tj`,
    'ET',
    // Dividing Line
    '0.8 0.8 0.85 RG',
    '0.75 w',
    `${margin} ${subY - 6} m ${pageWidth - margin} ${subY - 6} l S`,
    // Subtle border around canvas image
    '0.85 0.85 0.88 RG',
    '0.5 w',
    `${renderX - 1} ${renderY - 1} ${renderW + 2} ${renderH + 2} re S`,
    // Draw Image XObject
    'q',
    `${renderW} 0 0 ${renderH} ${renderX} ${renderY} cm`,
    '/Im0 Do',
    'Q',
    'Q',
  ].join('\n');

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStreamText);

  // 4. Assemble PDF Objects and Track Offsets
  const chunks: (Uint8Array | string)[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  function pushString(str: string): void {
    chunks.push(str);
    currentOffset += encoder.encode(str).length;
  }

  function pushBytes(bytes: Uint8Array): void {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  // Header
  pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  offsets.push(currentOffset);
  pushString('1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n');

  // Object 2: Pages
  offsets.push(currentOffset);
  pushString('2 0 obj\n<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>\nendobj\n');

  // Object 3: Page
  offsets.push(currentOffset);
  pushString(
    '3 0 obj\n<<\n' +
      '  /Type /Page\n' +
      '  /Parent 2 0 R\n' +
      `  /MediaBox [0 0 ${pageWidth} ${pageHeight}]\n` +
      '  /Resources <<\n' +
      '    /Font <<\n' +
      '      /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n' +
      '      /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n' +
      '    >>\n' +
      '    /XObject <<\n' +
      '      /Im0 4 0 R\n' +
      '    >>\n' +
      '  >>\n' +
      '  /Contents 5 0 R\n' +
      '>>\nendobj\n'
  );

  // Object 4: Image XObject (JPEG)
  offsets.push(currentOffset);
  pushString(
    '4 0 obj\n<<\n' +
      '  /Type /XObject\n' +
      '  /Subtype /Image\n' +
      `  /Width ${imgW}\n` +
      `  /Height ${imgH}\n` +
      '  /ColorSpace /DeviceRGB\n' +
      '  /BitsPerComponent 8\n' +
      '  /Filter /DCTDecode\n' +
      `  /Length ${jpegBytes.length}\n` +
      '>>\nstream\n'
  );
  pushBytes(jpegBytes);
  pushString('\nendstream\nendobj\n');

  // Object 5: Content Stream
  offsets.push(currentOffset);
  pushString(`5 0 obj\n<<\n  /Length ${contentBytes.length}\n>>\nstream\n`);
  pushBytes(contentBytes);
  pushString('\nendstream\nendobj\n');

  // Cross-reference table (xref)
  const xrefOffset = currentOffset;
  const objectCount = 6; // 0 to 5

  let xref = `xref\n0 ${objectCount}\n`;
  xref += '0000000000 65535 f \n';
  for (const offset of offsets) {
    const offStr = offset.toString().padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  xref += 'trailer\n<<\n';
  xref += `  /Size ${objectCount}\n`;
  xref += '  /Root 1 0 R\n';
  xref += '>>\n';
  xref += 'startxref\n';
  xref += `${xrefOffset}\n`;
  xref += '%%EOF\n';

  pushString(xref);

  // Flatten into Blob
  const blobParts = chunks.map((c) =>
    typeof c === 'string' ? encoder.encode(c) : c
  );
  return new Blob(blobParts as unknown as BlobPart[], { type: 'application/pdf' });
}

/**
 * Downloads the canvas as a PDF file directly in the browser.
 */
export function downloadCanvasAsPdf(
  canvas: HTMLCanvasElement,
  filename: string,
  options: CanvasPdfOptions = {}
): void {
  const blob = generateCanvasPdfBlob(canvas, options);
  const cleanName = filename.replace(/\.(png|jpe?g|pdf)$/i, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
