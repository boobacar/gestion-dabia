"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Medication {
  name: string;
  dosage: string;
  duration: string;
}

interface PrescriptionRecord {
  id: string;
  patient_id: string;
  doctor_name: string;
  medications: Medication[];
  notes?: string;
  created_at: string;
}

interface PrescriptionPrintModalProps {
  prescription: PrescriptionRecord;
  patientName: string;
  patientAge: string | number;
}

export function PrescriptionPrintModal({
  prescription,
  patientName,
  patientAge,
}: PrescriptionPrintModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [clinicSettings, setClinicSettings] = React.useState<{
    name?: string;
    specialty?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null>(null);

  const fetchClinicSettings = React.useCallback(async () => {
    try {
      const { data } = await supabase
        .from("clinic_settings")
        .select("*")
        .single();
      if (data) setClinicSettings(data);
    } catch (err) {
      console.error("Error fetching clinic settings:", err);
    }
  }, [supabase]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Ordonnance_${patientName}_${format(new Date(prescription.created_at), "ddMMyyyy")}`,
  });

  return (
    <Dialog onOpenChange={(open) => open && fetchClinicSettings()}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        }
      />
      <DialogContent className="max-w-[95vw] sm:max-w-[250mm] max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0">
          <DialogTitle>Aperçu de l&apos;Ordonnance</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4 px-4 sm:px-0 no-print">
          <Button onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>

        {/* Outer container to center and provide background */}
        <div className="bg-slate-200 p-2 sm:p-8 rounded-lg flex justify-center shadow-inner overflow-x-auto min-h-screen">
          {/* Prescription Document */}
          <div
            ref={componentRef}
            className="bg-white p-6 sm:p-12 text-slate-900 font-serif shadow-xl flex flex-col"
            style={{ 
              width: "21cm", 
              minHeight: "29.7cm",
              boxSizing: "border-box"
            }}
          >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-primary uppercase tracking-wider">
                {clinicSettings?.name || "CLINIQUE DENTAIRE DABIA"}
              </h1>
              <p className="text-sm font-medium italic text-slate-600">
                {clinicSettings?.specialty || "Chirurgie Dentaire & Implantologie"}
              </p>
            </div>
            <div className="text-right text-xs space-y-1 text-slate-500">
              <p>{clinicSettings?.address || "Adresse de la clinique"}</p>
              <p>Tél: {clinicSettings?.phone || "77 000 00 00"}</p>
              {clinicSettings?.email && <p>{clinicSettings.email}</p>}
            </div>
          </div>

          {/* Doctor & Date */}
          <div className="flex justify-between mb-12">
            <div className="space-y-1">
              <p className="font-bold border-b border-slate-300 inline-block pb-1 mb-2">
                PRATICIEN
              </p>
              <p className="text-lg">{prescription.doctor_name || "Dr. DABIA"}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold border-b border-slate-300 inline-block pb-1 mb-2">
                DATE
              </p>
              <p>Le {format(new Date(prescription.created_at), "dd MMMM yyyy", { locale: fr })}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-slate-50 p-4 rounded-md mb-12 border border-slate-200">
            <p className="text-sm text-slate-500 mb-1 uppercase font-bold tracking-tighter">
              Ordonnance pour
            </p>
            <p className="text-xl font-bold">
              M/Mme {patientName}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {patientAge !== "N/A" ? `Âge: ${patientAge} ans` : ""}
            </p>
          </div>

          {/* Prescription Content */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-center mb-8 italic underline decoration-1 underline-offset-8">
                Ordonnance
              </h2>
            </div>

            <div className="space-y-8 mt-10 ml-4">
              {prescription.medications && prescription.medications.length > 0 ? (
                prescription.medications.map((med, idx) => (
                  <div key={idx} className="relative pl-6">
                    <span className="absolute left-0 top-0 text-xl font-bold text-slate-300">
                      {idx + 1}.
                    </span>
                    <p className="text-xl font-bold mb-1">{med.name}</p>
                    <p className="text-lg text-slate-700 italic ml-2">
                      - {med.dosage}
                    </p>
                    <p className="text-md text-slate-500 ml-2">
                      Pendant {med.duration}
                    </p>
                  </div>
                ))
              ) : (
                <p className="italic text-slate-400 text-center">Aucun médicament prescrit.</p>
              )}
            </div>

            {prescription.notes && (
              <div className="mt-16 pt-8 border-t border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Notes conseils :</p>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed italic">
                  {prescription.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer Signature */}
          <div className="mt-20 flex justify-end pr-10">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-12">Signature & Cachet</p>
              <div className="h-24 w-48 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-200">
                Espace cachet
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 text-center text-[10px] text-slate-400 border-t border-slate-100">
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
}
