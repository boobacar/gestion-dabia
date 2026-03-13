"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Send, ArrowLeft, Loader2, AlertCircle, MessageSquare, Info, Type } from "lucide-react";
import Link from "next/link";
import { getAllPatientsWithPhone } from "@/app/actions/patient";
import { sendBroadcastWhatsApp } from "@/app/actions/whatsapp";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  patient_number: string;
}

export default function BroadcastPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageTemplate, setMessageTemplate] = useState("Bonjour {prenom} {nom}, toute l'équipe de la Clinique DABIA vous souhaite de joyeuses fêtes ! 🦷✨");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllPatientsWithPhone();
      if (res.success && res.patients) {
        setPatients(res.patients as Patient[]);
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

  const handleBroadcastSend = async () => {
    if (selectedIds.size === 0) return toast.error("Veuillez sélectionner au moins un patient");
    if (!messageTemplate.trim()) return toast.error("Veuillez saisir un message");

    setIsSending(true);
    setProgress(5);
    
    try {
      const res = await sendBroadcastWhatsApp(Array.from(selectedIds), messageTemplate);
      if (res.success && res.results) {
        setProgress(100);
        toast.success(`${res.results.sent} messages envoyés avec succès !`);
        if (res.results.failed > 0) {
          toast.warning(`${res.results.failed} échecs.`);
        }
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Erreur lors de l'envoi broadcast");
      }
    } catch (error: unknown) {
      console.error("Broadcast send failed:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsSending(false);
    }
  };

  const insertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + variable);
  };

  const previewMessage = useMemo(() => {
    if (patients.length > 0) {
      const p = patients[0];
      return messageTemplate
        .replace(/\{prenom\}/g, p.first_name)
        .replace(/\{nom\}/g, p.last_name);
    }
    return messageTemplate;
  }, [messageTemplate, patients]);

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
            Diffusion <span className="text-primary italic">Masse (Broadcast)</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Envoyez un message personnalisé à toute votre base de patients.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Composition Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-black text-white font-outfit uppercase tracking-tight">Composez votre Message</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contenu du message</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => insertVariable("{prenom}")}
                      className="h-7 text-[9px] font-bold uppercase rounded-lg border-slate-200"
                    >
                      + Prénom
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => insertVariable("{nom}")}
                      className="h-7 text-[9px] font-bold uppercase rounded-lg border-slate-200"
                    >
                      + Nom
                    </Button>
                  </div>
                </div>
                <Textarea 
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Écrivez votre message ici..."
                  className="min-h-[150px] rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium text-sm leading-relaxed"
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Aperçu pour un patient :</span>
                </div>
                <p className="text-xs text-slate-600 font-medium italic leading-relaxed bg-white/50 p-3 rounded-xl border border-white">
                  &quot;{previewMessage}&quot;
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-amber-50 border border-amber-100">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900 uppercase">Attention Anti-Spam</h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  L&apos;envoi est limité à une vitesse de 1 message toutes les 2 à 4 secondes pour protéger votre numéro. Évitez les envois trop réguliers à des centaines de personnes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patients Selection Column */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 font-outfit uppercase tracking-tight">Destinataires</CardTitle>
                    <CardDescription className="text-xs font-medium">{patients.length} patients avec mobile trouvés</CardDescription>
                  </div>
                </div>
                
                {selectedIds.size > 0 && (
                  <Button 
                    onClick={handleBroadcastSend}
                    disabled={isSending}
                    className="bg-primary text-white font-black uppercase tracking-widest text-xs px-8 h-12 rounded-xl shadow-lg shadow-primary/20 animate-in zoom-in-95"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Diffuser à {selectedIds.size}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isSending && (
                <div className="px-6 py-4 bg-primary/5 border-b border-primary/10 flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-primary">Envoi en cours... ne fermez pas la page</p>
                       <span className="text-[10px] font-black text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 rounded-full" />
                  </div>
                </div>
              )}

              <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                    <tr className="border-b border-slate-100">
                      <th className="p-4 text-left w-12">
                        <Checkbox 
                          checked={selectedIds.size === patients.length && patients.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="rounded-md border-slate-300"
                        />
                      </th>
                      <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                      <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Téléphone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="p-20 text-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Récupération de la base...</p>
                        </td>
                      </tr>
                    ) : patients.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-20 text-center text-slate-400">
                          <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-tight">Aucun patient avec téléphone trouvé.</p>
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
                          <td className="p-4 text-center">
                            <Checkbox 
                              checked={selectedIds.has(patient.id)}
                              onCheckedChange={() => toggleSelect(patient.id)}
                              className="rounded-md border-slate-300"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 line-clamp-1">{patient.first_name} {patient.last_name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">№ {patient.patient_number}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                              {patient.phone_number}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
