import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type NamedEntity = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function fullName(entity?: NamedEntity | null) {
  if (!entity) return "";
  return [entity.first_name, entity.last_name].filter(Boolean).join(" ").trim();
}

function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
  return { ok: true as const };
}

export async function GET() {
  const auth = await ensureAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("appointments")
    .select(`
      *,
      patients:patient_id(id, first_name, last_name),
      dentist_profile:dentist_id(id, first_name, last_name)
    `)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (data ?? []).map((row) => {
    const patient = toOne(row.patients) as NamedEntity | null;
    const dentist = toOne(row.dentist_profile) as NamedEntity | null;

    return {
      ...row,
      patient_name: fullName(patient),
      dentist_name: fullName(dentist),
    };
  }) as Record<string, unknown>[];

  const csv = toCsv(enriched);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=appointments.csv",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
