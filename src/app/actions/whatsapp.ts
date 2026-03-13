"use server";

import { WhatsAppTemplates, standardizePhoneNumber } from "@/lib/whatsapp/templates";

import { whatsappManager } from "@/lib/whatsapp/manager";
import { revalidatePath } from "next/cache";

const BRIDGE_URL = process.env.NEXT_PUBLIC_WA_BRIDGE_URL;

async function callBridge(endpoint: string, body?: any) {
  if (!BRIDGE_URL) return null;
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function disconnectWhatsApp() {
  try {
    if (BRIDGE_URL) {
      await callBridge("/logout");
    } else {
      await whatsappManager.logout();
    }
    revalidatePath("/admin/settings/whatsapp");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to disconnect WhatsApp:", error);
    return { success: false, error: message };
  }
}

export async function sendTestMessage(to: string, message: string) {
  try {
    if (BRIDGE_URL) {
      await callBridge("/send", { to, text: message });
    } else {
      await whatsappManager.init();
      await whatsappManager.sendMessage(to, message);
    }
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send test message:", error);
    return { success: false, error: message };
  }
}

export async function getWhatsAppStatus() {
  if (BRIDGE_URL) {
    try {
      const res = await fetch(`${BRIDGE_URL}/status`);
      const data = await res.json();
      return data.status;
    } catch {
      return "error";
    }
  }
  return whatsappManager.getStatus();
}

import { createClient } from "@/lib/supabase/server";

export async function sendDebtReminder(patientId: string, amount: number) {
  try {
    const supabase = await createClient();
    const { data: patient, error } = await supabase
      .from("patients")
      .select("first_name, last_name, phone_number")
      .eq("id", patientId)
      .single();

    if (error || !patient?.phone_number) {
      return { success: false, error: "Patient introuvable ou numéro manquant" };
    }

    // Standardize phone for Senegal if needed
    let phone = patient.phone_number.replace(/\D/g, "");
    if (phone.length === 9) phone = `221${phone}`;

    const message = `Bonjour ${patient.first_name} ${patient.last_name}, nous vous rappelons qu'il reste un solde de ${amount.toLocaleString('fr-FR')} F CFA à régler pour vos derniers soins à la Clinique DABIA. Merci de passer à la caisse lors de votre prochain passage. 🦷`;

    if (BRIDGE_URL) {
      await callBridge("/send", { to: phone, text: message });
    } else {
      await whatsappManager.init();
      await whatsappManager.sendMessage(phone, message);
    }
    
    // Log the success
    await logWhatsAppMessage({
      patient_id: patientId,
      category: "debt_relance",
      recipient_phone: phone,
      message_content: message,
      status: "sent"
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send debt reminder:", error);
    
    // Log the failure if we have the data
    if (patientId) {
      await logWhatsAppMessage({
        patient_id: patientId,
        category: "debt_relance",
        recipient_phone: "Unknown", // Would be better to pass phone here if possible
        message_content: "Debt Reminder",
        status: "failed",
        error_message: message
      });
    }

    return { success: false, error: message };
  }
}

export async function logWhatsAppMessage(data: {
  patient_id?: string;
  category: "confirmation" | "reminder" | "debt_relance";
  recipient_phone: string;
  message_content: string;
  status: "sent" | "failed";
  error_message?: string;
}) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_logs")
      .insert(data);
    
    if (error) throw error;
  } catch (err) {
    console.error("Error logging WhatsApp message:", err);
  }
}

export async function getWhatsAppLogs() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_logs")
      .select(`
        *,
        patients (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, logs: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function deleteWhatsAppLog(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/admin/settings/whatsapp");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
export async function sendWhatsAppNotification(to: string, message: string, patientId?: string, category: "confirmation" | "reminder" | "debt_relance" = "confirmation") {
  try {
    if (BRIDGE_URL) {
      await callBridge("/send", { to, text: message });
    } else {
      await whatsappManager.init();
      await whatsappManager.sendMessage(to, message);
    }
    
    await logWhatsAppMessage({
      patient_id: patientId,
      category,
      recipient_phone: to,
      message_content: message,
      status: "sent"
    });
    
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to send WhatsApp (${category}):`, error);
    
    if (patientId) {
      await logWhatsAppMessage({
        patient_id: patientId,
        category,
        recipient_phone: to,
        message_content: message,
        status: "failed",
        error_message: errorMsg
      });
    }
    
    return { success: false, error: errorMsg };
  }
}
export async function sendBulkWhatsApp(patientIds: string[], templateCategory: "lostPatientRelance" | "debtReminder") {
  const supabase = await createClient();
  const results = { sent: 0, failed: 0 };

  // Fetch all recipients at once
  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone_number")
    .in("id", patientIds);

  if (error || !patients) {
    return { success: false, error: "Impossible de récupérer la liste des patients" };
  }

  for (const patient of patients) {
    if (!patient.phone_number) {
      results.failed++;
      continue;
    }

    const phone = standardizePhoneNumber(patient.phone_number);
    let message = "";
    
    if (templateCategory === "lostPatientRelance") {
      message = WhatsAppTemplates.lostPatientRelance(`${patient.first_name} ${patient.last_name}`);
    }
    // Add other categories here if needed

    try {
      // Add a small delay between sends to avoid spam flags (1-3 seconds)
      if (results.sent > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      }

      await sendWhatsAppNotification(phone, message, patient.id, "reminder");
      results.sent++;
    } catch (err) {
      console.error(`Bulk send failed for ${patient.id}:`, err);
      results.failed++;
    }
  }

  return { success: true, results };
}

export async function sendInvoiceWhatsApp(
  patientPhone: string, 
  pdfBase64: string, 
  fileName: string, 
  patientId: string
) {
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    
    if (BRIDGE_URL) {
      await callBridge("/send-document", { 
        to: patientPhone, 
        pdfBase64, 
        fileName, 
        caption: "Votre facture de la Clinique DABIA 🦷" 
      });
    } else {
      await whatsappManager.sendDocument(
        patientPhone, 
        buffer, 
        fileName, 
        "Votre facture de la Clinique DABIA 🦷"
      );
    }

    await logWhatsAppMessage({
      patient_id: patientId,
      category: "confirmation", // Using confirmation as category for now
      recipient_phone: patientPhone,
      message_content: `Facture envoyée: ${fileName}`,
      status: "sent"
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send invoice via WhatsApp:", error);
    
    if (patientId) {
      await logWhatsAppMessage({
        patient_id: patientId,
        category: "confirmation",
        recipient_phone: patientPhone,
        message_content: `Échec envoi facture: ${fileName}`,
        status: "failed",
        error_message: message
      });
    }

    return { success: false, error: message };
  }
}

export async function initWhatsApp() {
  try {
    await whatsappManager.init(true);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to init WhatsApp:", error);
    return { success: false, error: message };
  }
}

export async function sendBroadcastWhatsApp(patientIds: string[], messageTemplate: string) {
  const supabase = await createClient();
  const results = { sent: 0, failed: 0 };

  // Fetch all recipients
  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone_number")
    .in("id", patientIds);

  if (error || !patients) {
    return { success: false, error: "Impossible de récupérer la liste des patients" };
  }

  for (const patient of patients) {
    if (!patient.phone_number) {
      results.failed++;
      continue;
    }

    const phone = standardizePhoneNumber(patient.phone_number);
    
    // Replace placeholders
    const message = messageTemplate
      .replace(/\{prenom\}/g, patient.first_name)
      .replace(/\{nom\}/g, patient.last_name);

    try {
      // Add a small delay between sends to avoid spam flags (2-4 seconds for broadcast)
      if (results.sent > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      }

      await sendWhatsAppNotification(phone, message, patient.id, "reminder");
      results.sent++;
    } catch (err) {
      console.error(`Broadcast failed for ${patient.id}:`, err);
      results.failed++;
    }
  }

  return { success: true, results };
}
