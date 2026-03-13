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
export async function getInactivePatients() {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    // 1. Get IDs of patients who HAD an appointment in the last 6 months
    const { data: activeAppointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("patient_id")
      .gte("appointment_date", sixMonthsAgo.toISOString());

    if (appointmentsError) throw appointmentsError;

    const activePatientIds = new Set(activeAppointments?.map((a) => a.patient_id) || []);

    // 2. Get ALL patients
    const { data: allPatients, error: patientsError } = await supabase
      .from("patients")
      .select("id, first_name, last_name, phone_number, created_at")
      .order("last_name", { ascending: true });

    if (patientsError) throw patientsError;

    // 3. Filter patients who are NOT in the active IDs list
    const inactivePatients = allPatients.filter((p) => !activePatientIds.has(p.id))
      .map(p => ({
        ...p,
        // Optional: Add some metadata for display
        isNew: new Date(p.created_at) > sixMonthsAgo && activePatientIds.size === 0 
      }));

    return { success: true, patients: inactivePatients };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get inactive patients:", error);
    return { success: false, error: message };
  }
}

export async function getAllPatientsWithPhone() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, phone_number, patient_number")
      .not("phone_number", "is", null)
      .order("last_name", { ascending: true });

    if (error) throw error;
    return { success: true, patients: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get all patients with phone:", error);
    return { success: false, error: message };
  }
}
