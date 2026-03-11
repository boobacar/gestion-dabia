import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Users,
  ArrowRight,
  CheckCircle,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format, parseISO, subMonths, startOfMonth as fnsStartOfMonth, endOfMonth as fnsEndOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { RevenueChart } from "@/components/RevenueChart";
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Total Patients
  const { count: totalPatients } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });

  // 2. Upcoming Appointments (Today onwards) - [Removed from KPI row to make space for advanced stats]


  // 3. Treatments recorded this month & last month
  const now = new Date();
  const startOfThisMonth = fnsStartOfMonth(now);
  const startOfLastMonth = fnsStartOfMonth(subMonths(now, 1));
  const endOfLastMonth = fnsEndOfMonth(subMonths(now, 1));

  const { data: treatmentsThisMonthData } = await supabase
    .from("odontogram_records")
    .select("condition, date_recorded")
    .gte("date_recorded", startOfThisMonth.toISOString());

  const { count: treatmentsLastMonth } = await supabase
    .from("odontogram_records")
    .select("*", { count: "exact", head: true })
    .gte("date_recorded", startOfLastMonth.toISOString())
    .lte("date_recorded", endOfLastMonth.toISOString());

  const treatmentsCount = treatmentsThisMonthData?.length || 0;

  // 4. Occupancy Rate (Cabinet Usage)
  // Logic: Sum of duration_minutes / Total capacity (e.g., 40h/week * 4 weeks = 160h = 9600m)
  const { data: monthAppointments } = await supabase
    .from("appointments")
    .select("duration_minutes")
    .gte("appointment_date", startOfThisMonth.toISOString())
    .lte("appointment_date", fnsEndOfMonth(now).toISOString())
    .neq("status", "cancelled");

  const totalBookedMinutes = monthAppointments?.reduce((acc, apt) => acc + (apt.duration_minutes || 0), 0) || 0;
  const totalCapacityMinutes = 160 * 60; // 160 hours per month
  const occupancyRate = Math.min(Math.round((totalBookedMinutes / totalCapacityMinutes) * 100), 100);

  // 5. Recent Patients
  const { data: recentPatients } = await supabase
    .from("patients")
    .select("id, first_name, last_name, patient_number, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // 6. Recent Invoices (Activity)
  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select(
      `
      id, 
      total_amount, 
      status, 
      created_at, 
      patients (
        first_name, 
        last_name
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(5);

  // 7. Calculate Monthly Revenue and Average Basket
  const { data: currentMonthInvoices } = await supabase
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .gte("created_at", startOfThisMonth.toISOString());

  const { data: lastMonthInvoices } = await supabase
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .gte("created_at", startOfLastMonth.toISOString())
    .lte("created_at", endOfLastMonth.toISOString());

  const currentMonthRevenue = currentMonthInvoices?.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) || 0;
  const lastMonthRevenue = lastMonthInvoices?.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) || 0;
  
  const revenueGrowth = lastMonthRevenue > 0 
    ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
    : 100;

  const averageBasket = currentMonthInvoices && currentMonthInvoices.length > 0 
    ? Math.round(currentMonthRevenue / currentMonthInvoices.length) 
    : 0;

  // 8. Global Outstanding Balance (Debt)
  const { data: allUnpaidInvoices } = await supabase
    .from("invoices")
    .select("total_amount, paid_amount")
    .neq("status", "paid");

  const globalDebt = allUnpaidInvoices?.reduce((acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0;

  // 9. Top Treatments
  const treatmentFreq: Record<string, number> = {};
  treatmentsThisMonthData?.forEach(t => {
    treatmentFreq[t.condition] = (treatmentFreq[t.condition] || 0) + 1;
  });
  
  const LABEL_MAP: Record<string, string> = {
    caries: "Carie",
    filling: "Plombage",
    crown: "Couronne",
    implant: "Implant",
    to_extract: "Extraction",
    healthy: "Contrôle",
    missing: "Absente",
  };

  const topTreatments = Object.entries(treatmentFreq)
    .map(([name, count]) => ({ 
      name: LABEL_MAP[name] || name, 
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 8. Generate chart data (last 6 months pseudo-real data)
  // To avoid complex group-by SQL, we fetch last 6 months of paid invoices and group them in JS
  const sixMonthsAgo = subMonths(new Date(), 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data: historicalInvoices } = await supabase
    .from("invoices")
    .select("created_at, paid_amount")
    .gte("created_at", sixMonthsAgo.toISOString());

  // Initialize 6 months buckets
  const revenueDataMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const monthKey = format(d, "MMM", { locale: fr });
    revenueDataMap.set(monthKey, 0);
  }

  if (historicalInvoices) {
    historicalInvoices.forEach((inv) => {
      const invDate = new Date(inv.created_at);
      const monthKey = format(invDate, "MMM", { locale: fr });
      if (revenueDataMap.has(monthKey)) {
        const amt = inv.paid_amount || 0;
        revenueDataMap.set(monthKey, revenueDataMap.get(monthKey) + amt);
      }
    });
  }

  const revenueData = Array.from(revenueDataMap, ([month, revenue]) => ({
    month,
    revenue,
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Tableau de Bord</h1>
        <p className="text-slate-500 font-medium">
          Aperçu de l&apos;activité de la clinique dentaire DABIA.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-linear-to-br from-white to-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
            <Users className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Patients Totaux
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{totalPatients || 0}</div>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Base de données complète</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-linear-to-br from-white to-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
            <PieChart className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Taux d&apos;Occupation
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <PieChart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{occupancyRate}%</div>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Capacité utilisée (160h/mois)</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-linear-to-br from-white to-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
            <Activity className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Soins (Ce mois)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{treatmentsCount}</div>
            <div className="flex items-center text-[10px] font-bold mt-1 uppercase">
              {treatmentsLastMonth && treatmentsCount > treatmentsLastMonth ? (
                <span className="text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> +{treatmentsCount - treatmentsLastMonth}
                </span>
              ) : treatmentsLastMonth && treatmentsCount < treatmentsLastMonth ? (
                <span className="text-rose-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" /> -{treatmentsLastMonth - treatmentsCount}
                </span>
              ) : (
                <span className="text-slate-400">Stable</span>
              )}
              <span className="text-slate-400 ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-linear-to-br from-white to-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
            <DollarSign className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Revenus Encaissés
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 truncate">
              {formatCurrency(currentMonthRevenue)}
            </div>
            <div className="flex items-center text-[10px] font-bold mt-1 uppercase">
              {revenueGrowth >= 0 ? (
                <span className="text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> {revenueGrowth}%
                </span>
              ) : (
                <span className="text-rose-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" /> {revenueGrowth}%
                </span>
              )}
              <span className="text-slate-400 ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageBasket)}</div>
            <p className="text-xs text-muted-foreground mt-1">Par facture ce mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reste à Recouvrer</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(globalDebt)}</div>
            <p className="text-xs text-muted-foreground mt-1">Créances patients globales</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 3 Soins Fréquents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mt-1">
              {topTreatments.length > 0 ? (
                topTreatments.map((t, idx) => (
                  <div key={idx} className="flex-1 p-2 bg-slate-50 rounded-md border flex flex-col items-center">
                    <span className="text-xs font-bold text-primary uppercase">{t.name}</span>
                    <span className="text-lg font-bold">{t.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">Pas encore de soins ce mois-ci</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
        {/* Chart spanning 4 columns */}
        <RevenueChart data={revenueData} />

        {/* Recent Invoices spanning 3 columns */}
        <Card className="col-span-1 lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Activité Financière Récente</CardTitle>
            <CardDescription>
              Aperçu des 5 dernières factures générées.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {recentInvoices && recentInvoices.length > 0 ? (
                recentInvoices.map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {inv.patients?.first_name} {inv.patients?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            parseISO(inv.created_at),
                            "dd MMM yyyy à HH:mm",
                            { locale: fr },
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                          {formatCurrency(inv.total_amount)}
                        </div>
                        {inv.status === "paid" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Derniers Patients Inscrits</CardTitle>
            <CardDescription>
              Les 5 derniers dossiers créés ou importés.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {recentPatients && recentPatients.length > 0 ? (
                recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        N° {patient.patient_number}
                      </p>
                    </div>
                    <Link
                      href={`/admin/patients/${patient.id}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun patient récent.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
