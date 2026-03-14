import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((h) => {
      const v = row[h] ?? "";
      return `"${String(v).replaceAll('"', '""')}"`;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { ok: false as const, status: 403 };
  return { ok: true as const, supabase };
}

export async function GET() {
  const auth = await ensureAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv((data ?? []) as Record<string, unknown>[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=appointments.csv",
    },
  });
}
