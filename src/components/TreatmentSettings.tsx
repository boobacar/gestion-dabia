"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, Loader2, Search, Stethoscope } from "lucide-react";

interface Treatment {
  id: string;
  name: string;
  category: string;
  price: number;
  code?: string;
}

const CATEGORIES = ["Général", "Soins", "Chirurgie", "Prothèse", "Orthodontie", "Implantologie"];

export function TreatmentSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Général",
    price: "",
  });

  const fetchTreatments = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("treatment_catalog")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setTreatments(data || []);
    } catch (err) {
      console.error("Error fetching treatments:", err);
      toast.error("Erreur lors du chargement des tarifs");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const handleOpenModal = (treatment?: Treatment) => {
    if (treatment) {
      setEditingId(treatment.id);
      setFormData({
        name: treatment.name,
        category: treatment.category,
        price: treatment.price.toString(),
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", category: "Général", price: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("treatment_catalog")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Soin mis à jour");
      } else {
        const { error } = await supabase
          .from("treatment_catalog")
          .insert([payload]);
        if (error) throw error;
        toast.success("Nouveau soin ajouté");
      }

      setIsModalOpen(false);
      fetchTreatments();
    } catch (err: unknown) {
      console.error("Error saving treatment:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce soin du catalogue ?")) return;

    try {
      const { error } = await supabase
        .from("treatment_catalog")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Soin supprimé");
      fetchTreatments();
    } catch (err) {
      console.error("Error deleting treatment:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredTreatments = treatments.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un soin..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2 w-full md:w-auto">
                <Plus className="h-4 w-4" /> Ajouter un Soin
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier le Soin" : "Ajouter un Nouveau Soin"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du Soin</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Détartrage complet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (XOF)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Ex: 25000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Catalogue des Tarifs
          </CardTitle>
          <CardDescription>
            Liste des actes médicaux et leurs tarifs de base.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Tarif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreatments.length > 0 ? (
                  filteredTreatments.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border border-slate-200">
                          {t.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {formatCurrency(t.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenModal(t)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                      Aucun soin trouvé dans le catalogue.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
