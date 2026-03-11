import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, DollarSign } from "lucide-react";
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
          <h1 className="text-3xl font-bold tracking-tight">
            Stocks & Inventaire
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez les consommables de la clinique et surveillez les niveaux
            critiques.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventaire Global</CardTitle>
              <CardDescription>
                Catalogue de tous vos consommables médicaux et fournitures.
              </CardDescription>
            </div>
            {/* Action handled within the client component or a modal trigger here */}
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-red-500">
                Erreur de chargement des stocks.
              </p>
            ) : (
              <InventoryList initialData={inventory || []} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Valeur Totale du Stock
              </CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Capital immobilisé en consommables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertes de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criticalItems.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Tous les stocks sont à niveau.
                </div>
              ) : (
                <div className="space-y-4">
                  {criticalItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 border border-amber-200 bg-amber-50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-amber-700">
                          Reste: {item.quantity_in_stock} (Seuil:{" "}
                          {item.critical_threshold})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
