"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Stethoscope, ClipboardList, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTreatmentPlan, addPlanItem, removePlanItem, updatePlanStatus } from "@/app/actions/plans";
import { Badge } from "@/components/ui/badge";

interface Treatment {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface PlanItem {
  id: string;
  plan_id: string;
  treatment_id: string;
  name_manual: string;
  price: number;
  status: string;
  tooth_number: number | null;
  notes: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  treatment_plan_items?: PlanItem[];
}

interface PatientTreatmentPlansProps {
  patientId: string;
}

export function PatientTreatmentPlans({ patientId }: PatientTreatmentPlansProps) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("Plan de Traitement");
  const [catalog, setCatalog] = useState<Treatment[]>([]);
  
  const supabase = createClient();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("treatment_plans")
      .select("*, treatment_plan_items(*)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    
    if (data) setPlans(data as TreatmentPlan[]);
    setLoading(false);
  }, [supabase, patientId]);

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase.from("treatment_catalog").select("*").order("name");
    if (data) setCatalog(data);
  }, [supabase]);

  useEffect(() => {
    const loadData = async () => {
      await fetchPlans();
      await fetchCatalog();
    };
    loadData();
  }, [fetchPlans, fetchCatalog]);

  const handleCreatePlan = async () => {
    setIsCreating(true);
    const res = await createTreatmentPlan(patientId, newPlanTitle);
    if (res.success) {
      toast.success("Plan créé");
      fetchPlans();
    } else {
      toast.error(res.error || "Erreur lors de la création");
    }
    setIsCreating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Plans de Traitement
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ébauches et Devis Cliniques</p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau Plan
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Plan de Traitement</DialogTitle>
              <DialogDescription>Donnez un nom à ce plan (ex: Réhabilitation haut, Extraction sagesse...)</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="space-y-2">
                 <Label>Titre du Plan</Label>
                 <Input value={newPlanTitle} onChange={(e) => setNewPlanTitle(e.target.value)} />
               </div>
            </div>
            <DialogFooter>
               <Button onClick={handleCreatePlan} disabled={isCreating}>
                 {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                 Créer
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed py-12 text-center bg-slate-50/50">
           <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-4" />
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun plan en cours</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black">{plan.title}</CardTitle>
                    <CardDescription>{new Date(plan.created_at).toLocaleDateString("fr-FR")}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.status === "draft" ? "outline" : "default"}>
                      {plan.status === "draft" ? "BROUILLON" : plan.status.toUpperCase()}
                    </Badge>
                    <span className="text-xl font-black text-primary">
                      {formatCurrency(plan.total_amount)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                   {plan.treatment_plan_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-primary/30 transition-colors group">
                        <div className="flex gap-4 items-center">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
                             {item.tooth_number || "--"}
                           </div>
                           <div>
                              <div className="font-bold text-sm">{item.name_manual || catalog.find(c => c.id === item.treatment_id)?.name || "Acte inconnu"}</div>
                              {item.notes && <div className="text-[10px] text-slate-500">{item.notes}</div>}
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="font-black text-slate-700">{formatCurrency(item.price)}</div>
                           <Button 
                             size="icon" 
                             variant="ghost" 
                             className="h-8 w-8 text-slate-300 hover:text-destructive transition-colors"
                             onClick={async () => {
                               if (confirm("Retirer cet acte ?")) {
                                 await removePlanItem(item.id, plan.id);
                                 fetchPlans();
                               }
                             }}
                           >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                   ))}
                   
                   {/* Add Item Trigger */}
                   <Dialog onOpenChange={(open) => open && fetchCatalog()}>
                      <DialogTrigger render={<Button variant="outline" className="w-full border-dashed py-6" size="sm" />}>
                          <Plus className="w-4 h-4 mr-2" /> Ajouter un acte clinique
                      </DialogTrigger>
                      <DialogContent>
                         <PlanItemForm planId={plan.id} catalog={catalog} onSuccess={() => {
                            fetchPlans();
                            toast.success("Acte ajouté au plan");
                         }} />
                      </DialogContent>
                   </Dialog>
                </div>
                
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-dashed">
                   <Button variant="outline" size="sm" onClick={async () => {
                      if (confirm("Clôturer ce plan ?")) {
                         await updatePlanStatus(plan.id, "active");
                         fetchPlans();
                      }
                   }}>
                     <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Marquer comme Actif
                   </Button>
                   <Button variant="outline" size="sm">
                     <ClipboardList className="w-4 h-4 mr-2" /> Imprimer Devis
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanItemForm({ planId, catalog, onSuccess }: { planId: string; catalog: Treatment[]; onSuccess: () => void }) {
  const [treatmentId, setTreatmentId] = useState("");
  const [price, setPrice] = useState("");
  const [tooth, setTooth] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!treatmentId || !price) return toast.error("Acte et prix requis");
    setLoading(true);
    const res = await addPlanItem(planId, {
      treatment_id: treatmentId,
      price: Number(price),
      tooth_number: tooth ? Number(tooth) : undefined,
      notes: notes || undefined
    });
    if (res.success) {
      onSuccess();
    } else {
      toast.error(res.error || "Erreur");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 py-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" /> Ajouter un Acte
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
           <div className="col-span-3 space-y-2">
              <Label>Acte clinique</Label>
              <Select onValueChange={(val) => {
                setTreatmentId(val);
                const t = catalog.find(x => x.id === val);
                if (t) setPrice(t.price.toString());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un acte..." />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           <div className="space-y-2">
              <Label>Dent</Label>
              <Input placeholder="N°" value={tooth} onChange={(e) => setTooth(e.target.value)} />
           </div>
        </div>

        <div className="space-y-2">
          <Label>Honoraires (FCFA)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Notes particulières</Label>
          <Input placeholder="Rénovation, urgence, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Ajouter au plan
        </Button>
      </DialogFooter>
    </div>
  );
}
