import { createClient } from "@/lib/supabase/server";
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
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { SearchForm } from "@/components/SearchForm";
import { TablePagination } from "@/components/TablePagination";
import { NewPatientModal } from "@/components/NewPatientModal";

export default async function PatientsListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const page =
    typeof searchParams?.page === "string"
      ? parseInt(searchParams.page, 10)
      : 1;
  const limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createClient();

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .order("patient_number", { ascending: true })
    .range(from, to);

  if (q) {
    const isNumeric = /^\d+$/.test(q);
    if (isNumeric) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_number.ilike.%${q}%,patient_number.eq.${q}`,
      );
    } else {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_number.ilike.%${q}%`,
      );
    }
  }

  const { data: patients, count, error } = await query;
  if (error) console.error("SUPABASE ERROR in /patients:", error);
  const totalPages = count ? Math.ceil(count / limit) : 1;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liste des Patients
          </h1>
          <p className="text-muted-foreground mt-2">
            Consultez les dossiers patients récents et effectuez des recherches.
          </p>
        </div>
        <div className="space-x-4">
          <Link
            href="/admin/import"
            className={buttonVariants({ variant: "outline" })}
          >
            Importer CSV
          </Link>
          <NewPatientModal />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle>Patients</CardTitle>
            <CardDescription>
              {error
                ? "Erreur lors du chargement des patients."
                : `${count || 0} résultats correspondants.`}
            </CardDescription>
          </div>
          <SearchForm />
        </CardHeader>
        <CardContent>
          {patients && patients.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Patient</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.patient_number}
                      </TableCell>
                      <TableCell>{patient.last_name}</TableCell>
                      <TableCell>{patient.first_name}</TableCell>
                      <TableCell>{patient.phone_number || "-"}</TableCell>
                      <TableCell>{patient.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/patients/${patient.id}`}
                          className={buttonVariants({
                            variant: "default",
                            size: "sm",
                          })}
                        >
                          Ouvrir le dossier
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination totalPages={totalPages} currentPage={page} />
            </>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              Aucun patient trouvé.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
