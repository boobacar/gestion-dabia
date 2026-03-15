import { buildSimplePdf } from "@/lib/pdf/simple";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, patients(*), insurance_companies(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const { data: clinicSettings } = await supabase
    .from("clinic_settings")
    .select("*")
    .single();

  const patientName = invoice.patients
    ? `${invoice.patients.first_name || ""} ${invoice.patients.last_name || ""}`.trim()
    : "Patient";

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const remaining = Math.max(0, total - paid);

  const lines = [
    `Date: ${new Date(invoice.created_at).toLocaleDateString("fr-FR")}`,
    clinicSettings?.specialty ? `Spécialité: ${clinicSettings.specialty}` : "",
    clinicSettings?.address ? `Adresse clinique: ${clinicSettings.address}` : "",
    clinicSettings?.phone ? `Téléphone clinique: ${clinicSettings.phone}` : "",
    clinicSettings?.email ? `Email clinique: ${clinicSettings.email}` : "",
    clinicSettings?.ninea ? `NINEA: ${clinicSettings.ninea}` : "",
    clinicSettings?.rc_number ? `RC: ${clinicSettings.rc_number}` : "",
    clinicSettings?.legal_status ? `Statut juridique: ${clinicSettings.legal_status}` : "",
    "",
    `Patient: ${patientName}`,
    invoice.patients?.phone_number ? `Téléphone patient: ${invoice.patients.phone_number}` : "",
    invoice.insurance_companies?.name ? `Mutuelle: ${invoice.insurance_companies.name}` : "",
    "",
    `Montant total: ${total} FCFA`,
    `Montant reçu: ${paid} FCFA`,
    `Reste: ${remaining} FCFA`,
    invoice.notes ? `Notes: ${invoice.notes}` : "",
    "",
    "Téléchargé depuis Gestion DABIA",
  ].filter(Boolean);

  const title = `${clinicSettings?.name || "Clinique DABIA"} - Facture`;
  const bytes = await buildSimplePdf(title, lines);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  return new NextResponse(ab, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${String(invoice.id).slice(0, 8)}.pdf"`,
    },
  });
}
