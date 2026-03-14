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

  const [invoicesRes, paymentsRes, expensesRes] = await Promise.all([
    auth.supabase.from("invoices").select("*").limit(5000),
    auth.supabase.from("payments").select("*").limit(5000),
    auth.supabase.from("expenses").select("*").limit(5000),
  ]);

  if (invoicesRes.error) return NextResponse.json({ error: invoicesRes.error.message }, { status: 500 });
  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });
  if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });

  const merged = [
    ...(invoicesRes.data ?? []).map((r) => ({ section: "invoice", ...r })),
    ...(paymentsRes.data ?? []).map((r) => ({ section: "payment", ...r })),
    ...(expensesRes.data ?? []).map((r) => ({ section: "expense", ...r })),
  ] as Record<string, unknown>[];

  const csv = toCsv(merged);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=finance.csv",
    },
  });
}
