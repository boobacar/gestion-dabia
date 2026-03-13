"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, QrCode, CheckCircle2, XCircle, RefreshCw, Smartphone, Send, Loader2, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { disconnectWhatsApp, sendTestMessage, initWhatsApp } from "@/app/actions/whatsapp";
import { WhatsAppHistory } from "@/components/WhatsAppHistory";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<"loading" | "qr" | "connected" | "error" | "disconnected">("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [profile, setProfile] = useState<{ role: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      if (!profile) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          setProfile(prof);
        }
      }

      const res = await fetch("/api/whatsapp/qr?t=" + Date.now());
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "qr") {
        setQrCode(data.qr);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setStatus("error");
    }
  }, [profile]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (status !== "loading" && profile && profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 uppercase font-black text-rose-500 text-xs tracking-widest">
          Accès Restreint
        </div>
        <h1 className="text-2xl font-black text-slate-900 font-outfit uppercase">
          Administration Uniquement
        </h1>
        <p className="text-slate-500 font-medium max-w-md">
          Désolé, seul le personnel de direction peut configurer l&apos;intégration WhatsApp de la clinique.
        </p>
      </div>
    );
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setStatus("loading");
    try {
      const res = await disconnectWhatsApp();
      if (res.success) {
        toast.success("WhatsApp déconnecté, réinitialisation...");
        // Wait a bit before first poll to let server start cleanup
        setTimeout(fetchStatus, 3000);
      } else {
        toast.error("Erreur de déconnexion");
        fetchStatus();
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testNumber) return toast.error("Entrez un numéro");
    setIsSending(true);
    try {
      const res = await sendTestMessage(testNumber, "Ceci est un message de test depuis DABIA Clinique ! 🦷");
      if (res.success) {
        toast.success("Message envoyé !");
      } else {
        toast.error(res.error || "Erreur d'envoi");
      }
    } catch (err: unknown) {
      console.error("Test message send failed:", err);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 font-outfit uppercase">
          Intégration <span className="text-primary italic">WhatsApp</span>
        </h1>
        <p className="text-slate-500 font-medium">
          Connectez le compte de la clinique pour automatiser les rappels de rendez-vous.
        </p>
      </div>

      {status === "connected" && (
        <div className="flex gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <Link href="/admin/settings/whatsapp/bulk">
            <Button className="bg-white border-2 border-slate-100 hover:border-primary/20 hover:bg-primary/5 text-slate-900 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl shadow-sm transition-all group">
              <Users className="w-4 h-4 mr-2 text-primary group-hover:scale-110 transition-transform" />
              Relance Inactifs
            </Button>
          </Link>
          <Link href="/admin/settings/whatsapp/broadcast">
            <Button className="bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all group">
              <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Diffusion de Masse (Broadcast)
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-12">
        {/* Status & Connection Card */}
        <Card className="md:col-span-12 lg:col-span-5 border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 border-b border-slate-800 p-8">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                status === "connected" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
              )}>
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    status === "connected" ? "bg-white" : "bg-white"
                  )}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                {status === "connected" ? "Connecté" : "En attente"}
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-white font-outfit uppercase mt-6 tracking-tight">
              Lien de l&apos;Appareil
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Synchronisez votre session pour activer les notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {status === "connected" ? (
              <div className="flex flex-col items-center py-10 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase font-outfit">Compte Lié avec Succès</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium max-w-[250px]">
                  L&apos;application DABIA peut maintenant envoyer des messages en votre nom.
                </p>
                <Button 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  variant="ghost" 
                  className="mt-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px] py-6"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Déconnecter l&apos;Appareil
                </Button>
              </div>
            ) : status === "qr" && qrCode ? (
              <div className="flex flex-col items-center animate-in fade-in duration-1000">
                <div className="relative p-6 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner group">
                  <div className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-white p-4 rounded-3xl shadow-2xl">
                    <Image src={qrCode} alt="QR Code" width={240} height={240} className="rounded-xl" />
                  </div>
                </div>
                
                <div className="mt-8 space-y-4 w-full">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">Comment se connecter ?</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                        Ouvrez WhatsApp sur votre téléphone &gt; Réglages &gt; Appareils liés &gt; Lier un appareil.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => { setIsRefreshing(true); fetchStatus().finally(() => setIsRefreshing(false)); }}
                      disabled={isRefreshing}
                      className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                    >
                      {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Actualiser
                    </Button>
                    <Button 
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      variant="outline"
                      className="h-12 rounded-xl border-slate-200 font-black uppercase tracking-widest text-[10px]"
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            ) : status === "error" ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase font-outfit">Erreur de Connexion</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Impossible de générer la session WhatsApp.
                </p>
                <Button 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="mt-6 font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            ) : status === "disconnected" ? (
              <div className="flex flex-col items-center py-10 text-center animate-pulse">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase font-outfit">Déconnecté</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Prêt pour une nouvelle connexion. 
                </p>
                <Button 
                  onClick={async () => {
                    setStatus("loading");
                    await initWhatsApp();
                    fetchStatus();
                  }}
                  disabled={isDisconnecting}
                  className="mt-6 font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Initialiser la session
                </Button>
              </div>
            ) : (
                <div className="flex flex-col items-center py-20 text-center animate-pulse">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Génération de la session...</p>
                <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase">Ceci peut prendre jusqu&apos;à 30 secondes</p>
                <Button 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  variant="ghost"
                  className="mt-6 h-8 text-slate-300 hover:text-primary font-black uppercase tracking-widest text-[9px]"
                >
                  Forcer la réinitialisation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration & Test Card */}
        <div className="md:col-span-12 lg:col-span-7 space-y-8">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-black font-outfit uppercase tracking-tight">Test d&apos;Envoi</CardTitle>
              </div>
              <CardDescription className="pt-2 font-medium">Vérifiez le bon fonctionnement de la connexion en envoyant un message de test.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Numéro de Téléphone (Format International)</label>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="e.g. 221770000000" 
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:bg-white transition-all text-sm"
                    />
                    <Button 
                      onClick={handleSendTest}
                      disabled={isSending || status !== "connected"}
                      className="h-12 px-8 rounded-xl bg-slate-900 border-none font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
                    </Button>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900 uppercase">Session Persistante</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Une fois connecté, DABIA gardera la session active même après un rafraîchissement de la page ou un redémarrage du serveur.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-primary/5 border border-primary/10">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 font-outfit uppercase tracking-tight">Automatisation Active</h4>
                  <p className="text-sm text-slate-500 font-medium">
                    Lorsqu&apos;un compte est lié, les confirmations de rendez-vous sont automatiquement envoyées aux patients.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 font-outfit uppercase">
            Historique des <span className="text-primary italic">Messages</span>
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Consultez et gérez les notifications envoyées automatiquement ou manuellement.
          </p>
        </div>
        <WhatsAppHistory />
      </div>
    </div>
  );
}
