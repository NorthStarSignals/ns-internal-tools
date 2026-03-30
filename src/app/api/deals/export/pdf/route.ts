import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

function formatCurrency(value: number | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#dc2626";
    case "warning": return "#f59e0b";
    case "note": return "#3b82f6";
    default: return "#6b7280";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical": return "#fef2f2";
    case "warning": return "#fffbeb";
    case "note": return "#eff6ff";
    default: return "#f9fafb";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deal_id } = body;

    if (!deal_id) {
      return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify deal ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("deal_id", deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch all related data
    const [flagsRes, financialsRes, filesRes, legalsRes] = await Promise.all([
      supabase.from("red_flags").select("*").eq("deal_id", deal_id).order("created_at"),
      supabase.from("financial_extracts").select("*").eq("deal_id", deal_id).order("period"),
      supabase.from("data_room_files").select("file_name, document_category, processing_status").eq("deal_id", deal_id),
      supabase.from("legal_extracts").select("*").eq("deal_id", deal_id),
    ]);

    const flags = flagsRes.data || [];
    const financials = financialsRes.data || [];
    const files = filesRes.data || [];
    const legals = legalsRes.data || [];

    // Sort flags by severity
    const severityOrder = { critical: 0, warning: 1, note: 2 };
    flags.sort(
      (a, b) =>
        (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
        (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
    );

    const criticalCount = flags.filter((f) => f.severity === "critical" && !f.is_dismissed).length;
    const warningCount = flags.filter((f) => f.severity === "warning" && !f.is_dismissed).length;
    const noteCount = flags.filter((f) => f.severity === "note" && !f.is_dismissed).length;
    const reportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build the HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Due Diligence Report - ${deal.deal_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; color: #1e3a5f; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #6b7280; }
    .header .deal-info { margin-top: 12px; display: flex; gap: 24px; flex-wrap: wrap; }
    .header .deal-info span { font-size: 13px; color: #4b5563; }
    .header .deal-info strong { color: #1f2937; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { padding: 16px; border-radius: 8px; text-align: center; }
    .summary-card .count { font-size: 32px; font-weight: 700; }
    .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .flag-card { padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid; }
    .flag-card h3 { font-size: 15px; margin-bottom: 4px; }
    .flag-card .severity-badge { display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; color: white; margin-bottom: 8px; }
    .flag-card p { font-size: 13px; color: #4b5563; margin-bottom: 6px; }
    .flag-card .recommendation { font-size: 13px; color: #1e3a5f; font-style: italic; }
    .flag-card.dismissed { opacity: 0.5; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Due Diligence Report</h1>
    <div class="subtitle">North Star Holdings - Deal Screener Analysis</div>
    <div class="deal-info">
      <span><strong>Deal:</strong> ${escapeHtml(deal.deal_name)}</span>
      <span><strong>Business Type:</strong> ${escapeHtml(deal.business_type || "N/A")}</span>
      <span><strong>Asking Price:</strong> ${formatCurrency(deal.asking_price)}</span>
      <span><strong>Report Date:</strong> ${reportDate}</span>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card" style="background: #fef2f2;">
        <div class="count" style="color: #dc2626;">${criticalCount}</div>
        <div class="label">Critical</div>
      </div>
      <div class="summary-card" style="background: #fffbeb;">
        <div class="count" style="color: #f59e0b;">${warningCount}</div>
        <div class="label">Warnings</div>
      </div>
      <div class="summary-card" style="background: #eff6ff;">
        <div class="count" style="color: #3b82f6;">${noteCount}</div>
        <div class="label">Notes</div>
      </div>
      <div class="summary-card" style="background: #f0fdf4;">
        <div class="count" style="color: #16a34a;">${files.length}</div>
        <div class="label">Documents</div>
      </div>
    </div>
    ${criticalCount > 0 ? `<p style="color: #dc2626; font-weight: 600;">This deal has ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} requiring immediate attention before proceeding.</p>` : ""}
    ${criticalCount === 0 && warningCount > 0 ? `<p style="color: #f59e0b; font-weight: 600;">This deal has ${warningCount} warning${warningCount > 1 ? "s" : ""} that should be investigated further.</p>` : ""}
    ${criticalCount === 0 && warningCount === 0 ? `<p style="color: #16a34a; font-weight: 600;">No critical issues or warnings identified. Review notes for additional context.</p>` : ""}
  </div>

  <div class="section">
    <h2>Red Flags &amp; Findings</h2>
    ${flags.length === 0 ? "<p>No red flags identified.</p>" : ""}
    ${flags.map((f) => `
    <div class="flag-card${f.is_dismissed ? " dismissed" : ""}" style="background: ${severityBg(f.severity)}; border-color: ${severityColor(f.severity)};">
      <span class="severity-badge" style="background: ${severityColor(f.severity)};">${f.severity}${f.is_dismissed ? " - DISMISSED" : ""}</span>
      <span class="severity-badge" style="background: #6b7280; margin-left: 4px;">${f.category}</span>
      ${f.analyst_override_severity ? `<span class="severity-badge" style="background: ${severityColor(f.analyst_override_severity)}; margin-left: 4px;">Analyst: ${f.analyst_override_severity}</span>` : ""}
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml(f.description)}</p>
      ${f.source_reference ? `<p style="font-size: 12px; color: #9ca3af;">Source: ${escapeHtml(f.source_reference)}</p>` : ""}
      ${f.recommendation ? `<p class="recommendation">Recommendation: ${escapeHtml(f.recommendation)}</p>` : ""}
      ${f.analyst_notes ? `<p style="font-size: 12px; color: #1e3a5f; margin-top: 6px; padding: 8px; background: white; border-radius: 4px;"><strong>Analyst Notes:</strong> ${escapeHtml(f.analyst_notes)}</p>` : ""}
    </div>`).join("\n")}
  </div>

  ${financials.length > 0 ? `
  <div class="section">
    <h2>Financial Overview</h2>
    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>Revenue</th>
          <th>COGS</th>
          <th>Gross Margin</th>
          <th>Net Income</th>
          <th>EBITDA</th>
        </tr>
      </thead>
      <tbody>
        ${financials.map((f) => `
        <tr>
          <td>${escapeHtml(f.period)}</td>
          <td>${formatCurrency(f.revenue)}</td>
          <td>${formatCurrency(f.cogs)}</td>
          <td>${formatCurrency(f.gross_margin)}</td>
          <td>${formatCurrency(f.net_income)}</td>
          <td>${formatCurrency(f.ebitda)}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  </div>` : ""}

  ${legals.length > 0 ? `
  <div class="section">
    <h2>Legal / Contract Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Counterparty</th>
          <th>Effective</th>
          <th>Expiration</th>
          <th>Risk</th>
          <th>Change of Control</th>
        </tr>
      </thead>
      <tbody>
        ${legals.map((l) => `
        <tr>
          <td>${escapeHtml(l.document_type || "N/A")}</td>
          <td>${escapeHtml(l.counterparty || "N/A")}</td>
          <td>${l.effective_date || "N/A"}</td>
          <td>${l.expiration_date || "N/A"}</td>
          <td style="color: ${severityColor(l.risk_level)}; font-weight: 600;">${l.risk_level}</td>
          <td>${l.change_of_control_clause ? "Yes" : "None found"}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="section">
    <h2>Document Inventory</h2>
    <table>
      <thead>
        <tr>
          <th>File Name</th>
          <th>Category</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${files.map((f) => `
        <tr>
          <td>${escapeHtml(f.file_name)}</td>
          <td>${escapeHtml(f.document_category || "Unclassified")}</td>
          <td>${escapeHtml(f.processing_status)}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by North Star Holdings - Deal Screener | ${reportDate}</p>
    <p>This report is for internal use only and does not constitute investment advice.</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="deal-report-${deal.deal_name.replace(/[^a-zA-Z0-9]/g, "-")}.html"`,
      },
    });
  } catch (err) {
    console.error("POST /api/deals/export/pdf error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
