"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { formatSenegalPhone } from "@/lib/utils/phone";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewPatientModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phoneInput = formData.get("phone") as string;
    const phone = formatSenegalPhone(phoneInput);
    const email = formData.get("email") as string;
    const dob = date ? format(date, "yyyy-MM-dd") : null;

    try {
      // 1. Get the max patient number
      const { data: lastPatient, error: maxError } = await supabase
        .from("patients")
        .select("patient_number")
        .order("patient_number", { ascending: false })
        .limit(1)
        .single();

      if (maxError && maxError.code !== "PGRST116") {
        throw new Error("Impossible de récupérer le dernier numéro patient.");
      }

      let newPatientNumber = 1;

      if (lastPatient && lastPatient.patient_number) {
        const lastNum = parseInt(lastPatient.patient_number, 10);
        if (!isNaN(lastNum)) {
          newPatientNumber = lastNum + 1;
        }
      }

      // Convert back to string as patient_number is a TEXT column
      const patientNumberStr = newPatientNumber.toString();

      // 2. Insert new patient
      const { error: insertError } = await supabase.from("patients").insert({
        patient_number: patientNumberStr,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone || null,
        email: email || null,
        date_of_birth: dob || null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Patient
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un patient</DialogTitle>
            <DialogDescription>
              Le numéro de patient sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                Prénom *
              </Label>
              <Input
                id="firstName"
                name="firstName"
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Nom *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Téléphone
              </Label>
              <Input id="phone" name="phone" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Naissance</Label>
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
                        format(date, "P", { locale: fr })
                      ) : (
                        <span>Sélectionner</span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
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
              {loading ? "Création..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
