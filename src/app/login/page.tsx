"use client";

import { useState } from "react";
import Image from "next/image";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result && "error" in result && result.error) {
      toast.error(result.error === "Invalid login credentials" 
        ? "Identifiants invalides. Veuillez réessayer." 
        : result.error
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-16 w-16 mb-4 overflow-hidden rounded-2xl border border-white shadow-xl bg-white p-2">
            <Image
              src="/logo.jpg"
              alt="DABIA Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">DABIA Gestion</h1>
          <p className="text-slate-500 font-medium text-sm">Administration de la Clinique Dentaire</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">Connexion</CardTitle>
            <CardDescription className="text-slate-500">
              Entrez vos identifiants pour accéder au tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="nom@exemple.com" 
                    required 
                    className="pl-10 h-11 bg-white/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    required 
                    className="pl-10 h-11 bg-white/50"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-slate-400 text-xs font-medium uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Clinique Dentaire DABIA
        </p>
      </div>
    </div>
  );
}
