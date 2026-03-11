"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  FileText, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit, 
  Search, 
  CreditCard, 
  Filter,
  User as UserIcon
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
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import Link from "next/link";

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
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [foundPatients, setFoundPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentItems, setCurrentItems] = useState<{ id: string, name: string, price: number, category: string, tooth_number?: number }[]>([]);
  const [newAmount, setNewAmount] = useState("");
  const [newItemTooth, setNewItemTooth] = useState("");
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("custom");
  const [treatmentCatalog, setTreatmentCatalog] = useState<Treatment[]>([]);
  const [newInsurance, setNewInsurance] = useState("");

  // Editing/Deletion
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyRevenue = invoices
      .filter(inv => new Date(inv.created_at) >= startOfMonth)
      .reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      
    const pendingCount = invoices.filter(inv => inv.status === "pending").length;
    const unpaidAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

    return { monthlyRevenue, pendingCount, unpaidAmount };
  }, [invoices]);

  // Sync with props
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
    }).format(amount);
  };

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase.from("treatment_catalog").select("*").order("name");
    if (data) setTreatmentCatalog(data);
  }, [supabase]);

  const searchPatients = async (val: string) => {
    setPatientSearch(val);
    if (val.trim().length < 2) {
      setFoundPatients([]);
      return;
    }

    setIsSearchingPatients(true);
    try {
      const term = val.trim();
      const isNumeric = /^\d+$/.test(term);
      
      let query = supabase.from("patients").select("id, first_name, last_name, patient_number");

      if (isNumeric) {
        // If it's a number, try exact match on patient_number OR partial matches on names
        query = query.or(`patient_number.eq.${term},first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
      } else {
        const terms = term.split(/\s+/);
        if (terms.length === 1) {
          // Just names, avoid patient_number if it's an integer
          query = query.or(`first_name.ilike.%${terms[0]}%,last_name.ilike.%${terms[0]}%`);
        } else {
          // Multi-term: search names
          query = query.or(`first_name.ilike.%${terms[0]}%,last_name.ilike.%${terms[0]}%,first_name.ilike.%${terms[1]}%,last_name.ilike.%${terms[1]}%`);
        }
      }

      const { data, error } = await query.limit(100);
      
      if (error) {
        console.error("DEBUG: Supabase search error:", error);
        toast.error(`Erreur recherche: ${error.message || "Code " + error.code}`);
      } else if (data) {
        setFoundPatients(data);
      }
    } catch (err) {
      console.error("DEBUG: searchPatients crash:", err);
      toast.error("Erreur système lors de la recherche");
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Veuillez sélectionner un patient.");
      return;
    }
    if (currentItems.length === 0) {
      toast.error("Veuillez ajouter au moins un soin.");
      return;
    }

    const totalCalculated = currentItems.reduce((sum, item) => sum + item.price, 0);
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: selectedPatient.id,
          total_amount: totalCalculated,
          paid_amount: 0,
          status: "pending",
          insurance_details: newInsurance ? { provider: newInsurance } : null,
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
      toast.success("Facture créée avec succès.");
      resetForm();
    } catch (err) {
      toast.error("Erreur lors de la création");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    setIsCreating(true);
    try {
      const totalCalculated = currentItems.reduce((sum, item) => sum + item.price, 0);
      const { data, error } = await supabase
        .from("invoices")
        .update({
          total_amount: totalCalculated,
          insurance_details: { provider: newInsurance },
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
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setFoundPatients([]);
    setCurrentItems([]);
    setNewAmount("");
    setNewInsurance("");
    setSelectedTreatmentId("custom");
  };

  const handleDeleteInvoice = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success("Facture supprimée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur de suppression");
    } finally {
      setIsDeleting(false);
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
    switch (status) {
      case "paid":
        return <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1" /> Payé</span>;
      case "pending":
        return <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1" /> En attente</span>;
      default:
        return <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Facturation & Caisse</h1>
          <p className="text-muted-foreground mt-2">Gérez l&apos;ensemble de l&apos;activité financière du cabinet.</p>
        </div>
        
        <Dialog onOpenChange={(open) => { if(open) fetchCatalog(); else resetForm(); }}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Facture
            </Button>
          }/>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreateInvoice}>
              <DialogHeader>
                <DialogTitle>Émettre une Facture / Devis</DialogTitle>
                <DialogDescription>Recherchez un patient et ajoutez les prestations effectuées.</DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                {/* Patient Search */}
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
                      {isSearchingPatients && (
                        <div className="absolute right-3 top-3">
                          <Clock className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                      )}
                      {foundPatients.length > 0 ? (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md divide-y overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto shadow-2xl">
                          {foundPatients.map(p => (
                            <div 
                              key={p.id} 
                              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                              onClick={() => setSelectedPatient(p)}
                            >
                              <div>
                                <div className="font-bold text-slate-900">{p.first_name} {p.last_name}</div>
                                <div className="text-xs text-slate-500">Dossier: {p.patient_number}</div>
                              </div>
                              <Plus className="w-4 h-4 text-primary" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        patientSearch.trim().length >= 2 && !isSearchingPatients && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center text-sm text-slate-500 animate-in fade-in zoom-in-95 duration-200">
                            Aucun patient trouvé pour &quot;{patientSearch}&quot;
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg text-primary">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                          <div className="text-xs uppercase opacity-80">N° {selectedPatient.patient_number}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="text-xs text-primary hover:bg-primary/10">Changer</Button>
                    </div>
                  )}
                </div>

                {/* Treatment Adding */}
                <div className="bg-slate-50 p-4 rounded-xl border border-dashed space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Prestation (Catalogue)</Label>
                      <Select value={selectedTreatmentId} onValueChange={(val) => {
                        if (!val) return;
                        setSelectedTreatmentId(val);
                        if (val !== "custom") {
                          const t = treatmentCatalog.find(x => x.id === val);
                          if (t) setNewAmount(t.price.toString());
                        }
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir un soin...">
                            {selectedTreatmentId === "custom" ? "Saisie Manuelle" : treatmentCatalog.find(t => t.id === selectedTreatmentId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom" label="Saisie Manuelle">-- Saisie Manuelle --</SelectItem>
                          {treatmentCatalog.map(t => (
                            <SelectItem key={t.id} value={t.id} label={t.name}>{t.name} ({formatCurrency(t.price)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Dent</Label>
                      <Input placeholder="N°" value={newItemTooth} onChange={e => setNewItemTooth(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Prix (XOF)</Label>
                      <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => {
                      if (!newAmount) return;
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
                      setSelectedTreatmentId("custom");
                    }}>Ajouter</Button>
                  </div>
                </div>

                {/* Items List */}
                {currentItems.length > 0 && (
                  <div className="space-y-3">
                    <Label className="uppercase text-xs font-black text-slate-400 tracking-widest">Prestations sélectionnées</Label>
                    <div className="border rounded-xl divide-y bg-white overflow-hidden shadow-sm">
                      {currentItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1">
                            <span className="font-semibold text-slate-800">{item.name}</span>
                            {item.tooth_number && <span className="ml-2 font-black text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">Dent {item.tooth_number}</span>}
                            <div className="text-[10px] uppercase text-slate-400 mt-0.5">{item.category}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-900">{formatCurrency(item.price)}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10" onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-slate-50 flex justify-between items-center">
                        <span className="font-black text-slate-900 italic uppercase text-sm">Total à payer :</span>
                        <span className="text-xl font-black text-primary">{formatCurrency(currentItems.reduce((s, i) => s + i.price, 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 border-t pt-4">
                  <Label>Mutuelle / Assurance (Optionnel)</Label>
                  <Input placeholder="SONAM, IPM, etc..." value={newInsurance} onChange={e => setNewInsurance(e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isCreating} className="w-full h-12 text-lg font-bold">
                  {isCreating ? "Création en cours..." : "Valider et émettre la facture"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white group overflow-hidden relative">
          <div className="absolute right-[-10%] bottom-[-10%] rotate-12 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <CreditCard className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 font-medium">Encaissements du mois</CardDescription>
            <CardTitle className="text-4xl font-black font-outfit leading-none">{formatCurrency(stats.monthlyRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs bg-white/20 inline-block px-2 py-1 rounded-full backdrop-blur-sm">+12% depuis hier</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white group border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Factures en attente</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{stats.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase">
              <Clock className="w-3 h-3" /> Relance nécessaire
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white group border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Total des impayés</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{formatCurrency(stats.unpaidAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase">
              Chiffre d&apos;affaire à recouvrer
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-2xl bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 py-6">
          <div>
            <CardTitle className="font-black text-xl text-slate-800">Journal des Mouvements</CardTitle>
            <CardDescription>Visualisez et gérez toutes les factures émises.</CardDescription>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Patient ou Réf..." 
                className="pl-9 bg-white border-slate-200" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger className="w-[150px] bg-white border-slate-200">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout voir</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="uppercase text-[10px] font-black text-slate-400 tracking-wider">
                  <th className="h-10 px-6 text-left">Date</th>
                  <th className="h-10 px-6 text-left">Patient</th>
                  <th className="h-10 px-6 text-right">Total</th>
                  <th className="h-10 px-6 text-right">Reste</th>
                  <th className="h-10 px-6 text-center">Statut</th>
                  <th className="h-10 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 tabular-nums">
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      {inv.patients ? (
                        <Link href={`/admin/patients/${inv.patients.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors">
                          {inv.patients.first_name} {inv.patients.last_name}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Inconnu</span>
                      )}
                      {inv.insurance_details?.provider && (
                        <div className="text-[10px] text-primary font-black uppercase flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-2 h-2" /> {inv.insurance_details.provider}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 italic whitespace-nowrap">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`font-bold tabular-nums ${inv.total_amount - inv.paid_amount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {formatCurrency(inv.total_amount - inv.paid_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(inv.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Dialog open={isEditing && editingInvoice?.id === inv.id} onOpenChange={(open) => {
                          if (!open) {
                            setIsEditing(false);
                            setEditingInvoice(null);
                            resetForm();
                          }
                        }}>
                          <DialogTrigger render={
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                fetchCatalog();
                                setSelectedPatient(inv.patients as Patient);
                                setEditingInvoice(inv);
                                setNewInsurance(inv.insurance_details?.provider || "");
                                setCurrentItems((inv.invoice_items || []).map(item => ({
                                  id: Math.random().toString(),
                                  name: item.condition,
                                  price: item.price,
                                  category: item.category || "Soins",
                                  tooth_number: item.tooth_number
                                })));
                                setIsEditing(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          }/>
                          <DialogContent className="max-w-2xl">
                            <form onSubmit={(e) => { e.preventDefault(); handleUpdateInvoice(); }}>
                              <DialogHeader>
                                <DialogTitle>Modifier la Facture / Devis</DialogTitle>
                                <DialogDescription>Patient : {inv.patients?.first_name} {inv.patients?.last_name}</DialogDescription>
                              </DialogHeader>
                              
                              <div className="py-4 space-y-6">
                                {/* Treatment Adding (Reuse same UI as creation) */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-dashed space-y-4">
                                  <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                      <Label>Prestation (Catalogue)</Label>
                                      <Select value={selectedTreatmentId} onValueChange={(val) => {
                                        if (!val) return;
                                        setSelectedTreatmentId(val);
                                        if (val !== "custom") {
                                          const t = treatmentCatalog.find(x => x.id === val);
                                          if (t) setNewAmount(t.price.toString());
                                        }
                                      }}>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Choisir un soin...">
                                            {selectedTreatmentId === "custom" ? "Saisie Manuelle" : treatmentCatalog.find(t => t.id === selectedTreatmentId)?.name}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="custom" label="Saisie Manuelle">-- Saisie Manuelle --</SelectItem>
                                          {treatmentCatalog.map(t => (
                                            <SelectItem key={t.id} value={t.id} label={t.name}>{t.name} ({formatCurrency(t.price)})</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="w-24 space-y-2">
                                      <Label>Dent</Label>
                                      <Input placeholder="N°" value={newItemTooth} onChange={e => setNewItemTooth(e.target.value)} />
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                      <Label>Prix (XOF)</Label>
                                      <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => {
                                      if (!newAmount) return;
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
                                      setSelectedTreatmentId("custom");
                                    }}>Ajouter</Button>
                                  </div>
                                </div>

                                {/* Items List */}
                                {currentItems.length > 0 && (
                                  <div className="space-y-3">
                                    <Label className="uppercase text-xs font-black text-slate-400 tracking-widest">Prestations</Label>
                                    <div className="border rounded-xl divide-y bg-white overflow-hidden shadow-sm">
                                      {currentItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors">
                                          <div className="flex-1">
                                            <span className="font-semibold text-slate-800">{item.name}</span>
                                            {item.tooth_number && <span className="ml-2 font-black text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">Dent {item.tooth_number}</span>}
                                            <div className="text-[10px] uppercase text-slate-400 mt-0.5">{item.category}</div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-900">{formatCurrency(item.price)}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10" onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))}>
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="p-3 bg-slate-50 flex justify-between items-center">
                                        <span className="font-black text-slate-900 italic uppercase text-sm">Nouveau Total :</span>
                                        <span className="text-xl font-black text-primary">{formatCurrency(currentItems.reduce((s, i) => s + i.price, 0))}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-2 border-t pt-4">
                                  <Label>Mutuelle / Assurance</Label>
                                  <Input placeholder="SONAM, IPM, etc..." value={newInsurance} onChange={e => setNewInsurance(e.target.value)} />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button type="submit" disabled={isCreating} className="w-full">
                                  {isCreating ? "Mise à jour..." : "Enregistrer les modifications"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }/>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmer la suppression</DialogTitle>
                              <DialogDescription>Cette action effacera définitivement cette facture du journal financier.</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="destructive" onClick={() => handleDeleteInvoice(inv.id)} disabled={isDeleting}>Supprimer la facture</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <InvoicePrintModal 
                          invoice={inv}
                          patientName={inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : "Patient"}
                          patientNumber={inv.patients?.patient_number || "-"}
                          patientPhone={inv.patients?.phone_number || "-"}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="py-20 text-center">
              <FileText className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-slate-400 font-bold">Aucune facture trouvée</h3>
              <p className="text-slate-300 text-sm">Essayez d&apos;ajuster vos filtres ou effectuez une nouvelle recherche.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
