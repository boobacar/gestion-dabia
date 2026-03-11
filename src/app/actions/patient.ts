"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMedicalHistory(
  patientId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialHistory: any,
  tags: string[],
  notes?: string,
) {
  const supabase = await createClient();

  // Ensure initialHistory is an object before spreading it
  const baseHistory =
    typeof initialHistory === "object" && initialHistory !== null
      ? initialHistory
      : {};

  const medicalHistory = {
    ...baseHistory,
    tags,
    notes: notes !== undefined ? notes : baseHistory.notes,
    last_updated: new Date().toISOString(),
  };

  const { error, data } = await supabase
    .from("patients")
    .update({ medical_history: medicalHistory })
    .eq("id", patientId)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "Aucun patient trouvé avec cet ID ou accès refusé par la base de données.",
    };
  }

  // Next.js will invalidate the router cache for this specific patient page
  revalidatePath(`/admin/patients/${patientId}`);

  return { success: true };
}
