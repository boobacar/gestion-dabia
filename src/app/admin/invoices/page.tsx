import { createClient } from "@/lib/supabase/server";
import { ClientInvoicesPage } from "@/components/ClientInvoicesPage";

export default async function InvoicesPage() {
  const supabase = await createClient();

  // Fetch recent invoices with patient details and items
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      patients (
        id,
        first_name,
        last_name,
        patient_number,
        phone_number
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-8 text-red-500">
        Erreur lors du chargement des factures : {error.message}
      </div>
    );
  }

  return (
    <div className="w-full">
      <ClientInvoicesPage initialInvoices={invoices || []} />
    </div>
  );
}
