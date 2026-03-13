"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentRecord } from "@/app/admin/appointments/page";

interface PatientAppointmentsProps {
  appointments: AppointmentRecord[];
}

export function PatientAppointments({ appointments }: PatientAppointmentsProps) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-200" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-outfit uppercase tracking-tight">Aucun rendez-vous</h3>
        <p className="text-sm text-slate-500 mt-1">L&apos;historique des rendez-vous de ce patient est vide.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {appointments.map((apt) => (
          <AppointmentCard key={apt.id} apt={apt} />
        ))}
      </div>
    </div>
  );
}
