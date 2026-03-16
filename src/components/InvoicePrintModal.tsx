"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceRecord } from "@/components/PatientInvoices";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";
import { sendInvoiceWhatsApp } from "@/app/actions/whatsapp";
import { toast } from "sonner";

interface InvoicePrintModalProps {
  invoice: InvoiceRecord;
  patientName: string;
  patientNumber: string;
  patientPhone: string;
}

export function InvoicePrintModal({
  invoice,
  patientName,
  patientNumber,
  patientPhone,
}: InvoicePrintModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [clinicSettings, setClinicSettings] = React.useState<{
    name?: string;
    specialty?: string;
    address?: string;
    phone?: string;
    email?: string;
    ninea?: string;
    rc_number?: string;
    legal_status?: string;
  } | null>(null);

  const fetchClinicSettings = React.useCallback(async () => {
    try {
      const { data } = await supabase
        .from("clinic_settings")
        .select("*")
        .single();
      if (data) setClinicSettings(data);
    } catch (err) {
      console.error("Error fetching clinic settings:", err);
    }
  }, [supabase]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Facture_${patientName.replace(/\s+/g, "_")}_${format(
      new Date(invoice.created_at),
      "ddMMyyyy",
    )}`,
  });
 
  const [isSendingWA, setIsSendingWA] = React.useState(false);
  const [isLinkingDoc, setIsLinkingDoc] = React.useState(false);
  const [isLinkingQuoteDoc, setIsLinkingQuoteDoc] = React.useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = React.useState(false);
  const [isDownloadingQuote, setIsDownloadingQuote] = React.useState(false);

  const generatePreviewPdf = async () => {
    if (!componentRef.current) {
      throw new Error("Erreur d'aperçu PDF");
    }

    const element = componentRef.current;
    const imgData = await toJpeg(element, {
      pixelRatio: 2,
      backgroundColor: "white",
      cacheBust: true,
      quality: 0.9,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    return pdf;
  };

  const downloadStyledPdf = async (kind: "invoice" | "quote") => {
    const setLoading = kind === "invoice" ? setIsDownloadingInvoice : setIsDownloadingQuote;
    setLoading(true);
    try {
      const pdf = await generatePreviewPdf();
      const date = format(new Date(invoice.created_at), "ddMMyyyy");
      const safeName = patientName.replace(/\s+/g, "_");
      const fileName = kind === "invoice"
        ? `Facture_${safeName}_${date}.pdf`
        : `Devis_${safeName}_${date}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Échec du téléchargement PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSend = async () => {
    if (!patientPhone) {
      toast.error("Numéro de téléphone manquant ou erreur d'aperçu");
      return;
    }

    setIsSendingWA(true);
    const toastId = toast.loading("Génération du PDF et envoi...");

    try {
      const pdf = await generatePreviewPdf();
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
      const fileName = `Facture_${patientName.replace(/\s+/g, "_")}.pdf`;

      const res = await sendInvoiceWhatsApp(
        patientPhone,
        pdfBase64,
        fileName,
        invoice.patient_id as string
      );

      if (res.success) {
        toast.success("Facture envoyée sur WhatsApp !", { id: toastId });
      } else {
        toast.error(res.error || "Erreur lors de l'envoi", { id: toastId });
      }
    } catch (err) {
      console.error("PDF/WA Error:", err);
      toast.error("Échec de la génération ou de l'envoi", { id: toastId });
    } finally {
      setIsSendingWA(false);
    }
  };

  const toBase64 = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const handleAddToDocuments = async () => {
    setIsLinkingDoc(true);
    const toastId = toast.loading("Ajout du document en cours...");
    try {
      const pdf = await generatePreviewPdf();
      const blob = pdf.output("blob");
      const pdfBase64 = await toBase64(blob);

      const res = await fetch(`/api/documents/from-invoice/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur inconnue");
      toast.success("Ajouté aux documents du patient", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec ajout document", { id: toastId });
    } finally {
      setIsLinkingDoc(false);
    }
  };

  const handleAddQuoteToDocuments = async () => {
    setIsLinkingQuoteDoc(true);
    const toastId = toast.loading("Ajout du devis en cours...");
    try {
      const pdf = await generatePreviewPdf();
      const blob = pdf.output("blob");
      const pdfBase64 = await toBase64(blob);

      const res = await fetch(`/api/documents/from-quote/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur inconnue");
      toast.success("Devis ajouté aux documents du patient", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec ajout devis", { id: toastId });
    } finally {
      setIsLinkingQuoteDoc(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
    }).format(amount);
  };


  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button 
            variant="ghost" 
            size="icon" 
            title="Ouvrir la facture PDF"
            onClick={() => fetchClinicSettings()}
          >
            <Download className="w-4 h-4 text-primary" />
          </Button>
        }
      />
      <DialogContent className="max-w-[95vw] sm:max-w-[250mm] max-h-[90vh] overflow-y-auto w-full p-4 sm:p-6">
        <DialogTitle className="sr-only">Aperçu de la facture</DialogTitle>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Aperçu avant impression
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => downloadStyledPdf("invoice")}
              disabled={isDownloadingInvoice}
            >
              <Download className="w-4 h-4" />
              {isDownloadingInvoice ? "Téléchargement..." : "Télécharger Facture"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => downloadStyledPdf("quote")}
              disabled={isDownloadingQuote}
            >
              <Download className="w-4 h-4" />
              {isDownloadingQuote ? "Téléchargement..." : "Télécharger Devis"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAddToDocuments}
              disabled={isLinkingDoc}
            >
              <FileText className="w-4 h-4" />
              {isLinkingDoc ? "Ajout..." : "Ajouter facture aux documents"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAddQuoteToDocuments}
              disabled={isLinkingQuoteDoc}
            >
              <FileText className="w-4 h-4" />
              {isLinkingQuoteDoc ? "Ajout..." : "Ajouter devis aux documents"}
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </Button>
            <Button
              onClick={handleWhatsAppSend}
              disabled={isSendingWA}
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
            >
              {isSendingWA ? <span className="animate-spin">🌀</span> : <Send className="w-4 h-4" />}
              Envoyer par WhatsApp
            </Button>
          </div>
        </div>

        {/* The Printable Area */}
        <div className="bg-slate-200 p-2 sm:p-8 rounded-lg flex justify-center shadow-inner overflow-x-auto">
          {/* A4 Container */}
          <div
            ref={componentRef}
            id="invoice-printable-area"
            className="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[20mm] shadow-lg shrink-0 origin-top overflow-hidden"
            style={{
              fontFamily: "sans-serif",
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-primary pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black text-primary tracking-tight mb-2">
                  {clinicSettings?.name || "DABIA"}
                </h1>
                <h2 className="text-lg font-bold text-slate-700">
                  {clinicSettings?.specialty || "CLINIQUE DENTAIRE"}
                </h2>
                <div className="text-sm text-slate-500 mt-2 space-y-1">
                  <p>{clinicSettings?.address || "123 Rue de la Santé, Dakar, Sénégal"}</p>
                  <p>Tél : {clinicSettings?.phone || "+221 33 000 00 00"}</p>
                  <p>Email : {clinicSettings?.email || "contact@clinique-dabia.sn"}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold text-slate-800 uppercase">
                  {invoice.total_amount === invoice.paid_amount
                    ? "Facture"
                    : "Devis / Facture"}
                </h3>
                <p className="text-sm font-semibold text-slate-500 mt-2">
                  Réf: {invoice.id.split("-")[0].toUpperCase()}
                </p>
                <p className="text-sm text-slate-500">
                  Date :{" "}
                  {format(new Date(invoice.created_at), "dd MMMM yyyy", {
                    locale: fr,
                  })}
                </p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="flex justify-end mb-12">
              <div className="bg-slate-50 p-6 rounded-lg border w-1/2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Informations du Patient
                </h4>
                <p className="font-bold text-lg text-slate-800">
                  {patientName}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  N° Patient : {patientNumber}
                </p>
                <p className="text-sm text-slate-600">
                  Téléphone : {patientPhone || "Non renseigné"}
                </p>
                {(invoice.insurance_companies?.name || invoice.insurance_company_id) && (
                  <p className="text-sm text-primary font-medium mt-2">
                    Mutuelle :{" "}
                    {invoice.insurance_companies?.name || "Mutuelle"}
                  </p>
                )}
              </div>
            </div>

            {/* Details Table */}
            <div className="mb-12 min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="py-3 px-2 font-semibold text-slate-700">
                      Description des Soins
                    </th>
                    <th className="py-3 px-2 font-semibold text-slate-700 text-right">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(invoice.invoice_items) &&
                  invoice.invoice_items.length > 0 ? (
                    invoice.invoice_items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-4 px-2 text-slate-800">
                          {item.condition}
                          {item.tooth_number ? (
                            <span className="ml-2 text-xs font-bold text-primary">
                              (Dent {item.tooth_number})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-4 px-2 text-slate-800 text-right font-medium">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-slate-100">
                      <td className="py-4 px-2 text-slate-800">
                        Honoraires de soins dentaires{" "}
                        {invoice.appointment_id ? "(Suite au rendez-vous)" : ""}
                      </td>
                      <td className="py-4 px-2 text-slate-800 text-right font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mb-16">
              <div className="w-1/2">
                <div className="flex justify-between py-2 text-slate-600">
                  <span>Sous-total:</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
                {invoice.insurance_coverage_amount ? (
                  <div className="flex justify-between py-2 text-blue-600 font-medium">
                    <span>Prise en charge mutuelle:</span>
                    <span>- {formatCurrency(invoice.insurance_coverage_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-2 text-slate-600">
                  <span>Acompte versé:</span>
                  <span className="text-green-600">
                    - {formatCurrency(invoice.paid_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-800 font-bold text-xl text-slate-900">
                  <span>Reste à payer:</span>
                  <span
                    className={
                      (invoice.total_amount - (invoice.paid_amount || 0) - (invoice.insurance_coverage_amount || 0)) > 0 
                      ? "text-amber-600" 
                      : "text-green-600"
                    }
                  >
                    {formatCurrency(
                      invoice.total_amount - (invoice.paid_amount || 0) - (invoice.insurance_coverage_amount || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
              <p>
                {clinicSettings?.name || "Clinique Dentaire DABIA"} - {clinicSettings?.legal_status || "SARL au capital de 1 000 000 FCFA"}
              </p>
              <p>
                NINEA: {clinicSettings?.ninea || "000000000000"} - RC: {clinicSettings?.rc_number || "SN-DKR-2023-B-00000"}
              </p>
              <p className="mt-4 italic">
                En cas de retard de paiement, des pénalités pourront être
                appliquées.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
