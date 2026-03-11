"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewAppointmentModal({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");

  const router = useRouter();
  const supabase = createClient();

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const notes = formData.get("notes") as string;

    if (!date) {
      setError("Veuillez sélectionner une date.");
      setLoading(false);
      return;
    }

    if (!time) {
      setError("Veuillez sélectionner une heure.");
      setLoading(false);
      return;
    }

    // Combiner la date et l'heure
    const [hours, minutes] = time.split(":");
    const appointmentDate = new Date(date);
    appointmentDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    try {
      const { error: insertError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          appointment_date: appointmentDate.toISOString(),
          duration_minutes: parseInt(duration, 10),
          notes: notes || null,
          status: "scheduled",
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setOpen(false);

      // Reset form state
      setDate(undefined);
      setDuration("30");

      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue lors de la prise de rendez-vous.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nouveau Rendez-vous</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau Rendez-vous</DialogTitle>
            <DialogDescription>
              Planifiez une nouvelle consultation pour ce patient.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Date *</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP", { locale: fr })
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  }
                />
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Heure *</Label>
              <div className="col-span-3">
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
                          date
                            ? "Choisir une heure"
                            : "Choisir une date d'abord"
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
                <input type="hidden" name="time" value={time} />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Durée *</Label>
              <div className="col-span-3">
                <Select
                  value={duration}
                  onValueChange={(val) => {
                    if (val) setDuration(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="90">1 heure 30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right mt-2">
                Motif
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Ex: Détartrage, consultation de suivi..."
                className="col-span-3 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
