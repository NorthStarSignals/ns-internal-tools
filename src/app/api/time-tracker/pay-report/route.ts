import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/time-tracker";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(userId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format");

    // Default to current month
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const startDate = searchParams.get("start_date") || defaultStart;
    const endDate = searchParams.get("end_date") || defaultEnd;

    const supabase = createServerSupabase();

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from("tt_users")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Get approved time entries in the date range
    const { data: entries, error: entriesError } = await supabase
      .from("tt_time_entries")
      .select("user_id, hours")
      .eq("status", "approved")
      .gte("date", startDate)
      .lte("date", endDate);

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    // Aggregate hours by user
    const hoursByUser: Record<string, number> = {};
    for (const entry of entries || []) {
      hoursByUser[entry.user_id] =
        (hoursByUser[entry.user_id] || 0) + (entry.hours || 0);
    }

    // Build report
    let grandTotal = 0;
    const report = (users || []).map(
      (user: {
        id: string;
        name: string;
        pay_type: string;
        hourly_rate: number | null;
        retainer_amount: number | null;
      }) => {
        const totalHours = hoursByUser[user.id] || 0;
        let totalPay: number | null = null;

        if (user.pay_type === "hourly") {
          totalPay = totalHours * (user.hourly_rate || 0);
        } else if (user.pay_type === "retainer") {
          totalPay = user.retainer_amount || 0;
        }
        // milestone: totalPay stays null

        if (totalPay !== null) {
          grandTotal += totalPay;
        }

        return {
          user_name: user.name,
          pay_type: user.pay_type,
          total_hours: totalHours,
          rate:
            user.pay_type === "hourly"
              ? user.hourly_rate
              : user.pay_type === "retainer"
                ? user.retainer_amount
                : null,
          total_pay: totalPay,
        };
      }
    );

    // CSV format for Mercury ACH payments
    if (format === "csv") {
      const csvRows = ["name,amount"];
      for (const row of report) {
        if (row.total_pay !== null && row.total_pay > 0) {
          csvRows.push(`"${row.user_name}",${row.total_pay.toFixed(2)}`);
        }
      }
      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="pay-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json({
      start_date: startDate,
      end_date: endDate,
      report,
      grand_total: grandTotal,
    });
  } catch (err) {
    console.error("GET /api/time-tracker/pay-report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
