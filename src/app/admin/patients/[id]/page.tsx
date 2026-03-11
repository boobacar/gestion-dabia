import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPatientModal } from "@/components/EditPatientModal";
import { NewAppointmentModal } from "@/components/NewAppointmentModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  FileText,
  Calendar,
  Stethoscope,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { notFound } from "next/navigation";
import { MedicalHistoryForm } from "@/components/MedicalHistoryForm";
import { PatientDocuments } from "@/components/PatientDocuments";
import { PatientInvoices } from "@/components/PatientInvoices";
import { PatientPrescriptions } from "@/components/PatientPrescriptions";
import { InteractiveOdontogram } from "@/components/InteractiveOdontogram";

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const tab =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : "dossier";
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !patient) {
    notFound();
  }

  // Fetch initial odontogram state
  const { data: odontogramRecords } = await supabase
    .from("odontogram_records")
    .select("*")
    .eq("patient_id", id)
    .order("date_recorded", { ascending: false });

  // Get most recent unique records per tooth
  const latestRecordsMap = new Map();
  if (odontogramRecords) {
    odontogramRecords.forEach((record) => {
      if (!latestRecordsMap.has(record.tooth_number)) {
        latestRecordsMap.set(record.tooth_number, record);
      }
    });
  }
  const initialOdontogramRecords = Array.from(latestRecordsMap.values());

  // Fetch invoices for patient
  const { data: patientInvoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  // Fetch prescriptions for patient
  const { data: patientPrescriptions } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  // Calculate age
  const age = patient.date_of_birth
    ? Math.floor(
        (new Date().getTime() - new Date(patient.date_of_birth).getTime()) /
          3.15576e10,
      )
    : "N/A";

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/patients"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-muted-foreground">
              Patient N° {patient.patient_number}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const history = patient.medical_history as Record<string, any>;
                const tags: string[] = Array.isArray(history?.tags)
                  ? history.tags
                  : [];
                if (tags.length === 0 && history?.notes) {
                  tags.push(history.notes);
                }
                return tags.map((t, idx) => (
                  <Badge key={idx} variant="destructive">
                    {t}
                  </Badge>
                ));
              })()}
            </div>
          </div>
        </div>
        <div className="space-x-4">
          <EditPatientModal patient={patient} />
          <NewAppointmentModal patientId={patient.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Âge</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {age} {age !== "N/A" && "ans"}
            </div>
            <p className="text-xs text-muted-foreground">
              Né(e) le{" "}
              {patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString()
                : "Inconnu"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {patient.phone_number || "Non renseigné"}
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              title={patient.email || ""}
            >
              {patient.email || "Pas d'email"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 p-1 bg-muted rounded-lg xl:inline-flex lg:w-fit">
          <TabsTrigger
            value="dossier"
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <FileText className="w-4 h-4" />
            Dossier (DMP)
          </TabsTrigger>
          <TabsTrigger value="odontogram" className="flex items-center gap-2 px-3 py-1.5">
            <Stethoscope className="w-4 h-4" /> Schéma Dentaire
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2 px-3 py-1.5">
            <Calendar className="w-4 h-4" /> Rendez-vous
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <FileText className="w-4 h-4" />
            Imagerie
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2 px-3 py-1.5">
            <Receipt className="w-4 h-4" /> Facturation
          </TabsTrigger>
          <TabsTrigger
            value="ordonnances"
            className="flex items-center gap-2 px-3 py-1.5"
          >
            <ClipboardList className="w-4 h-4" />
            Ordonnances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dossier" className="mt-6">
          <MedicalHistoryForm
            patientId={patient.id}
            initialHistory={patient.medical_history}
          />
        </TabsContent>

        <TabsContent value="odontogram" className="mt-6">
          <InteractiveOdontogram
            patientId={patient.id}
            initialRecords={initialOdontogramRecords}
          />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground italic">Liste des rendez-vous à implémenter.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <PatientDocuments patientId={patient.id} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <PatientInvoices
            patientId={patient.id}
            initialInvoices={patientInvoices || []}
            patientDetails={patient}
          />
        </TabsContent>

        <TabsContent value="ordonnances" className="mt-6">
          <PatientPrescriptions 
            patientId={patient.id}
            initialPrescriptions={patientPrescriptions || []}
            patientName={`${patient.first_name} ${patient.last_name}`}
            patientAge={age.toString()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
