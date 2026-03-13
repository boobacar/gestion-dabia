"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Filter, 
  TrendingDown, 
  DollarSign,
  Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addExpense, deleteExpense } from "@/app/actions/expenses";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "Loyer",
  "Salaires",
  "Consommables",
  "Électricité",
  "Eau",
  "Télécoms",
  "Maintenance",
  "Marketing",
  "Assurances",
  "Impôts",
  "Autre"
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "transfer", label: "Virement" },
  { value: "check", label: "Chèque" },
  { value: "card", label: "Carte" }
];

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  expense_date: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "Autre",
    payment_method: "cash",
    expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  const supabase = createClient();

  const fetchExpenses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des dépenses");
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchExpenses(false);
  }, [fetchExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    const res = await addExpense({
      ...formData,
      amount: Number(formData.amount),
    });

    if (res.success) {
      toast.success("Dépense enregistrée");
      setIsDialogOpen(false);
      setFormData({
        description: "",
        amount: "",
        category: "Autre",
        payment_method: "cash",
        expense_date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchExpenses(true);
    } else {
      toast.error(res.error || "Une erreur est survenue");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteExpense(id);
    if (res.success) {
      toast.success("Dépense supprimée");
      fetchExpenses(true);
    } else {
      toast.error(res.error || "Erreur lors de la suppression");
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Comptabilité</h1>
          <p className="text-slate-500 font-medium">Gestion et suivi des dépenses du cabinet.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="font-bold" />}>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Dépense
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enregistrer une dépense</DialogTitle>
              <DialogDescription>
                Saisissez les détails de la dépense pour le suivi comptable.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-rose-500">*</span></Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Facture d'électricité Janvier"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (FCFA) <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="amount" 
                    type="number"
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={formData.expense_date} 
                    onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => {
                      if (val) setFormData({...formData, category: val as string});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paiement</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(val) => {
                      if (val) setFormData({...formData, payment_method: val as string});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(pm => (
                        <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer la dépense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-linear-to-br from-white to-slate-50 relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Dépenses (Vue actuelle)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{formatCurrency(totalAmount)}</div>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Basé sur les filtres appliqués</p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filtres & Recherche
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-10" 
                placeholder="Rechercher par description ou catégorie..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-white">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Historique des Dépenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="font-bold">Catégorie</TableHead>
                  <TableHead className="font-bold">Méthode</TableHead>
                  <TableHead className="font-bold text-right">Montant</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                      Chargement des dépenses...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                      Aucune dépense trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(exp.expense_date), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">{exp.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">{exp.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-tighter">
                          {PAYMENT_METHODS.find(m => m.value === exp.payment_method)?.label || exp.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-600">
                        {formatCurrency(exp.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                            />
                          }>
                            <Trash2 className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La dépense &quot;{exp.description}&quot; sera définitivement supprimée de la comptabilité.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(exp.id)}
                                className="bg-rose-600 hover:bg-rose-700 font-bold"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
