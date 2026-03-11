"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, FilePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Medication {
  name: string;
  dosage: string;
  duration: string;
}

interface PrescriptionModalProps {
  patientId: string;
}

export function PrescriptionModal({ patientId }: PrescriptionModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("Dr. DABIA");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", duration: "" },
  ]);

  const supabase = createClient();
  const router = useRouter();

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", duration: "" }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSave = async () => {
    // Basic validation
    if (medications.some(m => !m.name)) {
      toast.error("Veuillez renseigner le nom de tous les médicaments");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("prescriptions").insert({
        patient_id: patientId,
        doctor_name: doctorName,
        medications,
        notes,
      });

      if (error) throw error;

      toast.success("Ordonnance enregistrée avec succès");
      setOpen(false);
      // Reset form
      setMedications([{ name: "", dosage: "", duration: "" }]);
      setNotes("");
      router.refresh();
    } catch (err: unknown) {
      const error = err as any;
      console.error("Error saving prescription full details:", error);
      const errorMessage = error.message || (typeof error === 'string' ? error : "Une erreur inconnue est survenue");
      toast.error("Erreur lors de l'enregistrement: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" /> Nouvelle Ordonnance
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Ordonnance Médicale</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor_name">Praticien</Label>
              <Input
                id="doctor_name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Ex: Dr. DABIA"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-bold text-primary">Médicaments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                className="gap-1 h-8"
              >
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>

            {medications.map((med, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0 last:pb-0">
                <div className="col-span-12 md:col-span-5 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Nom du médicament</Label>
                  <Input
                    placeholder="Ex: Amoxicilline 1g"
                    value={med.name}
                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Dosage/Fréquence</Label>
                  <Input
                    placeholder="Ex: 1 mat / 1 soir"
                    value={med.dosage}
                    onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Durée</Label>
                  <Input
                    placeholder="Ex: 7 jours"
                    value={med.duration}
                    onChange={(e) => updateMedication(index, "duration", e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-center pb-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMedication(index)}
                    className="text-destructive hover:text-white hover:bg-destructive h-9 w-9"
                    disabled={medications.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Conseils & Notes</Label>
            <Textarea
              id="notes"
              placeholder="Conseils supplémentaires pour le patient..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer l&apos;ordonnance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
