export default function AdminExportsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exportations</h1>
        <p className="text-sm text-slate-600">Exports CSV opérationnels (admin).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <a href="/api/exports/patients" className="rounded-xl border bg-white p-4 hover:bg-slate-50">
          <p className="font-semibold">Export patients</p>
          <p className="text-sm text-slate-500">Télécharger les patients en CSV</p>
        </a>

        <a href="/api/exports/appointments" className="rounded-xl border bg-white p-4 hover:bg-slate-50">
          <p className="font-semibold">Export rendez-vous</p>
          <p className="text-sm text-slate-500">Télécharger les RDV en CSV</p>
        </a>

        <a href="/api/exports/finance" className="rounded-xl border bg-white p-4 hover:bg-slate-50">
          <p className="font-semibold">Export finance</p>
          <p className="text-sm text-slate-500">Factures, paiements, dépenses</p>
        </a>
      </div>
    </div>
  );
}
