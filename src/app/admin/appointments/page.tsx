import { createClient } from "@/lib/supabase/server";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { NewAppointmentForm } from "@/components/NewAppointmentForm";
import { CalendarView } from "@/components/CalendarView";

export type AppointmentRecord = {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    phone_number?: string;
  } | {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    phone_number?: string;
  }[] | null;
};

import { AppointmentCard } from "@/components/AppointmentCard";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  // Date calculations for range
  const today = new Date();
  const startOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  ).toISOString();
  const endOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    0,
  ).toISOString();

  // Parallel Data Fetching
  const [
    { data: appointments, error },
    { data: calendarAppointments }
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        appointment_date,
        duration_minutes,
        status,
        notes,
        patients (
           id,
           first_name,
           last_name,
           patient_number,
           phone_number
        )
      `)
      .gte("appointment_date", new Date().toISOString())
      .order("appointment_date", { ascending: true }),
    supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        appointment_date,
        duration_minutes,
        status,
        notes,
        patients (id, first_name, last_name, patient_number, phone_number)
      `)
      .gte("appointment_date", startOfMonth)
      .lte("appointment_date", endOfMonth)
      .order("appointment_date", { ascending: true })
  ]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <CalendarIcon className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight font-outfit uppercase">
            Agenda <span className="text-primary">&</span> RDV
          </h1>
          <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Gestion en temps réel du planning clinique
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <NewAppointmentForm />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Calendar View */}
        <div className="md:col-span-8 lg:col-span-9 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[850px] flex flex-col">
          <div className="flex items-center gap-3 mb-6 px-2">
             <div className="p-2 bg-primary/10 rounded-xl">
               <CalendarIcon className="w-5 h-5 text-primary" />
             </div>
             <h2 className="font-black font-outfit uppercase tracking-wider text-slate-800">Calendrier Interactif</h2>
          </div>
          <div className="flex-grow">
            <CalendarView
              initialAppointments={
                (calendarAppointments as unknown as AppointmentRecord[]) || []
              }
            />
          </div>
        </div>

        {/* Upcoming List */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col max-h-[850px]">
            <div className="flex flex-col mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-black font-outfit uppercase tracking-wider text-slate-800">Prochains RDV</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aujourd&apos;hui & À venir</p>
            </div>
            
            <div className="grow overflow-y-auto pr-2 space-y-4 scrollbar-hide -mr-2">
              {error ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center">
                  Erreur de chargement des données.
                </div>
              ) : !appointments || appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <CalendarIcon className="w-6 h-6 text-slate-200" />
                   </div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun RDV</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 p-1">
                  {appointments.map((apt) => (
                    <AppointmentCard key={apt.id} apt={apt} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
