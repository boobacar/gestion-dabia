import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("id, patient_id, created_at")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const fileName = `Facture_${String(invoice.id).slice(0, 8)}.pdf`;

  let fileUrl = `/api/pdfbin/invoice/${invoice.id}`;

  try {
    const body = await request.json().catch(() => null) as { pdfBase64?: string } | null;
    if (body?.pdfBase64) {
      const admin = createAdminClient();
      const bytes = Buffer.from(body.pdfBase64, "base64");
      const storagePath = `${invoice.patient_id}/${Date.now()}_invoice_${String(invoice.id).slice(0, 8)}.pdf`;

      const { error: uploadError } = await admin.storage
        .from("patient-documents")
        .upload(storagePath, bytes, {
          contentType: "application/pdf",
          upsert: false,
          cacheControl: "3600",
        });

      if (!uploadError) {
        const { data: publicUrlData } = admin.storage
          .from("patient-documents")
          .getPublicUrl(storagePath);
        fileUrl = publicUrlData.publicUrl;
      }
    }
  } catch {
    // fallback on server pdf endpoint
  }

  const { error: insertError } = await supabase.from("documents").insert({
    patient_id: invoice.patient_id,
    file_name: fileName,
    file_url: fileUrl,
    document_type: "invoice",
    uploaded_by: user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
