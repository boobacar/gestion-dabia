"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PrescriptionPrintModal } from "./PrescriptionPrintModal";
import { PrescriptionModal } from "./PrescriptionModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

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

interface PatientPrescriptionsProps {
  patientId: string;
  patientName: string;
  patientAge: string | number;
  initialPrescriptions: PrescriptionRecord[];
}

export function PatientPrescriptions({
  patientId,
  patientName,
  patientAge,
  initialPrescriptions,
}: PatientPrescriptionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ordonnances Médicales</h2>
          <p className="text-muted-foreground">Historique des prescriptions pour ce patient.</p>
        </div>
        <PrescriptionModal patientId={patientId} />
      </div>

      <Card>
        <CardHeader className="pb-3 text-primary bg-primary/5 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle>Historique</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Praticien</TableHead>
                <TableHead>Médicaments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialPrescriptions.length > 0 ? (
                initialPrescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {format(new Date(p.created_at), "dd MMMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>Dr. {p.doctor_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.medications.slice(0, 2).map((m, idx) => (
                          <span key={idx} className="bg-slate-100 text-[10px] px-2 py-0.5 rounded border border-slate-200">
                            {m.name}
                          </span>
                        ))}
                        {p.medications.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{p.medications.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <PrescriptionPrintModal 
                        prescription={p} 
                        patientName={patientName}
                        patientAge={patientAge}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucune ordonnance enregistrée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
