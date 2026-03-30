import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface ExtractionResult {
  text: string;
  pages: ExtractedPage[];
  pageCount: number;
}

export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  const data = await pdfParse(buffer);
  const fullText = data.text;
  const pageCount = data.numpages;

  // pdf-parse doesn't give per-page text easily, so we split by form feeds
  const rawPages = fullText.split(/\f/);
  const pages: ExtractedPage[] = rawPages
    .map((text, i) => ({ page: i + 1, text: text.trim() }))
    .filter((p) => p.text.length > 0);

  // If splitting didn't work well, return as single page
  if (pages.length === 0) {
    return { text: fullText, pages: [{ page: 1, text: fullText }], pageCount };
  }

  return { text: fullText, pages, pageCount };
}

export async function extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  return {
    text,
    pages: [{ page: 1, text }],
    pageCount: 1,
  };
}

export function extractFromXLSX(buffer: Buffer): ExtractionResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }

  const text = sheets.join("\n\n");
  return {
    text,
    pages: sheets.map((s, i) => ({ page: i + 1, text: s })),
    pageCount: sheets.length,
  };
}

export function extractFromCSV(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8");
  return {
    text,
    pages: [{ page: 1, text }],
    pageCount: 1,
  };
}

export async function extractText(
  buffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const ext = fileName.toLowerCase().split(".").pop();

  switch (ext) {
    case "pdf":
      return extractFromPDF(buffer);
    case "docx":
      return extractFromDOCX(buffer);
    case "xlsx":
    case "xls":
      return extractFromXLSX(buffer);
    case "csv":
      return extractFromCSV(buffer);
    default:
      // Try as plain text
      const text = buffer.toString("utf-8");
      return { text, pages: [{ page: 1, text }], pageCount: 1 };
  }
}

export function detectFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    docx: "docx",
    doc: "doc",
    xlsx: "xlsx",
    xls: "xls",
    csv: "csv",
    txt: "txt",
    png: "image",
    jpg: "image",
    jpeg: "image",
  };
  return typeMap[ext || ""] || "unknown";
}
