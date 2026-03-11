import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Clock, User } from "lucide-react";
import Link from "next/link";
import { NewAppointmentForm } from "@/components/NewAppointmentForm";
import { CalendarView } from "@/components/CalendarView";

export type AppointmentRecord = {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  };
};

export default async function AppointmentsPage() {
  const supabase = await createClient();

  // Fetch upcoming appointments
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      appointment_date,
      duration_minutes,
      status,
      notes,
      patients (
         id,
         first_name,
         last_name,
         phone_number
      )
    `,
    )
    .gte("appointment_date", new Date().toISOString())
    .order("appointment_date", { ascending: true });

  // And let's fetch a wider range for the CalendarView specifically, spanning the whole month
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

  const { data: calendarAppointments } = await supabase
    .from("appointments")
    .select(
      `
      id,
      patient_id,
      appointment_date,
      duration_minutes,
      status,
      notes,
      patients (id, first_name, last_name, phone_number)
    `,
    )
    .gte("appointment_date", startOfMonth)
    .lte("appointment_date", endOfMonth)
    .order("appointment_date", { ascending: true });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Agenda & Rendez-vous
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez le planning de la clinique et les rendez-vous patients.
          </p>
        </div>
        <div className="space-x-4">
          <NewAppointmentForm />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Calendar View Placeholder */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Vue Calendrier</CardTitle>
            </CardHeader>
            <CardContent className="h-[700px] p-2 sm:p-6 pt-0">
              <CalendarView
                initialAppointments={
                  (calendarAppointments as unknown as AppointmentRecord[]) || []
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Upcoming List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prochains Rendez-vous</CardTitle>
              <CardDescription>Aujourd&apos;hui et à venir</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-red-500">
                  Erreur de chargement. Vérifiez RLS Supabase.
                </p>
              ) : !appointments || appointments.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Aucun rendez-vous prévu.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {appointments.map((apt: any) => {
                    const date = new Date(apt.appointment_date);
                    const patient = apt.patients;
                    return (
                      <div
                        key={apt.id}
                        className="flex flex-col p-3 border rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            {date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-100 text-blue-700">
                            {apt.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {patient
                            ? `${patient.first_name} ${patient.last_name}`
                            : "Patient inconnu"}
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{date.toLocaleDateString()}</span>
                          <span>{apt.duration_minutes} min</span>
                        </div>
                        {patient && (
                          <div className="mt-3">
                            <Link
                              href={`/admin/patients/${patient.id}`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                                className: "w-full text-xs h-7",
                              })}
                            >
                              Ouvrir Dossier
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
