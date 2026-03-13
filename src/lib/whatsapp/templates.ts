import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const WhatsAppTemplates = {
  appointmentConfirmation: (patientName: string, date: string | Date) => {
    const dateStr = format(new Date(date), "EEEE d MMMM 'à' HH:mm", { locale: fr });
    return `Bonjour ${patientName}, votre rendez-vous à la Clinique DABIA est confirmé pour le *${dateStr}*. 🦷`;
  },
  
  appointmentReminder: (patientName: string, date: string | Date) => {
    const dateStr = format(new Date(date), "EEEE d MMMM 'à' HH:mm", { locale: fr });
    return `Rappel : Bonjour ${patientName}, nous vous confirmons votre rendez-vous de demain le *${dateStr}* à la Clinique DABIA. À demain ! ✨`;
  },

  debtReminder: (patientName: string, amount: number) => {
    return `Bonjour ${patientName}, nous vous rappelons qu'il reste un solde de *${amount.toLocaleString('fr-FR')} F CFA* à régler pour vos derniers soins à la Clinique DABIA. Merci de passer à la caisse lors de votre prochain passage. 🦷`;
  },

  lostPatientRelance: (patientName: string) => {
    return `Bonjour ${patientName}, cela fait un moment que nous ne vous avons pas vu à la Clinique DABIA. Un contrôle dentaire régulier est essentiel pour votre santé. Souhaitez-vous prendre rendez-vous pour un bilan ? 🦷✨`;
  }
};

export function standardizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    cleaned = `221${cleaned}`;
  }
  return cleaned;
}
