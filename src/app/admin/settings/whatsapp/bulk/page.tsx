"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Send, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getInactivePatients } from "@/app/actions/patient";
import { sendBulkWhatsApp } from "@/app/actions/whatsapp";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  created_at: string;
}

export default function BulkRelancePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInactivePatients();
      if (res.success && res.patients) {
        setPatients(res.patients);
      } else {
        toast.error("Erreur lors de la récupération des patients");
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelectAll = () => {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkSend = async () => {
    if (selectedIds.size === 0) return toast.error("Veuillez sélectionner au moins un patient");

    setIsSending(true);
    setProgress(10); // Start progress
    
    try {
      const res = await sendBulkWhatsApp(Array.from(selectedIds), "lostPatientRelance");
      if (res.success && res.results) {
        setProgress(100);
        toast.success(`${res.results.sent} messages envoyés avec succès !`);
        if (res.results.failed > 0) {
          toast.warning(`${res.results.failed} échecs.`);
        }
        setSelectedIds(new Set());
        fetchData(); // Refresh list
      } else {
        toast.error(res.error || "Erreur lors de l'envoi groupé");
      }
    } catch (error: unknown) {
      console.error("Bulk send failed:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings/whatsapp">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-outfit uppercase">
            Relance <span className="text-primary italic">Groupée</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Identifiez et recontactez les patients inactifs depuis plus de 6 mois.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-900 p-8 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-white font-outfit uppercase tracking-tight">
                    Patients &quot;Perdus de vue&quot;
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-medium">
                    {patients.length} patients n&apos;ont pas eu de rendez-vous récemment.
                  </CardDescription>
                </div>
              </div>
              
              {selectedIds.size > 0 && (
                <Button 
                  onClick={handleBulkSend}
                  disabled={isSending}
                  className="bg-primary text-white font-black uppercase tracking-widest text-xs px-8 h-12 rounded-xl shadow-lg shadow-primary/20 animate-in zoom-in-95"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Relancer {selectedIds.size} sélectionné(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isSending && (
              <div className="px-8 py-4 bg-primary/5 border-b border-primary/10 flex items-center gap-4">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Envoi en cours...</p>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-6 text-left w-12">
                      <Checkbox 
                        checked={selectedIds.size === patients.length && patients.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </th>
                    <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                    <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</th>
                    <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Statut Relance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Analyse de la base de données...</p>
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 uppercase font-outfit">Tous vos patients sont à jour !</h4>
                        <p className="text-sm text-slate-500 font-medium">Aucun patient inactif trouvé dans les 6 derniers mois.</p>
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr 
                        key={patient.id} 
                        className={cn(
                          "group hover:bg-slate-50/50 transition-colors",
                          selectedIds.has(patient.id) && "bg-primary/5"
                        )}
                      >
                        <td className="p-6">
                          <Checkbox 
                            checked={selectedIds.has(patient.id)}
                            onCheckedChange={() => toggleSelect(patient.id)}
                            className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{patient.first_name} {patient.last_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium italic">Inactif depuis &gt; 6 mois</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            {patient.phone_number || "Non renseigné"}
                          </span>
                        </td>
                        <td className="p-6">
                          {!patient.phone_number ? (
                            <div className="flex items-center gap-2 text-rose-500">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-tighter">Numéro manquant</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-tighter w-fit">
                              Prêt à l&apos;envoi
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-primary/5 border border-primary/10">
          <CardContent className="p-8 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 font-outfit uppercase tracking-tight">Conseil de Relance</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                N&apos;abusez pas des relances groupées. WhatsApp peut bloquer votre compte si trop de destinataires signalent vos messages comme étant du &quot;spam&quot;. Nous incluons un délai de sécurité entre chaque envoi pour limiter ce risque.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
