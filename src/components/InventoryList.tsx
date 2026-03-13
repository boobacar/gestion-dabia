"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Search, Edit2, AlertCircle, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const INVENTORY_CATEGORIES = [
  "Anesthésie & Seringues",
  "Usage unique & Protection",
  "Restaurateur & Prothèse",
  "Hygiène & Stérilisation",
  "Petit matériel & Instrumentation",
  "Chirurgie & Sutures",
  "Orthodontie",
  "Implantologie",
  "Autre",
];

export type InventoryItem = {
  id: string;
  item_name: string;
  category: string;
  quantity_in_stock: number;
  critical_threshold: number;
  unit_price?: number;
  last_restocked?: string;
};

interface InventoryListProps {
  initialData: InventoryItem[];
}

export function InventoryList({ initialData }: InventoryListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<InventoryItem[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    quantity_in_stock: "0",
    critical_threshold: "10",
    unit_price: "0",
  });

  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_name: item.item_name,
        category: item.category || "",
        quantity_in_stock: item.quantity_in_stock.toString(),
        critical_threshold: item.critical_threshold.toString(),
        unit_price: (item.unit_price || 0).toString(),
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_name: "",
        category: "",
        quantity_in_stock: "0",
        critical_threshold: "10",
        unit_price: "0",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      item_name: formData.item_name,
      category: formData.category,
      quantity_in_stock: Number(formData.quantity_in_stock),
      critical_threshold: Number(formData.critical_threshold),
      unit_price: Number(formData.unit_price),
      last_restocked: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from("inventory")
          .update(payload)
          .eq("id", editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
        toast.success("Article mis à jour.");
      } else {
        const { data, error } = await supabase
          .from("inventory")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setItems([...items, data]);
        toast.success("Nouvel article ajouté au stock.");
      }
      setIsDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      console.error(err);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdjust = async (item: InventoryItem, change: number) => {
    const newQuantity = Math.max(0, item.quantity_in_stock + change);
    try {
      const { data, error } = await supabase
        .from("inventory")
        .update({ quantity_in_stock: newQuantity })
        .eq("id", item.id)
        .select()
        .single();
      if (error) throw error;
      setItems(items.map((i) => (i.id === item.id ? data : i)));
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour du stock.");
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Confirmer la suppression de "${item.item_name}" ?`)) return;
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", item.id);
      if (error) throw error;
      setItems(items.filter((i) => i.id !== item.id));
      toast.success("Article supprimé.");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 border-b border-slate-100">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un composant..."
            className="pl-10 h-10 bg-white shadow-sm border-slate-200 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button
                className="h-10 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-2" /> Nouveau Produit
              </Button>
            }
          />
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-outfit">
                  {editingItem ? "Modifier l'article" : "Nouveau Produit"}
                </DialogTitle>
                <DialogDescription>
                  Détails du consommable médical ou fourniture.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name" className="text-xs font-black uppercase tracking-wider text-slate-500">Nom du Produit</Label>
                  <Input
                    id="item_name"
                    required
                    placeholder="Ex: Gants examen, Composite A2..."
                    className="h-10 border-slate-200"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-black uppercase tracking-wider text-slate-500">Catégorie</Label>
                  <Select
                    value={formData.category ? formData.category : "Autre"}
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val || "Autre" })
                    }
                  >
                    <SelectTrigger id="category" className="h-10 border-slate-200">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-xs font-black uppercase tracking-wider text-slate-500">Stock Initial</Label>
                    <Input
                      id="quantity"
                      type="number"
                      required
                      min="0"
                      className="h-10 border-slate-200"
                      value={formData.quantity_in_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_in_stock: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="critical" className="text-xs font-black uppercase tracking-wider text-amber-600">Seuil d&apos;Alerte</Label>
                    <Input
                      id="critical"
                      type="number"
                      required
                      min="1"
                      className="h-10 border-slate-200 focus-visible:ring-amber-200"
                      value={formData.critical_threshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          critical_threshold: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price" className="text-xs font-black uppercase tracking-wider text-slate-500">Prix Unitaire (FCFA)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    className="h-10 border-slate-200"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit_price: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="font-bold text-slate-500"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting} className="px-6 font-bold shadow-lg shadow-primary/20">
                  {isSubmitting ? "Enregistrement..." : "Enregistrer le produit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 pb-2">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Article</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock Dispo.</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Valeur Totale</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Dernier réassort</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Outils</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isCritical = item.quantity_in_stock <= item.critical_threshold;
              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-all duration-200 group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.item_name}</span>
                      {isCritical && (
                        <span className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 border border-rose-100 animate-pulse">
                          <AlertCircle className="w-2.5 h-2.5" /> Bas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-tight">{item.category || "Général"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-transparent hover:border-rose-100 transition-all"
                        onClick={() => handleQuickAdjust(item, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-lg text-sm font-black min-w-12 text-center border shadow-sm",
                          isCritical
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}
                      >
                        {item.quantity_in_stock}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 border border-transparent hover:border-emerald-100 transition-all"
                        onClick={() => handleQuickAdjust(item, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-slate-900">{formatCurrency(item.quantity_in_stock * (item.unit_price || 0))}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-medium text-slate-400 uppercase">
                    {item.last_restocked
                      ? format(new Date(item.last_restocked), "dd MMM yyyy", {
                          locale: fr,
                        })
                      : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-400 italic"
                >
                  Aucun article trouvé dans l&apos;inventaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
