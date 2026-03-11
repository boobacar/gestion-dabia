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
        // Update existing mapping
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
        // Create new item
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
      router.refresh(); // Refresh page metrics
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
    if (!confirm(`T'es sur que tu veux supprimer "${item.item_name}" ?`)) return;
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", item.id);
      if (error) throw error;
      setItems(items.filter((i) => i.id !== item.id));
      toast.success("Article supprimé de l'inventaire.");
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
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-background px-4 py-2 border-b -mx-6 -mt-6 rounded-t-xl mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un composant..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                className="inline-flex h-9"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-2" /> Nouveau Produit
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier l'article" : "Ajouter au stock"}
                </DialogTitle>
                <DialogDescription>
                  Remplissez les détails du produit consomable.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Nom du Produit</Label>
                  <Input
                    id="item_name"
                    required
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category ? formData.category : ""}
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val || "" })
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Sélectionnez une catégorie..." />
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
                    <Label htmlFor="quantity">Quantité en stock</Label>
                    <Input
                      id="quantity"
                      type="number"
                      required
                      min="0"
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
                    <Label htmlFor="critical">Seuil critique (Alerte)</Label>
                    <Input
                      id="critical"
                      type="number"
                      required
                      min="1"
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
                  <Label htmlFor="unit_price">Prix Unitaire (FCFA)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
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
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Article
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Catégorie
              </th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                Stock Dispo.
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Valeur Totale
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Dernier réassort
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {filteredItems.map((item) => {
              const isCritical =
                item.quantity_in_stock <= item.critical_threshold;
              return (
                <tr
                  key={item.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle font-medium">
                    <div className="flex items-center gap-2">
                      {item.item_name}
                      {isCritical && (
                        <span title="Stock critique!">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 align-middle text-muted-foreground">
                    {item.category || "-"}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuickAdjust(item, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium min-w-12 text-center ${
                          isCritical
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {item.quantity_in_stock}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuickAdjust(item, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-right font-medium">
                    {formatCurrency(item.quantity_in_stock * (item.unit_price || 0))}
                  </td>
                  <td className="p-4 align-middle text-right text-muted-foreground text-xs">
                    {item.last_restocked
                      ? format(new Date(item.last_restocked), "dd MMM yyyy", {
                          locale: fr,
                        })
                      : "Inconnu"}
                  </td>
                  <td className="p-4 align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Aucun article trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
