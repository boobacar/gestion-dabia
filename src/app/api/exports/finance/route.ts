import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type NamedEntity = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type AppointmentRef = {
  id: string;
  patient_id: string | null;
  dentist_id: string | null;
};

type InvoiceRef = {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
};

function fullName(entity?: NamedEntity | null) {
  if (!entity) return "";
  return [entity.first_name, entity.last_name].filter(Boolean).join(" ").trim();
}

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

  const [invoicesRes, paymentsRes, expensesRes, patientsRes, profilesRes, appointmentsRes] = await Promise.all([
    admin.from("invoices").select("*").limit(5000),
    admin.from("payments").select("*").limit(5000),
    admin.from("expenses").select("*").limit(5000),
    admin.from("patients").select("id, first_name, last_name").limit(10000),
    admin.from("profiles").select("id, first_name, last_name").limit(10000),
    admin.from("appointments").select("id, patient_id, dentist_id").limit(10000),
  ]);

  if (invoicesRes.error) return NextResponse.json({ error: invoicesRes.error.message }, { status: 500 });
  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });
  if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });
  if (patientsRes.error) return NextResponse.json({ error: patientsRes.error.message }, { status: 500 });
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  if (appointmentsRes.error) return NextResponse.json({ error: appointmentsRes.error.message }, { status: 500 });

  const patientsById = new Map((patientsRes.data ?? []).map((p) => [normalizeId(p.id), p]));
  const profilesById = new Map((profilesRes.data ?? []).map((p) => [normalizeId(p.id), p]));
  const appointmentsById = new Map((appointmentsRes.data ?? []).map((a) => [normalizeId(a.id), a as AppointmentRef]));
  const invoicesById = new Map((invoicesRes.data ?? []).map((i) => [normalizeId(i.id), i as InvoiceRef]));

  const invoices = (invoicesRes.data ?? []).map((row) => {
    const invoice = row as InvoiceRef;
    const appointment = appointmentsById.get(normalizeId(invoice.appointment_id));
    const patient = patientsById.get(normalizeId(invoice.patient_id))
      ?? patientsById.get(normalizeId(appointment?.patient_id));
    const dentist = profilesById.get(normalizeId(appointment?.dentist_id));

    return {
      section: "invoice",
      ...row,
      patient_name: fullName(patient),
      dentist_name: fullName(dentist),
    };
  });

  const payments = (paymentsRes.data ?? []).map((row) => {
    const payment = row as Record<string, unknown>;
    const patientId = normalizeId(payment.patient_id);
    const invoiceId = normalizeId(payment.invoice_id);

    const linkedInvoice = invoicesById.get(invoiceId);
    const appointment = appointmentsById.get(normalizeId(linkedInvoice?.appointment_id));

    const patient = patientsById.get(patientId)
      ?? patientsById.get(normalizeId(linkedInvoice?.patient_id))
      ?? patientsById.get(normalizeId(appointment?.patient_id));

    const dentist = profilesById.get(normalizeId(appointment?.dentist_id));

    return {
      section: "payment",
      ...row,
      patient_name: fullName(patient),
      dentist_name: fullName(dentist),
    };
  });

  const expenses = (expensesRes.data ?? []).map((row) => ({
    section: "expense",
    ...row,
    patient_name: "",
    dentist_name: "",
  }));

  const merged = [...invoices, ...payments, ...expenses] as Record<string, unknown>[];

  const csv = toCsv(merged);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=finance.csv",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
