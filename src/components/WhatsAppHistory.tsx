"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Search,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getWhatsAppLogs, deleteWhatsAppLog } from "@/app/actions/whatsapp";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WhatsAppLog = {
  id: string;
  category: "confirmation" | "reminder" | "debt_relance";
  recipient_phone: string;
  message_content: string;
  status: "sent" | "failed";
  error_message?: string;
  created_at: string;
  patients?: {
    first_name: string;
    last_name: string;
  };
};

export function WhatsAppHistory() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const res = await getWhatsAppLogs();
    if (res.success && res.logs) {
      setLogs(res.logs as WhatsAppLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (id: string) => {
    const res = await deleteWhatsAppLog(id);
    if (res.success) {
      toast.success("Log supprimé");
      setLogs(logs.filter(l => l.id !== id));
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "confirmation": return "Confirmation RDV";
      case "reminder": return "Rappel RDV";
      case "debt_relance": return "Relance Dette";
      default: return cat;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "all" || log.category === filter;
    const patientName = `${log.patients?.first_name} ${log.patients?.last_name}`.toLowerCase();
    const matchesSearch = patientName.includes(search.toLowerCase()) || 
                          log.recipient_phone.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex gap-4 items-end flex-1">
          <div className="space-y-2 flex-1 max-w-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              <Search className="w-3 h-3" /> Rechercher un patient
            </div>
            <Input 
              placeholder="Nom ou numéro..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="h-10 bg-white"
            />
          </div>
          
          <div className="space-y-2 w-48">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              <Filter className="w-3 h-3" /> Catégorie
            </div>
            <Select value={filter} onValueChange={(val) => setFilter(val || "all")}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="confirmation">Confirmation RDV</SelectItem>
                <SelectItem value="reminder">Rappel RDV</SelectItem>
                <SelectItem value="debt_relance">Relance Dette</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={fetchLogs} 
          disabled={loading}
          className="h-10 rounded-lg hover:bg-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Patient</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Numéro</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Catégorie</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-400 font-medium">
                  Aucun message trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {format(new Date(log.created_at), "d MMM, HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">
                      {log.patients ? `${log.patients.first_name} ${log.patients.last_name}` : "Inconnu"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-500">
                    +{log.recipient_phone}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      log.category === "confirmation" && "bg-blue-50 text-blue-600",
                      log.category === "reminder" && "bg-purple-50 text-purple-600",
                      log.category === "debt_relance" && "bg-orange-50 text-orange-600"
                    )}>
                      {getCategoryLabel(log.category)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.status === "sent" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Envoyé
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] uppercase tracking-wider group/err cursor-help relative" title={log.error_message}>
                        <XCircle className="w-3 h-3" /> Échec
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(log.id)}
                      className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
