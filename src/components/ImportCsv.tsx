"use client";

import { useState } from "react";
import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EXPECTED_FIELDS = [
  { id: "patient_number", label: "Numéro Patient (Unique)" },
  { id: "first_name", label: "Prénom" },
  { id: "last_name", label: "Nom" },
  { id: "date_of_birth", label: "Date de Naissance" },
  { id: "phone_number", label: "Numéro de Téléphone" },
  { id: "email", label: "Email" },
  { id: "address", label: "Adresse" },
];

export function ImportCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const supabase = createClient();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (
      selectedFile.type !== "text/csv" &&
      !selectedFile.name.endsWith(".csv")
    ) {
      toast.error("Veuillez uploader un fichier CSV valide.");
      return;
    }

    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const headers = Object.keys(results.data[0] as object);
          setCsvHeaders(headers);
          setCsvPreview(results.data.slice(0, 5) as Record<string, string>[]);
          // Auto-map if possible based on similarity (basic)
          const newMappings: Record<string, string> = {};
          EXPECTED_FIELDS.forEach((field) => {
            const match = headers.find(
              (h) =>
                h.toLowerCase().includes(field.label.toLowerCase()) ||
                h.toLowerCase().includes(field.id.split("_")[0]),
            );
            if (match) newMappings[field.id] = match;
          });
          setMappings(newMappings);
        } else {
          toast.error("Le fichier CSV est vide.");
        }
      },
      error: (error) => {
        toast.error("Erreur lors du parsing : " + error.message);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const formattedData = rows.map((row) => {
          const patient: Record<string, string> = {};
          EXPECTED_FIELDS.forEach((field) => {
            const csvCol = mappings[field.id];
            if (csvCol && row[csvCol]) {
              let value = row[csvCol];
              if (field.id === "date_of_birth" && value) {
                const parsedDate = parse(value, "dd/MM/yyyy", new Date());
                if (isValid(parsedDate)) {
                  value = format(parsedDate, "yyyy-MM-dd");
                }
              }
              patient[field.id] = value;
            }
          });
          // Fallbacks for necessary fields
          if (!patient.first_name) patient.first_name = "Inconnu";
          if (!patient.last_name) {
            if (
              patient.first_name !== "Inconnu" &&
              patient.first_name.includes(" ")
            ) {
              const parts = patient.first_name.trim().split(" ");
              patient.last_name = parts[0];
              patient.first_name = parts.slice(1).join(" ");
            } else {
              patient.last_name = "Inconnu";
            }
          }
          if (!patient.patient_number)
            patient.patient_number = `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          return patient;
        });

        // Insert into Supabase
        const { error } = await supabase
          .from("patients")
          .upsert(formattedData, { onConflict: "patient_number" });

        if (error) {
          const errMsg =
            error instanceof Error
              ? error.message
              : error && typeof error === "object" && "message" in error
                ? String((error as Record<string, unknown>).message)
                : JSON.stringify(error, Object.getOwnPropertyNames(error));

          console.error("Supabase Error Full:", error);
          toast.error("Erreur de l'import : " + errMsg);
        } else {
          toast.success(
            `${formattedData.length} patients importés avec succès !`,
          );
          setFile(null);
          setCsvHeaders([]);
          setCsvPreview([]);
          setMappings({});
        }
        setIsImporting(false);
      },
      error: (error) => {
        toast.error("Erreur lors du parsing complet : " + error.message);
        setIsImporting(false);
      },
    });
  };

  return (
    <div className="space-y-8">
      {!file ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Uploader votre fichier CSV
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sélectionnez le fichier des patients exporté de votre ancien
              système
            </p>
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Sélectionner un fichier
              </div>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </Label>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className=" flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-5 h-5" />
                Mapping des colonnes
              </CardTitle>
              <CardDescription>
                Associez les colonnes de votre fichier CSV aux champs de la base
                de données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EXPECTED_FIELDS.map((field) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <Label className="text-right font-medium">
                      {field.label}
                    </Label>
                    <Select
                      value={mappings[field.id] || ""}
                      onValueChange={(val) =>
                        setMappings((prev) => {
                          const newMap = { ...prev };
                          newMap[field.id] = val as string;
                          return newMap;
                        })
                      }
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Ignorer ce champ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">-- Ignorer --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Aperçu des données ({csvPreview.length} premières lignes)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {EXPECTED_FIELDS.map((f) => (
                      <TableHead key={f.id}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, idx) => (
                    <TableRow key={idx}>
                      {EXPECTED_FIELDS.map((f) => (
                        <TableCell key={f.id}>
                          {mappings[f.id] ? row[mappings[f.id]] : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setFile(null)}>
              Annuler
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting
                ? "Importation en cours..."
                : "Confirmer l'importation"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
