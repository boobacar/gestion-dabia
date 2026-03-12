"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckCircle, Clock, Trash2, Edit, Loader2 } from "lucide-react";
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

interface Treatment {
  id: string;
  name: string;
  price: number;
  category: string;
}

export type InvoiceRecord = {
  id: string;
  patient_id: string;
  appointment_id?: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  insurance_details?: Record<string, unknown>;
  created_at: string;
  due_date?: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
  };
  invoice_items?: {
    tooth_number?: number;
    condition: string;
    price: number;
    category?: string;
  }[];
};

export type Payment = {
  id: string;
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
};

interface PatientInvoicesProps {
  patientId: string;
  patientDetails?: {
    first_name: string;
    last_name: string;
    patient_number: string;
    phone_number?: string;
  };
  initialInvoices?: InvoiceRecord[];
}

export function PatientInvoices({
  patientId,
  patientDetails,
  initialInvoices = [],
}: PatientInvoicesProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [isCreating, setIsCreating] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newInsurance, setNewInsurance] = useState("");
  const [treatmentCatalog, setTreatmentCatalog] = useState<Treatment[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("custom");
  const [currentItems, setCurrentItems] = useState<{ id: string, name: string, price: number, category: string, tooth_number?: number }[]>([]);
  const [newItemTooth, setNewItemTooth] = useState("");

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase
      .from("treatment_catalog")
      .select("*")
      .order("name");
    if (data) setTreatmentCatalog(data);
  }, [supabase]);

  // Payment states
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [patientPayments, setPatientPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (data) setPatientPayments(data);
    setLoadingPayments(false);
  }, [supabase, patientId]);

  // Sync state with props when initialInvoices changes (due to router.refresh)
  useEffect(() => {
    setInvoices(initialInvoices);
    fetchPayments();
  }, [initialInvoices, fetchPayments]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [editInsurance, setEditInsurance] = useState("");
  const [editItems, setEditItems] = useState<{ id: string, name: string, price: number, category: string, tooth_number?: number }[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3 mr-1" /> Payé
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3 mr-1" /> En attente
          </span>
        );
      case "overdue":
        return (
          <span className="flex items-center text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3 mr-1" /> En retard
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentItems.length === 0) {
      toast.error("Veuillez ajouter au moins un soin.");
      return;
    }

    const totalCalculated = currentItems.reduce((sum, item) => sum + item.price, 0);

    setIsCreating(true);
    try {
      const invoiceItems = currentItems.map(item => ({ 
        condition: item.name, 
        price: item.price,
        category: item.category,
        tooth_number: item.tooth_number
      }));

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          total_amount: totalCalculated,
          paid_amount: 0,
          status: "pending",
          insurance_details: newInsurance ? { provider: newInsurance } : null,
          invoice_items: invoiceItems
        })
        .select()
        .single();

      if (error) throw error;

      setInvoices([data, ...invoices]);
      setCurrentItems([]);
      setNewInsurance("");
      setSelectedTreatmentId("custom");
      setNewAmount("");
      toast.success("Facture/Devis créé avec succès.");
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur lors de la création: " + errMsg);
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || isNaN(Number(paymentAmount)))
      return;

    const amountToAdd = Number(paymentAmount);
    if (amountToAdd <= 0) return;

    const newPaidAmount = selectedInvoice.paid_amount + amountToAdd;
    let newStatus = selectedInvoice.status;
    if (newPaidAmount >= selectedInvoice.total_amount) {
      newStatus = "paid";
    }

    try {
      // 1. Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          invoice_id: selectedInvoice.id,
          patient_id: patientId,
          amount: amountToAdd,
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // 2. Update invoice paid amount
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus, paid_amount: newPaidAmount })
        .eq("id", selectedInvoice.id);

      if (error) throw error;

      toast.success("Paiement ajouté avec succès !");

      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === selectedInvoice.id
            ? { ...inv, status: newStatus, paid_amount: newPaidAmount }
            : inv,
        ),
      );
      
      fetchPayments();

      setIsPaymentMenuOpen(false);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setSelectedInvoice(null);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Erreur lors de l'ajout du paiement.");
    }
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
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const totalCalculated = editItems.reduce((sum, item) => sum + item.price, 0);

    setIsCreating(true); // Reusing isCreating for loading state, could be a separate state
    try {
      const invoiceItems = editItems.map(item => ({ 
        condition: item.name, 
        price: item.price,
        category: item.category,
        tooth_number: item.tooth_number
      }));

      const { data, error } = await supabase
        .from("invoices")
        .update({
          total_amount: totalCalculated,
          insurance_details: editInsurance ? { provider: editInsurance } : null,
          invoice_items: invoiceItems
        })
        .eq("id", editingInvoice.id)
        .select()
        .single();

      if (error) throw error;

      setInvoices(invoices.map(inv => inv.id === data.id ? data : inv));
      toast.success("Facture mise à jour");
      setIsEditing(false);
    } catch (error: unknown) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Facturation & Caisse</CardTitle>
          <CardDescription>
            Historique financier, devis et paiements du patient.
          </CardDescription>
        </div>
        <Dialog onOpenChange={(open) => open && fetchCatalog()}>
          <DialogTrigger
            render={
              <Button size="sm" type="button" className="inline-flex">
                <Plus className="w-4 h-4 mr-2" /> Créer Facture
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleCreateInvoice}>
              <DialogHeader>
                <DialogTitle>Nouvelle Facture / Devis</DialogTitle>
                <DialogDescription>
                  Saisissez le montant total des soins prévus ou effectués.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Soin (du catalogue)</Label>
                      <Select
                        value={selectedTreatmentId}
                        onValueChange={(val) => {
                          if (!val) return;
                          setSelectedTreatmentId(val);
                          if (val !== "custom") {
                            const t = treatmentCatalog.find(x => x.id === val);
                            if (t) setNewAmount(t.price.toString());
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un soin..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">-- Manuel --</SelectItem>
                          {treatmentCatalog.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({new Intl.NumberFormat('fr-SN').format(t.price)} F)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                       <Label>Dent</Label>
                       <Input 
                        placeholder="N°" 
                        value={newItemTooth}
                        onChange={(e) => setNewItemTooth(e.target.value)}
                       />
                    </div>
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Montant (FCFA)</Label>
                      <Input
                        type="number"
                        placeholder="25000"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={() => {
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
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold uppercase text-slate-500">Détails des soins</Label>
                  <div className="border rounded-md divide-y overflow-hidden">
                    {currentItems.length > 0 ? (
                      currentItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white text-sm">
                          <div className="flex-1">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            {item.tooth_number && <span className="ml-2 text-xs text-primary font-bold">(Dent {item.tooth_number})</span>}
                            <div className="text-xs text-slate-500 uppercase">{item.category}</div>
                          </div>
                          <div className="font-bold text-slate-900 mr-4">
                            {new Intl.NumberFormat('fr-SN').format(item.price)} F
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 italic">Aucun soin ajouté</div>
                    )}
                  </div>
                  
                  {currentItems.length > 0 && (
                    <div className="flex justify-between items-center pt-2 px-1">
                      <span className="text-lg font-bold">TOTAL :</span>
                      <span className="text-lg font-black text-primary">
                        {new Intl.NumberFormat('fr-SN').format(currentItems.reduce((sum, i) => sum + i.price, 0))} F
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="insurance">Mutuelle / Assurance (Optionnel)</Label>
                  <Input
                    id="insurance"
                    type="text"
                    placeholder="Ex: IPM, SONAM..."
                    value={newInsurance}
                    onChange={(e) => setNewInsurance(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Enregistrement..." : "Créer la facture"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="py-12 text-center border-dashed border-2 rounded-lg bg-slate-50">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm font-medium text-slate-900">Aucune facture</p>
            <p className="text-xs text-muted-foreground mt-1">
              Créez le premier devis ou la première facture pour ce patient.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Reste à payer
                  </th>
                  <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                    Statut
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {invoices.map((inv: InvoiceRecord) => (
                  <tr
                    key={inv.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle">
                      {new Date(inv.created_at as string).toLocaleDateString(
                        "fr-FR",
                      )}
                      {inv.insurance_details && (
                        <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                          Mutuelle
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right font-medium">
                      {formatCurrency(inv.total_amount as number)}
                    </td>
                    <td className="p-4 align-middle text-right text-amber-600">
                      {formatCurrency(
                        (inv.total_amount as number) -
                          ((inv.paid_amount as number) || 0),
                      )}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(inv.status as string)}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingInvoice(inv);
                          setEditInsurance(inv.insurance_details?.provider as string || "");
                          setEditItems((inv.invoice_items || []).map(item => ({
                            id: Math.random().toString(),
                            name: item.condition,
                            price: item.price,
                            category: item.category || "Soins",
                            tooth_number: item.tooth_number
                          })));
                          setIsEditing(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmer la suppression</DialogTitle>
                            <DialogDescription>
                              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="destructive" onClick={() => handleDeleteInvoice(inv.id)} disabled={isDeleting}>
                              {isDeleting ? "Suppression..." : "Supprimer"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {inv.status !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentAmount("");
                            setIsPaymentMenuOpen(true);
                          }}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Paiement
                        </Button>
                      )}
                      <InvoicePrintModal
                        invoice={inv}
                        patientName={
                          patientDetails
                            ? `${patientDetails.first_name} ${patientDetails.last_name}`
                            : inv.patients
                              ? `${inv.patients.first_name} ${inv.patients.last_name}`
                              : "Patient"
                        }
                        patientNumber={
                          patientDetails?.patient_number ||
                          inv.patients?.patient_number ||
                          "-"
                        }
                        patientPhone={patientDetails?.phone_number || "-"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={isPaymentMenuOpen} onOpenChange={setIsPaymentMenuOpen}>
        <DialogContent>
          <form onSubmit={handleAddPayment}>
            <DialogHeader>
              <DialogTitle>Ajouter un paiement</DialogTitle>
              <DialogDescription>
                Saisissez le montant versé par le patient. Reste à payer :{" "}
                {selectedInvoice
                  ? formatCurrency(
                      selectedInvoice.total_amount -
                        selectedInvoice.paid_amount,
                    )
                  : 0}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Montant (FCFA)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  required
                  min="1"
                  max={
                    selectedInvoice
                      ? selectedInvoice.total_amount -
                        selectedInvoice.paid_amount
                      : undefined
                  }
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Mode de Règlement</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: string | null) => val && setPaymentMethod(val)}
                >
                  <SelectTrigger id="payment_method">
                    <SelectValue placeholder="Choisir un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte Bancaire / TPE</SelectItem>
                    <SelectItem value="transfer">Virement / Orange Money</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="insurance">Prise en charge (Mutuelle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentMenuOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer le paiement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleUpdateInvoice}>
            <DialogHeader>
              <DialogTitle>Modifier la Facture</DialogTitle>
              <DialogDescription>
                Modifiez les items ou les détails de l&apos;assurance.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
               <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Soin</Label>
                      <Select
                        value={selectedTreatmentId}
                        onValueChange={(val) => {
                          if (!val) return;
                          setSelectedTreatmentId(val);
                          if (val !== "custom") {
                            const t = treatmentCatalog.find(x => x.id === val);
                            if (t) setNewAmount(t.price.toString());
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un soin..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">-- Manuel --</SelectItem>
                          {treatmentCatalog.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                       <Label>Dent</Label>
                       <Input 
                        placeholder="N°" 
                        value={newItemTooth}
                        onChange={(e) => setNewItemTooth(e.target.value)}
                       />
                    </div>
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Montant</Label>
                      <Input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={() => {
                        if (!newAmount) return;
                        const t = treatmentCatalog.find(x => x.id === selectedTreatmentId);
                        setEditItems([...editItems, {
                          id: Math.random().toString(),
                          name: selectedTreatmentId === "custom" ? "Soin manuel" : (t?.name || ""),
                          price: Number(newAmount),
                          category: t?.category || "Général",
                          tooth_number: newItemTooth ? parseInt(newItemTooth) : undefined
                        }]);
                        setNewAmount("");
                        setNewItemTooth("");
                        setSelectedTreatmentId("custom");
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md divide-y max-h-[200px] overflow-auto">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          {item.tooth_number && <span className="ml-1 text-xs text-primary font-bold">({item.tooth_number})</span>}
                        </div>
                        <div className="font-bold mr-2">{formatCurrency(item.price)}</div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive"
                          onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>

                <div className="flex justify-between font-bold border-t pt-2">
                   <span>Nouveau Total :</span>
                   <span className="text-primary">{formatCurrency(editItems.reduce((s, i) => s + i.price, 0))}</span>
                </div>

                <div className="space-y-2">
                  <Label>Assurance / Mutuelle</Label>
                  <Input
                    value={editInsurance}
                    onChange={(e) => setEditInsurance(e.target.value)}
                  />
                </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-12 space-y-6">
        <div className="px-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historique des Règlements
          </h3>
          <p className="text-sm text-muted-foreground">Trace chronologique de tous les paiements reçus.</p>
        </div>

        {loadingPayments ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : patientPayments.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-slate-50/50 italic text-sm text-slate-400">
            Aucun paiement enregistré pour le moment.
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Mode</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patientPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <span className="capitalize px-2 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {p.payment_method === "cash" ? "Espèces" : 
                         p.payment_method === "card" ? "Carte" : 
                         p.payment_method === "transfer" ? "Vir./OM" : 
                         p.payment_method === "check" ? "Chèque" : "Mutuelle"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-slate-900">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
