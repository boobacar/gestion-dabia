"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Search,
  CreditCard,
  User as UserIcon,
  ArrowRight,
  MessageCircle,
  Loader2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import Link from "next/link";
import { sendDebtReminder } from "@/app/actions/whatsapp";

// Reuse the InvoiceRecord type (ideally this would be in a shared types file)
type InvoiceRecord = {
  id: string;
  patient_id: string;
  appointment_id?: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  insurance_details?: { provider?: string };
  created_at: string;
  due_date?: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
    phone_number?: string;
  };
  invoice_items?: {
    tooth_number?: number;
    condition: string;
    price: number;
    category?: string;
  }[];
  insurance_company_id?: string;
  insurance_coverage_amount?: number;
};

interface Treatment {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
}

interface ClientInvoicesPageProps {
  initialInvoices: InvoiceRecord[];
}

export function ClientInvoicesPage({ initialInvoices }: ClientInvoicesPageProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [activeView, setActiveView] = useState<"journal" | "debts">(viewParam === "debts" ? "debts" : "journal");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRelancing, setIsRelancing] = useState<string | null>(null);
  
  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [foundPatients, setFoundPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentItems, setCurrentItems] = useState<{ id: string, name: string, price: number, category: string, tooth_number?: number }[]>([]);
  const [newAmount, setNewAmount] = useState("");
  const [newItemTooth, setNewItemTooth] = useState("");
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("custom");
  const [treatmentCatalog, setTreatmentCatalog] = useState<Treatment[]>([]);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>("");
  const [insuranceCoverage, setInsuranceCoverage] = useState("");
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string, name: string }[]>([]);

  // Sync activeView with URL param
  useEffect(() => {
    setActiveView(viewParam === "debts" ? "debts" : "journal");
  }, [viewParam]);

  // Sync with props
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Editing/Deletion
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyRevenue = invoices
      .filter(inv => new Date(inv.created_at) >= startOfMonth)
      .reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      
    const pendingCount = invoices.filter(inv => inv.status === "pending").length;
    const unpaidAmount = invoices.reduce((sum, inv) => 
      sum + (inv.total_amount - (inv.paid_amount || 0) - (inv.insurance_coverage_amount || 0)), 0);
      
    // Group debts by patient
    const patientDebtsMap = new Map<string, {
      id: string;
      patient: { id: string, name: string, number: string };
      totalBilled: number;
      totalPaid: number;
      totalInsurance: number;
      remaining: number;
      lastInvoiceDate: string;
    }>();

    invoices.forEach(inv => {
      const balance = Math.round(inv.total_amount - (inv.paid_amount || 0) - (inv.insurance_coverage_amount || 0));
      if (balance > 0 && inv.patients) {
        const existing = patientDebtsMap.get(inv.patients.id) || {
          id: inv.patients.id,
          patient: { 
            id: inv.patients.id, 
            name: `${inv.patients.first_name} ${inv.patients.last_name}`,
            number: inv.patients.patient_number,
            phone: inv.patients.phone_number
          },
          totalBilled: 0,
          totalPaid: 0,
          totalInsurance: 0,
          remaining: 0,
          lastInvoiceDate: inv.created_at
        };
        
        existing.totalBilled += inv.total_amount;
        existing.totalPaid += (inv.paid_amount || 0);
        existing.totalInsurance += (inv.insurance_coverage_amount || 0);
        existing.remaining += balance;
        if (new Date(inv.created_at) > new Date(existing.lastInvoiceDate)) {
          existing.lastInvoiceDate = inv.created_at;
        }
        
        patientDebtsMap.set(inv.patients.id, existing);
      }
    });

    const patientDebtsList = Array.from(patientDebtsMap.values())
      .sort((a, b) => b.remaining - a.remaining);

    return { monthlyRevenue, pendingCount, unpaidAmount, patientDebtsList };
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase.from("treatment_catalog").select("*").order("name");
    if (data) setTreatmentCatalog(data);

    const { data: insurances } = await supabase.from("insurance_companies").select("*").order("name");
    if (insurances) setInsuranceCompanies(insurances);
  }, [supabase]);

  const searchPatients = async (val: string) => {
    setPatientSearch(val);
    if (val.trim().length < 2) {
      setFoundPatients([]);
      return;
    }

    // setIsSearchingPatients(true);
    try {
      const term = val.trim();
      const isNumeric = /^\d+$/.test(term);
      
      let query = supabase.from("patients").select("id, first_name, last_name, patient_number");

      if (isNumeric) {
        query = query.or(`patient_number.eq.${term},first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
      } else {
        const terms = term.split(/\s+/);
        if (terms.length === 1) {
          query = query.or(`first_name.ilike.%${terms[0]}%,last_name.ilike.%${terms[0]}%`);
        } else {
          query = query.or(`first_name.ilike.%${terms[0]}%,last_name.ilike.%${terms[0]}%,first_name.ilike.%${terms[1]}%,last_name.ilike.%${terms[1]}%`);
        }
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      if (data) setFoundPatients(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la recherche");
    } finally {
      // setIsSearchingPatients(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error("Patient requis");
    if (currentItems.length === 0) return toast.error("Au moins un soin requis");

    const totalCalculated = currentItems.reduce((sum, item) => sum + item.price, 0);
    const insuranceAmt = insuranceCoverage ? parseFloat(insuranceCoverage) : 0;
    const remainingToPay = Math.round(totalCalculated - insuranceAmt);
    const initialStatus = remainingToPay <= 0 ? "paid" : "pending";

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: selectedPatient.id,
          total_amount: totalCalculated,
          paid_amount: 0,
          status: initialStatus,
          insurance_company_id: selectedInsuranceId || null,
          insurance_coverage_amount: insuranceAmt,
          invoice_items: currentItems.map(i => ({ 
            condition: i.name, 
            price: i.price, 
            category: i.category, 
            tooth_number: i.tooth_number 
          }))
        })
        .select(`*, patients(id, first_name, last_name, patient_number)`)
        .single();

      if (error) throw error;
      setInvoices([data, ...invoices]);
      toast.success("Facture créée");
      resetForm();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    setIsCreating(true);
    try {
      const totalCalculated = currentItems.reduce((sum, item) => sum + item.price, 0);
      const insuranceAmt = insuranceCoverage ? parseFloat(insuranceCoverage) : 0;
      const alreadyPaid = editingInvoice.paid_amount || 0;
      const remainingToPay = Math.round(totalCalculated - insuranceAmt - alreadyPaid);
      const newStatus = remainingToPay <= 0 ? "paid" : "pending";

      const { data, error } = await supabase
        .from("invoices")
        .update({
          total_amount: totalCalculated,
          insurance_company_id: selectedInsuranceId || null,
          insurance_coverage_amount: insuranceAmt,
          status: newStatus,
          invoice_items: currentItems.map(i => ({
            condition: i.name,
            price: i.price,
            category: i.category,
            tooth_number: i.tooth_number
          }))
        })
        .eq("id", editingInvoice.id)
        .select(`*, patients(id, first_name, last_name, patient_number, phone_number)`)
        .single();

      if (error) throw error;
      setInvoices(invoices.map(inv => inv.id === data.id ? data : inv));
      toast.success("Facture mise à jour");
      setIsEditing(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erreur mise à jour");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRelance = async (patientId: string, amount: number) => {
    setIsRelancing(patientId);
    try {
      const res = await sendDebtReminder(patientId, amount);
      if (res.success) {
        toast.success("Message de relance envoyé !");
      } else {
        toast.error(res.error || "Erreur d'envoi");
      }
    } catch {
      toast.error("Erreur serveur lors de la relance");
    } finally {
      setIsRelancing(null);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setFoundPatients([]);
    setCurrentItems([]);
    setNewAmount("");
    setInsuranceCoverage("");
    setSelectedInsuranceId("");
    setSelectedTreatmentId("custom");
  };

  const handleDeleteInvoice = async (id: string) => {
    // setIsDeleting(true);
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success("Facture supprimée");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erreur suppression");
    } finally {
      // setIsDeleting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.patients?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.patients?.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100/50 shadow-sm">
          <CheckCircle className="w-3 h-3" />
          Payé
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100/50 shadow-sm">
        <Clock className="w-3 h-3" />
        En attente
      </span>
    );
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Facturation & Caisse</h1>
          <p className="text-muted-foreground mt-2">Gérez l&apos;ensemble de l&apos;activité financière du cabinet.</p>
        </div>
        
        <Dialog onOpenChange={(open) => { if(open) fetchCatalog(); else resetForm(); }}>
          <DialogTrigger 
            render={
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Nouvelle Facture
              </Button>
            } 
          />
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreateInvoice}>
              <DialogHeader>
                <DialogTitle>Émettre une Facture / Devis</DialogTitle>
                <DialogDescription>Recherchez un patient et ajoutez les prestations effectuées.</DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                <div className="space-y-3">
                  <Label>Rechercher un Patient</Label>
                  {!selectedPatient ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Nom, prénom ou N° de dossier..." 
                        className="pl-9"
                        value={patientSearch}
                        onChange={(e) => searchPatients(e.target.value)}
                      />
                      {foundPatients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md divide-y overflow-auto max-h-[250px] shadow-2xl">
                          {foundPatients.map(p => (
                            <div key={p.id} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between" onClick={() => setSelectedPatient(p)}>
                              <div><div className="font-bold">{p.first_name} {p.last_name}</div><div className="text-xs text-slate-500">N° {p.patient_number}</div></div>
                              <Plus className="w-4 h-4 text-primary" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg text-primary">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5" />
                        <div><div className="font-bold">{selectedPatient.first_name} {selectedPatient.last_name}</div><div className="text-xs uppercase">N° {selectedPatient.patient_number}</div></div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Changer</Button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-dashed space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Prestation</Label>
                      <Select value={selectedTreatmentId} onValueChange={(val) => {
                        const target = val || "custom";
                        setSelectedTreatmentId(target);
                        if (target !== "custom") {
                          const t = treatmentCatalog.find(x => x.id === target);
                          if (t) setNewAmount(t.price.toString());
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Choisir un soin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Saisie Manuelle</SelectItem>
                          {treatmentCatalog.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-2"><Label>Dent</Label><Input placeholder="N°" value={newItemTooth} onChange={e => setNewItemTooth(e.target.value)} /></div>
                    <div className="w-32 space-y-2"><Label>Prix</Label><Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} /></div>
                    <Button type="button" onClick={() => {
                        const t = treatmentCatalog.find(x => x.id === selectedTreatmentId);
                        setCurrentItems([...currentItems, {
                          id: Math.random().toString(),
                          name: selectedTreatmentId === "custom" ? "Soin manuel" : (t?.name || ""),
                          price: Number(newAmount),
                          category: t?.category || "Général",
                          tooth_number: newItemTooth ? parseInt(newItemTooth) : undefined
                        }]);
                        setNewAmount("");
                        setNewItemTooth("");
                      }}>Ajouter</Button>
                  </div>
                </div>

                {currentItems.length > 0 && (
                  <div className="space-y-2 border rounded-xl overflow-hidden">
                    {currentItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 bg-white">
                        <div className="text-sm">
                          <span className="font-bold">{item.name}</span>
                          {item.tooth_number && <span className="ml-2 text-primary font-bold">D{item.tooth_number}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(item.price)}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-slate-50 flex justify-between font-black">
                      <span>Total :</span><span>{formatCurrency(currentItems.reduce((s, i) => s + i.price, 0))}</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Assurance</Label>
                    <Select value={selectedInsuranceId} onValueChange={(val) => setSelectedInsuranceId(val || "")}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {insuranceCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prise en Charge</Label>
                    <Input type="number" value={insuranceCoverage} onChange={e => setInsuranceCoverage(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter><Button type="submit" disabled={isCreating} className="w-full h-12 text-lg font-bold">{isCreating ? "Patience..." : "Valider la facture"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary hover:bg-primary/95 transition-all duration-300 text-white border-none shadow-xl shadow-primary/10 overflow-hidden relative">
          <div className="absolute right-[-10%] bottom-[-10%] rotate-12 opacity-10">
            <CreditCard className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-white/70 font-medium">Encaissements du mois</CardDescription>
            <CardTitle className="text-4xl font-black font-outfit leading-none">{formatCurrency(stats.monthlyRevenue)}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full backdrop-blur-sm font-bold uppercase tracking-wider">Caisse de Mars</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 hover:border-amber-200 transition-all duration-300 shadow-xl shadow-slate-200/50 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Factures en attente</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{stats.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
              <Clock className="w-3 h-3" /> Relance nécessaire
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 hover:border-rose-200 transition-all duration-300 shadow-xl shadow-slate-200/50 border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Total des impayés</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{formatCurrency(stats.unpaidAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
              CA à recouvrer
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/50 backdrop-blur-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveView("journal")} 
              className={cn(
                "rounded-lg px-6 transition-all duration-300", 
                activeView === "journal" 
                  ? "bg-white text-primary shadow-sm font-black text-xs uppercase tracking-wider" 
                  : "text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-wider"
              )}
            >
              Journal des flux
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveView("debts")} 
              className={cn(
                "rounded-lg px-6 transition-all duration-300", 
                activeView === "debts" 
                  ? "bg-white text-primary shadow-sm font-black text-xs uppercase tracking-wider" 
                  : "text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-wider"
              )}
            >
              Dettes Patients 
              {stats.patientDebtsList.length > 0 && (
                <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">
                  {stats.patientDebtsList.length}
                </span>
              )}
            </Button>
          </div>
          {activeView === "journal" && (
            <div className="flex gap-2">
              <Input placeholder="Rechercher..." className="w-64" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="paid">Payés</SelectItem><SelectItem value="pending">En attente</SelectItem></SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Card className="border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden bg-white/50 backdrop-blur-xl">
          <div className="overflow-x-auto">
            {activeView === "journal" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date d&apos;émission</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Information Patient</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Montant Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reste à Régler</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">État du Paiement</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Outils</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-600">
                          {new Date(inv.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {inv.patients?.first_name} {inv.patients?.last_name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium tracking-tighter">N° Dossier: {inv.patients?.patient_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(inv.total_amount)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "font-black text-sm",
                          (inv.total_amount - (inv.paid_amount || 0) - (inv.insurance_coverage_amount || 0)) > 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {formatCurrency(inv.total_amount - (inv.paid_amount || 0) - (inv.insurance_coverage_amount || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {getStatusBadge(inv.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                            onClick={() => {
                              setEditingInvoice(inv);
                              setIsEditing(true);
                              setCurrentItems(inv.invoice_items?.map(i => ({ id: Math.random().toString(), name: i.condition, price: i.price, category: i.category || "Général", tooth_number: i.tooth_number })) || []);
                              setInsuranceCoverage(inv.insurance_coverage_amount?.toString() || "");
                              setSelectedInsuranceId(inv.insurance_company_id || "");
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            onClick={() => handleDeleteInvoice(inv.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <InvoicePrintModal 
                            invoice={inv} 
                            patientName={`${inv.patients?.first_name} ${inv.patients?.last_name}`} 
                            patientNumber={inv.patients?.patient_number || ""} 
                            patientPhone={inv.patients?.phone_number || ""} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Identité Patient</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Facturation Totale</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Recouvrement Réalisé</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 text-right">Créance Restante</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Exploration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.patientDebtsList.map(debt => (
                    <tr key={debt.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{debt.patient.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium tracking-widest">Dossier N° {debt.patient.number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        {formatCurrency(debt.totalBilled)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-emerald-600 font-bold">{formatCurrency(debt.totalPaid + debt.totalInsurance)}</span>
                            {debt.totalInsurance > 0 && <span className="text-[9px] text-slate-400 italic">dont {formatCurrency(debt.totalInsurance)} mutuelle</span>}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg font-black text-sm border border-rose-100 shadow-sm">
                          {formatCurrency(debt.remaining)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isRelancing === debt.id}
                            onClick={() => handleRelance(debt.id, debt.remaining)}
                            className="h-8 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-[10px] uppercase tracking-wider"
                          >
                            {isRelancing === debt.id ? (
                               <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                            ) : (
                               <MessageCircle className="w-3 h-3 mr-1.5 fill-emerald-600/10" />
                            )}
                            Relancer
                          </Button>
                          <Link 
                            href={`/admin/patients/${debt.id}?tab=invoices`} 
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3 py-1.5 h-8 rounded-lg border border-primary/20 transition-all"
                          >
                            Dossier <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Modifier la facture</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Prestation</Label>
                    <Select value={selectedTreatmentId} onValueChange={(val) => setSelectedTreatmentId(val || "custom")}>
                      <SelectTrigger><SelectValue placeholder="Choisir un soin..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Saisie Manuelle</SelectItem>
                        {treatmentCatalog.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-2"><Label>Prix</Label><Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} /></div>
                  <Button type="button" onClick={() => {
                      const t = treatmentCatalog.find(x => x.id === selectedTreatmentId);
                      setCurrentItems([...currentItems, { id: Math.random().toString(), name: selectedTreatmentId === "custom" ? "Soin manuel" : (t?.name || ""), price: Number(newAmount), category: t?.category || "Général" }]);
                      setNewAmount("");
                    }}>Ajouter</Button>
                </div>
             </div>
             <div className="border rounded-xl">
                {currentItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3 border-b last:border-0">
                    <span className="font-bold">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(item.price)}</span>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Assurance</Label><Select value={selectedInsuranceId} onValueChange={(val) => setSelectedInsuranceId(val || "none")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Aucune</SelectItem>{insuranceCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select></div>
                <div className="space-y-2"><Label>Prise en Charge</Label><Input type="number" value={insuranceCoverage} onChange={e => setInsuranceCoverage(e.target.value)} /></div>
             </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateInvoice} className="w-full">Enregistrer les modifications</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
