"use client";

import React, { useState } from "react";
import {
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  UserMinus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getPatientColor } from "@/lib/utils/colors";
import {
  updateAppointmentStatus,
  deleteAppointment,
} from "@/app/actions/appointment";
import { toast } from "sonner";
import { AppointmentRecord } from "@/app/admin/appointments/page";
import { NewAppointmentForm } from "@/components/NewAppointmentForm";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppointmentCardProps {
  apt: AppointmentRecord;
}

export function AppointmentCard({ apt }: AppointmentCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const date = new Date(apt.appointment_date);
  const patientData = apt.patients;
  const patient = Array.isArray(patientData) ? patientData[0] : patientData;
  const isToday = new Date().toDateString() === date.toDateString();
  const patientColor = getPatientColor(apt.patient_id, apt.id);

  const handleStatusUpdate = async (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      const result = await updateAppointmentStatus(apt.id, newStatus);
      if (result.success) {
        toast.success(
          `Statut mis à jour : ${newStatus === "completed" ? "Terminé" : newStatus === "cancelled" ? "Annulé" : "Absent"}`,
        );
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setIsUpdating(true);
    try {
      const result = await deleteAppointment(apt.id);
      if (result.success) {
        toast.success("Rendez-vous supprimé");
        setIsDeleteModalOpen(false);
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setIsEditOpen(true)}
        className={cn(
          "group relative p-5 rounded-[24px] border transition-all duration-300 bg-white cursor-pointer",
          isToday
            ? "border-primary/10 shadow-lg shadow-primary/5 ring-1 ring-primary/5"
            : "border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
          isUpdating && "opacity-50 pointer-events-none",
        )}
      >
        {/* Color Side Indicator */}
        <div
          className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full shadow-sm"
          style={{ backgroundColor: patientColor }}
        />

        <div className="pl-2">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <span className="text-base font-black text-slate-900 font-outfit tracking-tight">
                {format(date, "HH:mm")}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider italic">
                  {apt.duration_minutes} min
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm",
                  apt.status === "scheduled" &&
                    "bg-blue-50/50 text-blue-600 border-blue-100",
                  apt.status === "completed" &&
                    "bg-emerald-50/50 text-emerald-600 border-emerald-100",
                  apt.status === "cancelled" &&
                    "bg-rose-50/50 text-rose-600 border-rose-100",
                  apt.status === "no-show" &&
                    "bg-amber-50/50 text-amber-600 border-amber-100",
                )}
              >
                {apt.status === "scheduled"
                  ? "Prévu"
                  : apt.status === "completed"
                    ? "Terminé"
                    : apt.status === "cancelled"
                      ? "Annulé"
                      : "Absent"}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteModalOpen(true);
                }}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                title="Supprimer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <User className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <Link
                  href={`/admin/patients/${patient?.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[13px] font-black text-slate-800 hover:text-primary transition-colors line-clamp-1 font-outfit uppercase tracking-tight"
                >
                  {patient
                    ? `${patient.first_name} ${patient.last_name}`
                    : "Patient inconnu"}
                </Link>
                {patient?.phone_number && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-2.5 h-2.5 text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                      {patient.phone_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div
            className="mt-4 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handleStatusUpdate(e, "completed")}
              disabled={apt.status === "completed"}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                apt.status === "completed"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 hover:border-emerald-500",
              )}
              title="Terminé"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Terminé</span>
            </button>
            <button
              onClick={(e) => handleStatusUpdate(e, "cancelled")}
              disabled={apt.status === "cancelled"}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                apt.status === "cancelled"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 hover:border-rose-500",
              )}
              title="Annulé"
            >
              <XCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Annulé</span>
            </button>
            <button
              onClick={(e) => handleStatusUpdate(e, "no-show")}
              disabled={apt.status === "no-show"}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                apt.status === "no-show"
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                  : "bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-100 hover:border-amber-100 shadow-none ring-0",
              )}
              title="Absent"
            >
              <UserMinus className="w-3 h-3" />
              <span className="hidden sm:inline">Absent</span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                Date
              </span>
              <span className="text-[10px] font-black text-slate-500 capitalize">
                {format(date, "EEEE d MMMM", { locale: fr })}
              </span>
            </div>
            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest animate-pulse group-hover:text-primary transition-colors">
              Cliquer pour éditer
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Deletion */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-rose-500 p-6 text-white relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <Trash2 className="w-40 h-40" />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight">
                Supprimer le rendez-vous
              </DialogTitle>
              <DialogDescription className="text-white/70 font-medium">
                Cette action est irréversible. Voulez-vous continuer ?
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 font-outfit uppercase tracking-tight">
                  {patient
                    ? `${patient.first_name} ${patient.last_name}`
                    : "Patient inconnu"}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {format(date, "EEEE d MMMM", { locale: fr })} à{" "}
                  {format(date, "HH:mm")}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 font-bold uppercase tracking-wider text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isUpdating}
              variant="destructive"
              className="text-white flex-1 font-bold uppercase tracking-wider text-xs bg-rose-600 hover:bg-rose-700 shadow-md h-11"
            >
              {isUpdating ? "Suppression..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewAppointmentForm
        isOpenOverride={isEditOpen}
        onOpenChangeOverride={setIsEditOpen}
        hideTrigger
        initialData={{
          id: apt.id,
          patient: patient || undefined,
          date: date,
          time: format(date, "HH:mm"),
          duration: String(apt.duration_minutes),
          notes: apt.notes,
          status: apt.status,
        }}
      />
    </>
  );
}
