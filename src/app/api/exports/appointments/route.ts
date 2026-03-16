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

  const admin = createAdminClient();

  const [appointmentsRes, patientsRes, profilesRes] = await Promise.all([
    admin
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000),
    admin.from("patients").select("id, first_name, last_name").limit(10000),
    admin.from("profiles").select("id, first_name, last_name").limit(10000),
  ]);

  if (appointmentsRes.error) return NextResponse.json({ error: appointmentsRes.error.message }, { status: 500 });
  if (patientsRes.error) return NextResponse.json({ error: patientsRes.error.message }, { status: 500 });
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

  const patientsById = new Map((patientsRes.data ?? []).map((p) => [p.id, p]));
  const profilesById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

  const enriched = (appointmentsRes.data ?? []).map((row) => {
    const patient = row.patient_id ? patientsById.get(row.patient_id) : undefined;
    const dentist = row.dentist_id ? profilesById.get(row.dentist_id) : undefined;

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
    },
  });
}
