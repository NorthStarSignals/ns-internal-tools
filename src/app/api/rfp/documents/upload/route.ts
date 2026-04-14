import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { extractText } from "@/lib/file-extract";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("project_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify project ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `${userId}/${projectId}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("rfp-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Create document record with pending status
    const { data: doc, error: insertError } = await supabase
      .from("rfp_documents")
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        processing_status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Extract text
    try {
      const extraction = await extractText(buffer, file.name);

      await supabase
        .from("rfp_documents")
        .update({
          extracted_text: extraction.pages,
          page_count: extraction.pageCount,
          processing_status: "completed",
        })
        .eq("document_id", doc.document_id);

      return NextResponse.json(
        {
          document: {
            ...doc,
            extracted_text: extraction.pages,
            page_count: extraction.pageCount,
            processing_status: "completed",
          },
        },
        { status: 201 }
      );
    } catch (extractErr) {
      console.error("Text extraction failed:", extractErr);

      await supabase
        .from("rfp_documents")
        .update({ processing_status: "failed" })
        .eq("document_id", doc.document_id);

      return NextResponse.json(
        { document: { ...doc, processing_status: "failed" } },
        { status: 201 }
      );
    }
  } catch (err) {
    console.error("POST /api/rfp/documents/upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
