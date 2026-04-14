import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { extractText, detectFileType } from "@/lib/file-extract";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const dealId = formData.get("deal_id") as string;

    if (!dealId) {
      return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify deal ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", dealId)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Gather all files from form data
    const files = formData.getAll("files").filter(
      (value): value is File => value instanceof File
    );

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const fileName = file.name;
      const storagePath = `${userId}/${dealId}/${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("data-room-files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        results.push({ fileName, error: uploadError.message });
        continue;
      }

      // Extract text
      let extractedText: string | null = null;
      let pageCount: number | null = null;

      try {
        const extraction = await extractText(buffer, fileName);
        extractedText = extraction.text;
        pageCount = extraction.pageCount;
      } catch (extractErr) {
        console.error(`Text extraction failed for ${fileName}:`, extractErr);
      }

      const fileType = detectFileType(fileName);

      // Insert into data_room_files table
      const { data: fileRecord, error: insertError } = await supabase
        .from("data_room_files")
        .insert({
          deal_id: dealId,
          file_name: fileName,
          file_path: storagePath,
          file_size: file.size,
          file_type: fileType,
          extracted_text: extractedText,
          page_count: pageCount,
          processing_status: extractedText ? "completed" : "failed",
        })
        .select()
        .single();

      if (insertError) {
        results.push({ fileName, error: insertError.message });
      } else {
        results.push(fileRecord);
      }
    }

    return NextResponse.json({ files: results.filter((r) => r.file_id) });
  } catch (err) {
    console.error("POST /api/deals/files/upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
