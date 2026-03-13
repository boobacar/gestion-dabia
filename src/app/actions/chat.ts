"use server";

import { createClient } from "@/lib/supabase/server";
import { whatsappManager } from "@/lib/whatsapp/manager";
import { revalidatePath } from "next/cache";

export async function getChats() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .select(`
        *,
        patient:patients(id, first_name, last_name, phone_number)
      `)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("[ChatAction] getChats Error:", error);
      throw new Error(`Erreur Base de Données: ${error.message} (Code: ${error.code})`);
    }
    return data;
  } catch (err: any) {
    console.error("[ChatAction] Fatal error in getChats:", err);
    throw err;
  }
}

export async function getChatMessages(chatId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("[ChatAction] getChatMessages Error:", error);
      throw new Error(`Erreur Base de Données: ${error.message} (Code: ${error.code})`);
    }
    return data;
  } catch (err: any) {
    console.error("[ChatAction] Fatal error in getChatMessages:", err);
    throw err;
  }
}

export async function sendWhatsAppMessage(chatId: string, remoteJid: string, content: string) {
  try {
    // 1. Send via Baileys
    await whatsappManager.sendMessage(remoteJid, content);

    // 2. Persistance is handled by Baileys listener in WhatsAppManager
    // But we might want to trigger a local UI update or revalidation
    revalidatePath("/admin/messages");
    
    return { success: true };
  } catch (error: any) {
    console.error("Send message error:", error);
    return { success: false, error: error.message };
  }
}

export async function markChatAsRead(chatId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_chats")
      .update({ unread_count: 0 })
      .eq("id", chatId);

    if (error) {
      console.error("[ChatAction] markChatAsRead Error:", error);
      throw new Error(`Erreur Base de Données: ${error.message} (Code: ${error.code})`);
    }
    revalidatePath("/admin/messages");
  } catch (err: any) {
    console.error("[ChatAction] Fatal error in markChatAsRead:", err);
    throw err;
  }
}

export async function searchPatients(query: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, phone_number")
      .not("phone_number", "is", null)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[ChatAction] searchPatients Error:", err);
    return [];
  }
}

export async function createOrGetChat(patientId: string) {
  try {
    const supabase = await createClient();
    
    // 1. Get patient phone
    const { data: patient, error: pError } = await supabase
      .from("patients")
      .select("phone_number")
      .eq("id", patientId)
      .single();

    if (pError || !patient.phone_number) throw new Error("Patient sans numéro de téléphone");

    const cleanNumber = patient.phone_number.replace(/\D/g, "");
    const remoteJid = `${cleanNumber}@s.whatsapp.net`;

    // 2. Find or Create Chat
    let { data: chat, error: cError } = await supabase
      .from("whatsapp_chats")
      .select("id")
      .eq("remote_jid", remoteJid)
      .single();

    if (cError && cError.code !== "PGRST116") throw cError;

    if (!chat) {
      const { data: newChat, error: createError } = await supabase
        .from("whatsapp_chats")
        .insert({
          remote_jid: remoteJid,
          patient_id: patientId,
          last_message: "Nouvelle conversation",
          last_message_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (createError) throw createError;
      chat = newChat;
    }

    revalidatePath("/admin/messages");
    return { success: true, chatId: chat.id };
  } catch (err: any) {
    console.error("[ChatAction] createOrGetChat Error:", err);
    return { success: false, error: err.message };
  }
}
