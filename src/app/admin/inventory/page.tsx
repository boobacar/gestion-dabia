import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";
import { InventoryList } from "@/components/InventoryList";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: inventory, error } = await supabase
    .from("inventory")
    .select("*")
    .order("item_name", { ascending: true });

  const criticalItems =
    inventory?.filter(
      (item) => item.quantity_in_stock <= item.critical_threshold,
    ) || [];

  const totalValue = inventory?.reduce(
    (acc, item) => acc + item.quantity_in_stock * (item.unit_price || 0),
    0
  ) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">
            Stocks & Inventaire
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez les consommables de la clinique et surveillez les niveaux
            critiques.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary hover:bg-primary/95 transition-all duration-300 text-white border-none shadow-xl shadow-primary/10 overflow-hidden relative md:col-span-1">
          <div className="absolute right-[-10%] bottom-[-10%] rotate-12 opacity-10">
            <Package className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-white/70 font-medium">Valeur Totale du Stock</CardDescription>
            <CardTitle className="text-4xl font-black font-outfit leading-none">{formatCurrency(totalValue)}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full backdrop-blur-sm font-bold uppercase tracking-wider">Capital Immobilisé</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 hover:border-amber-200 transition-all duration-300 shadow-xl shadow-slate-200/50 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Alertes de Stock</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{criticalItems.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
              <AlertTriangle className="w-3 h-3" /> Articles à réapprovisionner
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 hover:border-emerald-200 transition-all duration-300 shadow-xl shadow-slate-200/50 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-medium">Nombre de Références</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 font-outfit leading-none">{inventory?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" /> Catalogue actif
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden bg-white/50 backdrop-blur-xl">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Inventaire Global</CardTitle>
                  <CardDescription>
                    Catalogue complet de vos consommables médicaux.
                  </CardDescription>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-rose-500 font-medium font-outfit">
                  Erreur de chargement des stocks.
                </p>
              </div>
            ) : (
              <InventoryList initialData={inventory || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
