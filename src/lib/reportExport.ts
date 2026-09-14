const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const EXPORT_WIDTH_PX = 900;
const EXPORT_HEIGHT_PX = 1260;

function bytesFromText(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function collectCssText() {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
    } catch {
      // Ignore stylesheets that the browser does not allow us to read.
    }
  }
  return css;
}

function createPdfPage() {
  const page = document.createElement("section");
  page.className = "reportSection pdfExportPage";
  page.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  page.style.width = `${EXPORT_WIDTH_PX}px`;
  page.style.margin = "0";
  page.style.padding = "24px";
  page.style.background = "#ffffff";
  page.style.boxSizing = "border-box";
  return page;
}

function createQuestionList() {
  const list = document.createElement("div");
  list.className = "questionList";
  return list;
}

function paginateReport(element: HTMLElement) {
  const source = element.cloneNode(true) as HTMLElement;
  source.querySelectorAll('[data-export-ignore="true"]').forEach((node) => node.remove());

  const header = source.querySelector(".reportHeader")?.cloneNode(true) as HTMLElement | undefined;
  const stats = source.querySelector(".statGrid")?.cloneNode(true) as HTMLElement | undefined;
  const questions = Array.from(source.querySelectorAll(".questionCard")).map((node) => node.cloneNode(true) as HTMLElement);

  const staging = document.createElement("div");
  staging.style.position = "fixed";
  staging.style.left = "-20000px";
  staging.style.top = "0";
  staging.style.width = `${EXPORT_WIDTH_PX}px`;
  staging.style.background = "#fff";
  staging.style.zIndex = "-1";
  document.body.appendChild(staging);

  const pages: HTMLElement[] = [];
  let page = createPdfPage();
  staging.appendChild(page);
  pages.push(page);

  if (header) page.appendChild(header);
  if (stats) page.appendChild(stats);

  let list = createQuestionList();
  page.appendChild(list);

  for (const question of questions) {
    list.appendChild(question);

    if (page.scrollHeight > EXPORT_HEIGHT_PX && list.children.length > 1) {
      list.removeChild(question);
      page = createPdfPage();
      staging.appendChild(page);
      pages.push(page);
      list = createQuestionList();
      page.appendChild(list);
      list.appendChild(question);
    }
  }

  return { pages, staging };
}

async function pageToJpeg(page: HTMLElement, cssText: string) {
  const width = EXPORT_WIDTH_PX;
  const height = Math.max(1, Math.ceil(page.scrollHeight));
  const serialized = new XMLSerializer().serializeToString(page);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#fff;">
      <style>${cssText}</style>
      ${serialized}
    </div>
  </foreignObject>
</svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    const scale = Math.min(2, Math.max(1.35, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    return {
      bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.9)),
      width: canvas.width,
      height: canvas.height
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildPdf(images: Array<{ bytes: Uint8Array; width: number; height: number }>) {
  const objectCount = 2 + images.length * 3;
  const objects = new Map<number, Uint8Array>();
  objects.set(1, bytesFromText("<< /Type /Catalog /Pages 2 0 R >>"));

  const pageObjectNumbers = images.map((_, index) => 3 + index * 3);
  objects.set(
    2,
    bytesFromText(`<< /Type /Pages /Kids [${pageObjectNumbers.map((value) => `${value} 0 R`).join(" ")}] /Count ${images.length} >>`)
  );

  images.forEach((image, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const renderedHeight = Math.min(A4_HEIGHT_PT, (image.height / image.width) * A4_WIDTH_PT);
    const y = A4_HEIGHT_PT - renderedHeight;
    const content = `q\n${A4_WIDTH_PT.toFixed(2)} 0 0 ${renderedHeight.toFixed(2)} 0 ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    const contentBytes = bytesFromText(content);

    objects.set(
      pageObject,
      bytesFromText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT.toFixed(2)} ${A4_HEIGHT_PT.toFixed(2)}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`)
    );
    objects.set(
      contentObject,
      concatBytes([
        bytesFromText(`<< /Length ${contentBytes.length} >>\nstream\n`),
        contentBytes,
        bytesFromText("endstream")
      ])
    );
    objects.set(
      imageObject,
      concatBytes([
        bytesFromText(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
        image.bytes,
        bytesFromText("\nendstream")
      ])
    );
  });

  const header = bytesFromText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const chunks: Uint8Array[] = [header];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let byteOffset = header.length;

  for (let number = 1; number <= objectCount; number += 1) {
    const body = objects.get(number);
    if (!body) throw new Error("Could not build PDF.");
    const prefix = bytesFromText(`${number} 0 obj\n`);
    const suffix = bytesFromText("\nendobj\n");
    offsets[number] = byteOffset;
    chunks.push(prefix, body, suffix);
    byteOffset += prefix.length + body.length + suffix.length;
  }

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let number = 1; number <= objectCount; number += 1) {
    xref += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(bytesFromText(xref));

  return new Blob(chunks, { type: "application/pdf" });
}

export async function downloadReportPdf(element: HTMLElement, fileName: string) {
  const cssText = collectCssText();
  const { pages, staging } = paginateReport(element);

  try {
    const images = [];
    for (const page of pages) {
      images.push(await pageToJpeg(page, cssText));
    }

    const pdf = buildPdf(images);
    const url = URL.createObjectURL(pdf);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    staging.remove();
  }
}

export function printReportElement(element: HTMLElement, title: string) {
  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) {
    window.print();
    return;
  }
  popup.opener = null;

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  popup.document.open();
  popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styles}
<style>
  body { background: #fff !important; margin: 0; padding: 18px; }
  .reportSection { max-width: 1000px; margin: 0 auto !important; }
  [data-export-ignore="true"] { display: none !important; }
  .questionCard { break-inside: avoid; page-break-inside: avoid; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .reportSection { max-width: none; }
  }
</style>
</head>
<body>${element.outerHTML}</body>
</html>`);
  popup.document.close();

  const runPrint = () => {
    popup.focus();
    popup.print();
  };

  if (popup.document.readyState === "complete") setTimeout(runPrint, 200);
  else popup.addEventListener("load", () => setTimeout(runPrint, 200), { once: true });
}
