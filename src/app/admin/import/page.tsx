import { ImportCsv } from "@/components/ImportCsv";

export default function AdminImportPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Importation des Patients
        </h1>
        <p className="text-muted-foreground mt-2">
          Importez votre base de données existante au format CSV.
        </p>
      </div>

      <ImportCsv />
    </div>
  );
}
