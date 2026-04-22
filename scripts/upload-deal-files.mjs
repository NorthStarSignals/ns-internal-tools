#!/usr/bin/env node
/**
 * Upload deal files directly to Supabase (storage + DB) bypassing the web UI.
 * Usage: node scripts/upload-deal-files.mjs
 */
import fs from "fs";
import path from "path";

// Config
const SUPABASE_URL = "https://miptwmwucqsxjyindfwy.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEAL_ID = "2635e798-abe3-47d5-ac2e-1957277b1cae";
// Clerk user ID for Malik - we'll look it up from the deal record
const FILES_DIR = "C:/Users/alexa/Desktop";
const FILE_NAMES = [
  "Deal-SunnysAutoDetail-PnL-2024-2025.pdf",
  "Deal-SunnysAutoDetail-Lease-Agreement.pdf",
  "Deal-SunnysAutoDetail-BankStatement-Mar2026.pdf",
];

const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function supabaseRest(tablePath, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${tablePath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function uploadToStorage(bucket, storagePath, buffer, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload ${res.status}: ${text}`);
  }
  return res.json();
}

async function extractPdfText(buffer) {
  // Dynamic import pdf-parse from the project's node_modules
  const pdfParse = (await import("../node_modules/pdf-parse/index.js")).default;
  const data = await pdfParse(buffer);
  return { text: data.text, pageCount: data.numpages };
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error("Set SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
  }

  // Get the deal to find the clerk_user_id
  const deals = await supabaseRest(`deals?deal_id=eq.${DEAL_ID}&select=deal_id,clerk_user_id`);
  if (!deals.length) {
    console.error("Deal not found!");
    process.exit(1);
  }
  const userId = deals[0].clerk_user_id;
  console.log(`Deal found. User ID: ${userId}`);

  for (const fileName of FILE_NAMES) {
    const filePath = path.join(FILES_DIR, fileName);
    console.log(`\nProcessing: ${fileName}`);

    if (!fs.existsSync(filePath)) {
      console.error(`  File not found: ${filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const fileSize = buffer.length;
    console.log(`  Size: ${(fileSize / 1024).toFixed(1)} KB`);

    // Upload to storage
    const storagePath = `${userId}/${DEAL_ID}/${fileName}`;
    try {
      await uploadToStorage("data-room-files", storagePath, buffer, "application/pdf");
      console.log(`  Uploaded to storage: ${storagePath}`);
    } catch (err) {
      console.error(`  Storage upload failed: ${err.message}`);
      // Continue anyway - maybe already uploaded
    }

    // Extract text
    let extractedText = null;
    let pageCount = null;
    try {
      const result = await extractPdfText(buffer);
      extractedText = result.text;
      pageCount = result.pageCount;
      console.log(`  Extracted ${extractedText.length} chars, ${pageCount} pages`);
    } catch (err) {
      console.error(`  Text extraction failed: ${err.message}`);
    }

    // Insert DB record
    try {
      const record = await supabaseRest("data_room_files", {
        method: "POST",
        body: JSON.stringify({
          deal_id: DEAL_ID,
          file_name: fileName,
          file_path: storagePath,
          file_size: fileSize,
          file_type: "pdf",
          extracted_text: extractedText,
          page_count: pageCount,
          processing_status: extractedText ? "completed" : "failed",
        }),
      });
      console.log(`  DB record created: ${record[0]?.file_id}`);
    } catch (err) {
      console.error(`  DB insert failed: ${err.message}`);
    }
  }

  console.log("\nDone! All files processed.");
}

main().catch(console.error);
