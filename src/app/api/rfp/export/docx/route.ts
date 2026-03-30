import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
} from "docx";
import { RfpRequirement, RfpResponse } from "@/lib/types";

interface ResponseWithRequirement extends RfpResponse {
  requirement: RfpRequirement;
}

function buildCoverPage(
  projectName: string,
  clientName: string | null,
  companyName: string | null,
  dueDate: string | null
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Spacer
  paragraphs.push(new Paragraph({ spacing: { before: 4000 } }));

  // Title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "PROPOSAL",
          bold: true,
          size: 56,
          color: "1a365d",
          font: "Calibri",
        }),
      ],
    })
  );

  // Project name
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: projectName,
          bold: true,
          size: 40,
          color: "2d3748",
          font: "Calibri",
        }),
      ],
    })
  );

  // Divider line
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          color: "1a365d",
          size: 20,
        }),
      ],
    })
  );

  // Prepared for
  if (clientName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: "Prepared for",
            italics: true,
            size: 24,
            color: "718096",
            font: "Calibri",
          }),
        ],
      })
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: clientName,
            bold: true,
            size: 32,
            color: "2d3748",
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // Prepared by
  if (companyName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: "Prepared by",
            italics: true,
            size: 24,
            color: "718096",
            font: "Calibri",
          }),
        ],
      })
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: companyName,
            bold: true,
            size: 32,
            color: "2d3748",
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // Date
  const dateStr = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: dateStr,
          size: 24,
          color: "718096",
          font: "Calibri",
        }),
      ],
    })
  );

  // Page break after cover
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  return paragraphs;
}

function buildTOC(sections: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "Table of Contents",
          bold: true,
          size: 36,
          color: "1a365d",
          font: "Calibri",
        }),
      ],
    })
  );

  sections.forEach((section, i) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 100 },
        indent: { left: 360 },
        children: [
          new TextRun({
            text: `${i + 1}. ${section}`,
            size: 24,
            color: "2d3748",
            font: "Calibri",
          }),
        ],
      })
    );
  });

  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  return paragraphs;
}

function buildRequirementSection(
  sectionName: string,
  items: ResponseWithRequirement[],
  sectionIndex: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section heading
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: `${sectionIndex + 1}. ${sectionName}`,
          bold: true,
          size: 32,
          color: "1a365d",
          font: "Calibri",
        }),
      ],
    })
  );

  items.forEach((item, i) => {
    // Requirement sub-heading
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: `${sectionIndex + 1}.${i + 1} `,
            bold: true,
            size: 26,
            color: "2d3748",
            font: "Calibri",
          }),
          new TextRun({
            text: item.requirement.requirement_text.length > 120
              ? item.requirement.requirement_text.substring(0, 120) + "..."
              : item.requirement.requirement_text,
            bold: true,
            size: 26,
            color: "2d3748",
            font: "Calibri",
          }),
        ],
      })
    );

    // Requirement type badge
    paragraphs.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `[${(item.requirement.requirement_type || "narrative").toUpperCase()}]`,
            bold: true,
            size: 18,
            color: "4a5568",
            font: "Calibri",
          }),
        ],
      })
    );

    // Full requirement text if truncated
    if (item.requirement.requirement_text.length > 120) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Requirement: ",
              bold: true,
              size: 22,
              color: "4a5568",
              font: "Calibri",
              italics: true,
            }),
            new TextRun({
              text: item.requirement.requirement_text,
              size: 22,
              color: "4a5568",
              font: "Calibri",
              italics: true,
            }),
          ],
        })
      );
    }

    // Response text
    const responseText = item.edited_text || item.draft_text || "Response pending.";
    const responseLines = responseText.split("\n").filter((l: string) => l.trim().length > 0);

    paragraphs.push(
      new Paragraph({
        spacing: { before: 100, after: 50 },
        children: [
          new TextRun({
            text: "Response:",
            bold: true,
            size: 22,
            color: "1a365d",
            font: "Calibri",
          }),
        ],
      })
    );

    for (const line of responseLines) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: line.trim(),
              size: 22,
              font: "Calibri",
            }),
          ],
        })
      );
    }

    // Separator between requirement/response pairs
    if (i < items.length - 1) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "─────────────────────────────",
              color: "e2e8f0",
              size: 16,
            }),
          ],
        })
      );
    }
  });

  return paragraphs;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch project
    const { data: project, error: projError } = await supabase
      .from("rfp_projects")
      .select("*")
      .eq("project_id", project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch company profile if linked
    let companyName: string | null = null;
    if (project.profile_id) {
      const { data: profile } = await supabase
        .from("rfp_company_profiles")
        .select("company_name")
        .eq("profile_id", project.profile_id)
        .single();
      companyName = profile?.company_name || null;
    }

    // Fetch responses with joined requirements
    const { data: responses, error: resError } = await supabase
      .from("rfp_responses")
      .select("*, requirement:rfp_requirements(*)")
      .eq("project_id", project_id)
      .order("created_at", { ascending: true });

    if (resError) {
      return NextResponse.json({ error: resError.message }, { status: 500 });
    }

    const typedResponses = (responses || []) as ResponseWithRequirement[];

    // Group by section
    const sectionMap = new Map<string, ResponseWithRequirement[]>();
    for (const resp of typedResponses) {
      if (!resp.requirement) continue;
      const section = resp.requirement.section || "General Requirements";
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(resp);
    }

    // Sort sections: numbered sections first, then alphabetically
    const sortedSections = Array.from(sectionMap.keys()).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b);
    });

    // Build document sections
    const allParagraphs: Paragraph[] = [];

    // Cover page
    allParagraphs.push(
      ...buildCoverPage(project.name, project.client_name, companyName, project.due_date)
    );

    // Table of contents
    if (sortedSections.length > 0) {
      allParagraphs.push(...buildTOC(sortedSections));
    }

    // Requirement/Response sections
    sortedSections.forEach((section, i) => {
      const items = sectionMap.get(section)!;
      // Sort items by requirement sort_order
      items.sort((a, b) => (a.requirement.sort_order || 0) - (b.requirement.sort_order || 0));
      allParagraphs.push(...buildRequirementSection(section, items, i));

      // Page break between sections
      if (i < sortedSections.length - 1) {
        allParagraphs.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });

    // Handle empty proposals
    if (typedResponses.length === 0) {
      allParagraphs.push(
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: "No responses have been generated for this project yet.",
              size: 24,
              color: "718096",
              font: "Calibri",
              italics: true,
            }),
          ],
        })
      );
    }

    // Build the document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: project.name,
                      size: 18,
                      color: "a0aec0",
                      font: "Calibri",
                      italics: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: companyName ? `${companyName} | ` : "",
                      size: 18,
                      color: "a0aec0",
                      font: "Calibri",
                    }),
                    new TextRun({
                      text: "Page ",
                      size: 18,
                      color: "a0aec0",
                      font: "Calibri",
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 18,
                      color: "a0aec0",
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
          },
          children: allParagraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_Proposal.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("POST /api/rfp/export/docx error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
