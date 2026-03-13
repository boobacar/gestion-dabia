import { whatsappManager } from "@/lib/whatsapp/manager";
import { createClient } from "@/lib/supabase/server";
import { logWhatsAppMessage } from "@/app/actions/whatsapp";
import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export async function GET(request: Request) {
  // 1. Basic Security
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    // 2. Define Tomorrow's Date Range
    const tomorrow = addDays(new Date(), 1);
    const start = startOfDay(tomorrow).toISOString();
    const end = endOfDay(tomorrow).toISOString();

    console.log(`[Cron] Fetching appointments between ${start} and ${end}`);

    // 3. Fetch Appointments for Tomorrow
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*, patients(*)")
      .eq("status", "scheduled")
      .gte("appointment_date", start)
      .lte("appointment_date", end);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: "No appointments for tomorrow" });
    }

    // 4. Initialize WhatsApp
    await whatsappManager.init();

    // 5. Send Reminders
    const results = [];
    for (const appt of appointments) {
      let patient = appt.patients;
      if (Array.isArray(patient)) patient = patient[0];

      if (patient?.phone_number) {
        let phone = patient.phone_number.replace(/\D/g, "");
        if (phone.length === 9) phone = `221${phone}`;

        const timeStr = format(new Date(appt.appointment_date), "HH:mm");
        const message = `Rappel : Bonjour ${patient.first_name}, vous avez rendez-vous demain à ${timeStr} à la Clinique DABIA. Merci de nous prévenir en cas de retard ou d'annulation. 🦷`;

        try {
          await whatsappManager.sendMessage(phone, message);
          results.push({ patient: patient.last_name, status: "sent" });
          
          await logWhatsAppMessage({
            patient_id: patient.id,
            category: "reminder",
            recipient_phone: phone,
            message_content: message,
            status: "sent"
          });
        } catch (err) {
          results.push({ patient: patient.last_name, status: "failed", error: err });
          
          await logWhatsAppMessage({
            patient_id: patient.id,
            category: "reminder",
            recipient_phone: phone,
            message_content: message,
            status: "failed",
            error_message: String(err)
          });
        }
      }
    }

    return NextResponse.json({ 
      processed: appointments.length, 
      results 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Cron] Reminder error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
