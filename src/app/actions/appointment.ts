"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendWhatsAppNotification } from "@/app/actions/whatsapp";
import { WhatsAppTemplates, standardizePhoneNumber } from "@/lib/whatsapp/templates";

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Error updating appointment status:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/appointments");
  return { success: true };
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting appointment:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/appointments");
  return { success: true };
}

export async function createAppointment(payload: {
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  notes?: string;
  status: string;
}) {
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select("*, patients(*)")
    .maybeSingle();

  if (error) {
    console.error("[Appointment] Supabase error:", error);
    return { error: error.message };
  }

  console.info("[Appointment] Created:", appointment?.id);

  // Trigger WhatsApp notification asynchronously
  if (appointment && appointment.status === "scheduled") {
    let patient = appointment.patients;
    console.info("[Appointment] Patient data type:", typeof patient, Array.isArray(patient) ? "array" : "object");
    
    if (Array.isArray(patient)) patient = patient[0];
    
    if (patient?.phone_number) {
      console.info("[Appointment] Found phone:", patient.phone_number);
      const phone = standardizePhoneNumber(patient.phone_number);
      const message = WhatsAppTemplates.appointmentConfirmation(
        `${patient.first_name} ${patient.last_name}`,
        appointment.appointment_date
      );
      
      console.info("[Appointment] Triggering WhatsApp notification...");
      sendWhatsAppNotification(phone, message, patient.id, "confirmation").then(res => {
        console.info("[Appointment] WhatsApp result:", res);
      });
    } else {
      console.warn("[Appointment] No phone number for patient:", patient?.id);
    }
  } else {
    console.info("[Appointment] Skipping WA (not scheduled or no data)");
  }

  revalidatePath("/admin/appointments");
  return { success: true, data: appointment };
}

export async function updateAppointment(id: string, payload: {
  patient_id?: string;
  appointment_date?: string;
  duration_minutes?: number;
  notes?: string;
  status?: string;
}) {
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", id)
    .select("*, patients(*)")
    .single();

  if (error) {
    console.error("Error updating appointment:", error);
    return { error: error.message };
  }

  // Trigger WhatsApp notification on update if date changed or status is rescheduled
  if (appointment.status === "scheduled") {
    let patient = appointment.patients;
    if (Array.isArray(patient)) patient = patient[0];
    
    if (patient?.phone_number) {
      const phone = standardizePhoneNumber(patient.phone_number);
      const message = WhatsAppTemplates.appointmentConfirmation(
        `${patient.first_name} ${patient.last_name}`,
        appointment.appointment_date
      );
      sendWhatsAppNotification(phone, message, patient.id, "confirmation");
    }
  }

  revalidatePath("/admin/appointments");
  return { success: true, data: appointment };
}
