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
import { createAppointment, updateAppointment, deleteAppointment } from "@/app/actions/appointment";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

export function NewAppointmentForm({
  onAppointmentCreated,
  initialData,
  trigger,
  hideTrigger,
  isOpenOverride,
  onOpenChangeOverride,
}: {
  onAppointmentCreated?: () => void;
  initialData?: {
    id?: string;
    patient?: Patient;
    date?: Date;
    time?: string;
    duration?: string;
    notes?: string;
    status?: string;
  };
  trigger?: React.ReactElement;
  hideTrigger?: boolean;
  isOpenOverride?: boolean;
  onOpenChangeOverride?: (open: boolean) => void;
}) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenOverride !== undefined ? isOpenOverride : isOpenInternal;
  const setIsOpen = onOpenChangeOverride !== undefined ? onOpenChangeOverride : setIsOpenInternal;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Form State
  const [date, setDate] = useState<Date | undefined>(initialData?.date);
  const [time, setTime] = useState(initialData?.time || "");
  const [duration, setDuration] = useState(initialData?.duration || "30");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [status, setStatus] = useState(initialData?.status || "scheduled");

  // Patient Selection State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    initialData?.patient || null
  );
  const [isSearching, setIsSearching] = useState(false);

  // Sync state when initialData changes or dialog opens
  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.date) setDate(initialData.date);
      if (initialData.time) setTime(initialData.time);
      if (initialData.duration) setDuration(initialData.duration);
      if (initialData.notes) setNotes(initialData.notes);
      if (initialData.patient) setSelectedPatient(initialData.patient);
      if (initialData.status) setStatus(initialData.status);
    }
  }, [isOpen, initialData]);

  // Dynamically generate time slots
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 15;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }).filter((slot) => {
    if (!date) return false;
    const day = date.getDay();
    if (day === 0) return false;
    const [h, m] = slot.split(":").map(Number);
    if (day >= 1 && day <= 5) {
      if (h < 9 || (h === 18 && m > 0) || h > 18) return false;
      if (h === 18 && m === 0) return false;
      return true;
    }
    if (day === 6) {
      if (h < 9 || (h === 14 && m > 0) || h > 14) return false;
      if (h === 14 && m === 0) return false;
      return true;
    }
    return false;
  });

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
      if (isNumeric) queryStr += `,patient_number.eq.${searchQuery}`;

      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, patient_number")
        .or(queryStr)
        .limit(20);

      if (!error && data) setPatients(data);
      setIsSearching(false);
    };
    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, supabase]);

  const handleSubmit = async () => {
    if (!selectedPatient || !date || !time) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setIsSubmitting(true);
    const [hours, minutes] = time.split(":");
    const appointmentDate = new Date(date);
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const payload = {
      patient_id: selectedPatient.id,
      appointment_date: appointmentDate.toISOString(),
      duration_minutes: parseInt(duration),
      notes,
      status: status,
    };

    try {
      if (initialData?.id) {
        const result = await updateAppointment(initialData.id, payload);
        if (result.error) throw new Error(result.error);
        toast.success("Rendez-vous mis à jour.");
      } else {
        const result = await createAppointment(payload);
        if (result.error) throw new Error(result.error);
        toast.success("Rendez-vous créé.");
      }
      setIsOpen(false);
      if (onAppointmentCreated) onAppointmentCreated();
      router.refresh();
      
      // Clear form only on creation
      if (!initialData?.id) {
        setSelectedPatient(null);
        setSearchQuery("");
        setDate(undefined);
        setTime("");
        setDuration("30");
        setNotes("");
        setStatus("scheduled");
      }
    } catch (error: unknown) {
      toast.error("Une erreur est survenue.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !confirm("Supprimer ce rendez-vous ?")) return;
    setIsSubmitting(true);
    try {
      const result = await deleteAppointment(initialData.id);
      if (result.error) throw new Error(result.error);
      toast.success("Rendez-vous supprimé.");
      setIsOpen(false);
      if (onAppointmentCreated) onAppointmentCreated();
      router.refresh();
    } catch (error) {
       toast.error("Erreur lors de la suppression.");
       console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger
          render={
            trigger || (
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Nouveau Rendez-vous
              </Button>
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-6 text-white relative overflow-hidden">
           <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <CalendarIcon className="w-40 h-40" />
           </div>
           <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight">
              {initialData?.id ? "Modifier le RDV" : "Nouveau Rendez-vous"}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-medium">
              Planifiez ou modifiez les soins de vos patients.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient *</Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 leading-none">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">
                    N° {selectedPatient.patient_number}
                  </span>
                </div>
                {!initialData?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="h-7 text-[10px] font-black uppercase tracking-wider hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    Changer
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative group">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Rechercher par nom ou numéro..."
                  className="pl-10 h-11 border-slate-200 bg-white/50 focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length >= 2 && (
                  <div className="absolute top-12 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-50 max-h-[200px] overflow-auto p-1 divide-y divide-slate-50">
                    {isSearching ? (
                      <div className="p-4 text-xs font-bold text-slate-400 text-center uppercase tracking-widest animate-pulse">Recherche...</div>
                    ) : patients.length === 0 ? (
                      <div className="p-4 text-xs font-bold text-slate-400 text-center uppercase tracking-widest italic">Aucun patient trouvé</div>
                    ) : (
                      patients.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors group/item"
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchQuery("");
                            setPatients([]);
                          }}
                        >
                          <span className="font-bold text-slate-700 group-hover/item:text-primary transition-colors">
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="text-[10px] items-center bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase tracking-tighter">
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 justify-start text-left font-bold border-slate-200 bg-white/50 hover:bg-white transition-all",
                      !date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-300" />
                    {date ? format(date, "PPP", { locale: fr }) : "Choisir date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setTime("");
                    }}
                    initialFocus
                    locale={fr}
                    disabled={(d) => {
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heure *</Label>
              <Select
                value={time}
                onValueChange={(val: string | null) => {
                  if (val) setTime(val);
                }}
                disabled={!date}
              >
                <SelectTrigger className="h-11 border-slate-200 bg-white/50 focus:ring-primary/20">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="h-4 w-4 text-slate-300" />
                    <SelectValue placeholder={date ? "Choisir" : "..."} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[250px] rounded-xl shadow-xl">
                  <SelectGroup>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot} className="font-bold py-2 focus:bg-primary/5 focus:text-primary">
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durée (min)</Label>
                <Input
                  type="number"
                  className="h-11 border-slate-200 bg-white/50 font-bold"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="15"
                  step="15"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</Label>
                <Select value={status} onValueChange={(val: string | null) => val && setStatus(val)}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white/50 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="scheduled" className="font-bold py-2">Planifié</SelectItem>
                    <SelectItem value="completed" className="font-bold py-2 text-emerald-600">Terminé</SelectItem>
                    <SelectItem value="cancelled" className="font-bold py-2 text-rose-600">Annulé</SelectItem>
                    <SelectItem value="no-show" className="font-bold py-2 text-amber-600">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motif / Notes</Label>
            <Textarea
              placeholder="Ex: Douleur dentaire, Détartrage..."
              className="min-h-[100px] border-slate-200 bg-white/50 focus-visible:ring-primary/20 rounded-xl p-4 font-medium"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-3">
          {initialData?.id ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px]"
            >
              Supprimer RDV
            </Button>
          ) : <div />}
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="font-black uppercase tracking-widest text-[10px] text-slate-400"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedPatient || !date || !time}
              className="px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 h-10"
            >
              {isSubmitting ? "Traitement..." : initialData?.id ? "Enregistrer" : "Confirmer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
