"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

export function NewAppointmentForm({
  onAppointmentCreated,
}: {
  onAppointmentCreated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Form State
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");

  // Dynamically generate time slots based on selected date
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 15; // Start at 08:00
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }).filter((slot) => {
    if (!date) return false;
    const day = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

    // Dimanche : fermé
    if (day === 0) return false;

    const [h, m] = slot.split(":").map(Number);

    // Heures d'ouverture: Lun-Ven 09:00 - 18:00 (dernier créneau 17:45)
    if (day >= 1 && day <= 5) {
      if (h < 9 || (h === 18 && m > 0) || h > 18) return false;
      if (h === 18 && m === 0) return false; // Ne pas proposer de RDV à la fermeture exacte
      return true;
    }

    // Samedi: 09:00 - 14:00 (dernier créneau 13:45)
    if (day === 6) {
      if (h < 9 || (h === 14 && m > 0) || h > 14) return false;
      if (h === 14 && m === 0) return false;
      return true;
    }

    return false;
  });

  // Patient Selection State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (searchQuery.length < 2) {
        setPatients([]);
        return;
      }
      setIsSearching(true);

      let queryStr = `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`;
      const isNumeric = /^\d+$/.test(searchQuery);
      if (isNumeric) {
        queryStr += `,patient_number.eq.${searchQuery}`;
      }

      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, patient_number")
        .or(queryStr)
        .limit(20);

      if (!error && data) {
        setPatients(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, supabase]);

  const handleSubmit = async () => {
    if (!selectedPatient || !date || !time) {
      toast.error(
        "Veuillez remplir tous les champs obligatoires (Patient, Date, Heure).",
      );
      return;
    }

    setIsSubmitting(true);

    // Combine Date and Time
    const [hours, minutes] = time.split(":");
    const appointmentDate = new Date(date);
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      const { error } = await supabase.from("appointments").insert({
        patient_id: selectedPatient.id,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: parseInt(duration),
        notes,
        status: "scheduled",
      });

      if (error) throw error;

      toast.success("Rendez-vous créé avec succès.");
      setIsOpen(false);

      // Reset form
      // Reset form
      setSelectedPatient(null);
      setSearchQuery("");
      setDate(undefined);
      setTime("");
      setDuration("30");
      setNotes("");

      if (onAppointmentCreated) {
        onAppointmentCreated();
      }
      router.refresh();
    } catch (error: unknown) {
      toast.error("Erreur lors de la création du rendez-vous.");
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      console.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Rendez-vous
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Planifier un rendez-vous</DialogTitle>
          <DialogDescription>
            Recherchez un patient et définissez la date et l&apos;heure de la
            consultation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Selection */}
          <div className="space-y-2 relative">
            <Label>
              Patient <span className="text-red-500">*</span>
            </Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                <span className="font-medium">
                  {selectedPatient.first_name} {selectedPatient.last_name} (
                  {selectedPatient.patient_number})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                  className="h-6 px-2 text-xs"
                >
                  Changer
                </Button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou N° patient..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery.length >= 2 && (
                  <div className="absolute top-16 w-full bg-white border rounded-md shadow-lg z-10 max-h-[200px] overflow-auto">
                    {isSearching ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Recherche...
                      </div>
                    ) : patients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Aucun patient trouvé.
                      </div>
                    ) : (
                      patients.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-100 cursor-pointer text-sm"
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchQuery("");
                            setPatients([]);
                          }}
                        >
                          <span>
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {p.patient_number}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Selection */}
            <div className="space-y-2 flex flex-col">
              <Label>
                Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger>
                  <div
                    tabIndex={0}
                    role="button"
                    className={cn(
                      "flex w-full items-center justify-start text-left font-normal border rounded-md px-3 py-2 text-sm",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, "PPP", { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setTime(""); // Réinitialiser l'heure si le jour change
                    }}
                    initialFocus
                    locale={fr}
                    disabled={(d) => {
                      // Désactiver les dates passées et le dimanche
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return d < today || d.getDay() === 0;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>
                Heure <span className="text-red-500">*</span>
              </Label>
              <Select
                value={time}
                onValueChange={(val) => {
                  if (val) setTime(val);
                }}
                disabled={!date}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <SelectValue
                      placeholder={
                        date ? "Choisir une heure" : "Choisir une date d'abord"
                      }
                    />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup className="max-h-[200px]">
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Durée estimée (minutes)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="15"
              step="15"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Motif / Notes</Label>
            <Textarea
              placeholder="Ex: Première consultation, Détartrage..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPatient || !date || !time}
          >
            {isSubmitting ? "Création..." : "Confirmer le RDV"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
