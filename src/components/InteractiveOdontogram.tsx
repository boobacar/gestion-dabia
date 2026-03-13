"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Save, AlertCircle, FileText, Loader2 } from "lucide-react";

// Teeth numbering (ISO 3950 system)
const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
};

const CONDITIONS = [
  { value: "healthy", label: "Saine", fill: "#ffffff", stroke: "#cbd5e1" },
  { value: "caries", label: "Carie", fill: "#fecaca", stroke: "#ef4444" },
  {
    value: "filling",
    label: "Plombage/Composite",
    fill: "#bfdbfe",
    stroke: "#3b82f6",
  },
  {
    value: "crown",
    label: "Couronne",
    fill: "#e9d5ff",
    stroke: "#a855f7",
  },
  {
    value: "missing",
    label: "Absente",
    fill: "#f1f5f9",
    stroke: "#cbd5e1",
    opacity: 0.4,
  },
  {
    value: "implant",
    label: "Implant",
    fill: "#fef3c7",
    stroke: "#f59e0b",
  },
  {
    value: "to_extract",
    label: "À extraire",
    fill: "#fef2f2",
    stroke: "#ef4444",
    dasharray: "8 4",
  },
];

const CONDITION_PRICES: Record<string, number> = {
  caries: 15000,
  filling: 25000,
  crown: 150000,
  missing: 0,
  implant: 400000,
  to_extract: 20000,
  healthy: 0,
};

interface Treatment {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface OdontogramProps {
  patientId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialRecords?: any[];
}

export function InteractiveOdontogram({
  patientId,
  initialRecords = [],
}: OdontogramProps) {
  const supabase = createClient();

  // State for tooth conditions Map<toothNumber, conditionValue>
  const [toothConditions, setToothConditions] = useState<
    Record<number, string>
  >(() => {
    const initial: Record<number, string> = {};
    initialRecords.forEach((record) => {
      initial[record.tooth_number] = record.condition;
    });
    return initial;
  });

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [currentCondition, setCurrentCondition] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [catalog, setCatalog] = useState<Treatment[]>([]);
  const router = useRouter();

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase.from("treatment_catalog").select("*");
    if (data) setCatalog(data);
  }, [supabase]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleToothClick = (number: number) => {
    setSelectedTooth(number);
    setCurrentCondition(toothConditions[number] || "healthy");

    // Find notes if they exist in initial records
    const record = initialRecords.find((r) => r.tooth_number === number);
    setNotes(record?.notes || "");
  };

  const handleSaveCondition = async () => {
    if (!selectedTooth || !currentCondition) return;

    setIsSaving(true);
    try {
      // Optimistic URL update local state
      setToothConditions((prev) => ({
        ...prev,
        [selectedTooth]: currentCondition,
      }));

      const { error } = await supabase.from("odontogram_records").insert({
        patient_id: patientId,
        tooth_number: selectedTooth,
        condition: currentCondition,
        notes: notes,
      });

      if (error) throw error;

      toast.success(`Dent ${selectedTooth} mise à jour.`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Erreur lors de la sauvegarde: " + errMsg);
      console.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    // Filter out healthy conditions
    const treatments = Object.entries(toothConditions).filter(
      ([, condition]) => condition !== "healthy" && condition !== "missing"
    );

    if (treatments.length === 0) {
      toast.error("Aucun soin facturable dans l'odontogramme.");
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      const invoiceItems = treatments.map(([toothString, conditionValue]) => {
        const conditionConfig = CONDITIONS.find(c => c.value === conditionValue);
        const label = conditionConfig ? conditionConfig.label : conditionValue;
        
        // Try to find price in catalog first, then fallback to hardcoded
        const catalogItem = catalog.find(t => 
          t.name.toLowerCase().includes(label.toLowerCase()) || 
          label.toLowerCase().includes(t.name.toLowerCase())
        );
        
        const price = catalogItem ? catalogItem.price : (CONDITION_PRICES[conditionValue] || 0);
        const category = catalogItem ? catalogItem.category : "Soins Dentaires";

        return {
          tooth_number: parseInt(toothString),
          condition: label,
          price: price,
          category: category
        };
      });

      const totalAmount = invoiceItems.reduce((acc, item) => acc + item.price, 0);

      const { data: newInvoice, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: patientId,
          total_amount: totalAmount,
          paid_amount: 0,
          status: "pending",
          invoice_items: invoiceItems,
          insurance_coverage_amount: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase Error Details:", error);
        throw new Error(error.message);
      }

      toast.success(
        `Devis généré avec succès (${new Intl.NumberFormat("fr-SN", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(totalAmount)}) !`
      );
      
      router.refresh();
      setSelectedTooth(null);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error("Échec de la génération: " + errMsg);
      console.error("Invoice Generation Failed:", error);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const getToothStyle = (number: number) => {
    const condition = toothConditions[number] || "healthy";
    const match =
      CONDITIONS.find((c) => c.value === condition) || CONDITIONS[0];
    return {
      fill: match.fill,
      stroke: match.stroke,
      opacity: match.opacity || 1,
      strokeDasharray: match.dasharray || "none",
    };
  };

  const ToothSvg = ({
    className,
    styleProps,
  }: {
    className?: string;
    styleProps: {
      fill: string;
      stroke: string;
      opacity: number;
      strokeDasharray: string;
    };
  }) => (
    <svg
      viewBox="0 0 100 120"
      className={`${className} transition-all duration-300`}
      style={{
        fill: styleProps.fill,
        stroke: styleProps.stroke,
        opacity: styleProps.opacity,
        strokeDasharray: styleProps.strokeDasharray,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25,20 
           C10,20 5,40 10,55 
           C15,70 20,70 25,85 
           C28,95 35,110 40,110 
           C43,110 48,95 50,85 
           C52,95 57,110 60,110 
           C65,110 72,95 75,85 
           C80,70 85,70 90,55 
           C95,40 90,20 75,20 
           C65,20 55,25 50,30 
           C45,25 35,20 25,20 Z"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );

  const ToothButton = ({ number }: { number: number }) => {
    const isUpper =
      String(number).startsWith("1") || String(number).startsWith("2");

    return (
      <div className="flex flex-col items-center justify-center gap-1">
        {isUpper && (
          <span className="text-[10px] mb-2 sm:text-xs font-bold text-slate-500">
            {number}
          </span>
        )}
        <button
          onClick={() => handleToothClick(number)}
          className={`
            relative flex items-center justify-center 
            w-7 h-9 sm:w-8 sm:h-12 
            transition-all outline-none rounded-md
            hover:scale-110
            ${selectedTooth === number ? "scale-110 drop-shadow-md ring-2 ring-primary ring-offset-4" : "drop-shadow-sm"}
          `}
          title={`Dent ${number}`}
        >
          <ToothSvg
            className={`w-8 h-full  ${isUpper ? "rotate-180" : ""}`}
            styleProps={getToothStyle(number)}
          />
        </button>
        {!isUpper && (
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
            {number}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Odontogramme Interactif</CardTitle>
          <CardDescription>
            Cliquez sur une dent pour modifier son état clinique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 p-6 rounded-xl border flex flex-col items-center justify-center min-w-max mx-auto overflow-x-auto">
            {/* Upper Jaw */}
            <div className="mb-4 text-center font-semibold text-slate-500 border-b w-full pb-2">
              Maxillaire supérieur
            </div>
            <div className="flex gap-2 sm:gap-4 justify-center mb-8">
              <div className="flex gap-1 sm:gap-1.5">
                {ADULT_TEETH.upperRight.map((num) => (
                  <ToothButton key={num} number={num} />
                ))}
              </div>
              <div className="w-1 sm:w-2 border-l-2 border-slate-300"></div>
              <div className="flex gap-1 sm:gap-1.5">
                {ADULT_TEETH.upperLeft.map((num) => (
                  <ToothButton key={num} number={num} />
                ))}
              </div>
            </div>

            {/* Lower Jaw */}
            <div className="flex gap-2 sm:gap-4 justify-center mt-8">
              <div className="flex gap-1 sm:gap-1.5">
                {[...ADULT_TEETH.lowerRight].reverse().map((num) => (
                  <ToothButton key={num} number={num} />
                ))}
              </div>
              <div className="w-1 sm:w-2 border-l-2 border-slate-300"></div>
              <div className="flex gap-1 sm:gap-1.5">
                {ADULT_TEETH.lowerLeft.map((num) => (
                  <ToothButton key={num} number={num} />
                ))}
              </div>
            </div>
            <div className="mt-4 text-center font-semibold text-slate-500 border-t w-full pt-2">
              Maxillaire inférieur
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 p-4 bg-slate-50 rounded-lg text-sm border">
            {CONDITIONS.map((c) => (
              <div key={c.value} className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-sm border`}
                  style={{ backgroundColor: c.fill, borderColor: c.stroke }}
                ></div>
                <span className="text-slate-600">{c.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor Panel */}
      <Card className="w-full xl:w-[350px] shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Inspecteur
            {selectedTooth && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-sm">
                Dent {selectedTooth}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {selectedTooth ? "Modifiez le diagnostic" : "Sélectionnez une dent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedTooth ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>État clinique</Label>
                <Select
                  value={currentCondition}
                  onValueChange={(val) => setCurrentCondition(val || "")}
                >
                  <SelectTrigger>
                    {currentCondition ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full border`}
                          style={{
                            backgroundColor: CONDITIONS.find((c) => c.value === currentCondition)?.fill,
                            borderColor: CONDITIONS.find((c) => c.value === currentCondition)?.stroke,
                          }}
                        ></div>
                        <span>
                          {CONDITIONS.find((c) => c.value === currentCondition)?.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Sélectionner l&apos;état...
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full border`}
                            style={{
                              backgroundColor: c.fill,
                              borderColor: c.stroke,
                            }}
                          ></div>
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes & Actes</Label>
                <Textarea
                  placeholder="Détails de l'intervention, matériaux utilisés..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSaveCondition}
                disabled={isSaving}
              >
                {isSaving ? (
                  "Enregistrement..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer la dent {selectedTooth}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-6">
              <AlertCircle className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-sm">
                Cliquez sur une dent dans l&apos;odontogramme pour voir et
                modifier ses détails.
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-2">Facturation</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Compilez les soins enregistrés sur l&apos;odontogramme en un nouveau devis/facture.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
            >
              {isGeneratingInvoice ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Générer Devis/Facture
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
