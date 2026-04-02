import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { getSnowflakeConnection, executeQuery } from "@/lib/snowflake";

const TABLES_TO_SYNC = [
  "company_profiles",
  "rfp_projects",
  "rfp_documents",
  "rfp_requirements",
  "rfp_responses",
  "rfp_knowledge_base",
  "deals",
  "data_room_files",
  "financial_extracts",
  "tt_users",
  "tt_projects",
  "tt_time_entries",
  "tt_pay_periods",
  "legal_extracts",
  "red_flags",
  "deal_benchmarks",
];

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerSupabase();
    const sfConn = await getSnowflakeConnection();
    const schema = "NS_INTERNAL_TOOLS";

    // Ensure schema exists
    await executeQuery(sfConn, `CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await executeQuery(sfConn, `USE SCHEMA ${schema}`);

    const results: Record<string, { synced: number; errors: string[] }> = {};

    for (const table of TABLES_TO_SYNC) {
      const tableResult = { synced: 0, errors: [] as string[] };

      try {
        const { data: rows, error } = await supabase
          .from(table)
          .select("*")
          .limit(10000);

        if (error) {
          tableResult.errors.push(`Supabase fetch error: ${error.message}`);
          results[table] = tableResult;
          continue;
        }

        if (!rows || rows.length === 0) {
          results[table] = tableResult;
          continue;
        }

        // Create table in Snowflake if not exists
        const columns = Object.keys(rows[0]);
        const columnDefs = columns
          .map((col) => {
            const val = rows[0][col];
            if (typeof val === "number") return `"${col.toUpperCase()}" NUMBER`;
            if (typeof val === "boolean") return `"${col.toUpperCase()}" BOOLEAN`;
            if (val && typeof val === "object") return `"${col.toUpperCase()}" VARIANT`;
            return `"${col.toUpperCase()}" VARCHAR`;
          })
          .join(", ");

        await executeQuery(
          sfConn,
          `CREATE TABLE IF NOT EXISTS "${table.toUpperCase()}" (${columnDefs})`
        );

        // Truncate and reload (simple sync strategy for MVP)
        await executeQuery(sfConn, `TRUNCATE TABLE IF EXISTS "${table.toUpperCase()}"`);

        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const valuePlaceholders = batch
            .map(
              () => `(${columns.map(() => "?").join(", ")})`
            )
            .join(", ");

          const binds = batch.flatMap((row) =>
            columns.map((col) => {
              const val = row[col];
              if (val && typeof val === "object") return JSON.stringify(val);
              return val;
            })
          );

          await executeQuery(
            sfConn,
            `INSERT INTO "${table.toUpperCase()}" (${columns.map((c) => `"${c.toUpperCase()}"`).join(", ")}) VALUES ${valuePlaceholders}`,
            binds
          );

          tableResult.synced += batch.length;
        }
      } catch (err) {
        tableResult.errors.push(
          err instanceof Error ? err.message : "Unknown error"
        );
      }

      results[table] = tableResult;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Snowflake sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
