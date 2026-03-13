"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, User, Save, Loader2, Stethoscope, Lock, Users, UserPlus, Trash2 } from "lucide-react";
import { TreatmentSettings } from "@/components/TreatmentSettings";
import { 
  adminCreateUser, 
  adminDeleteUser, 
  adminUpdateUserRole, 
  adminListUsers 
} from "./user-actions";

interface StaffUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at?: string;
}

type UserRole = "admin" | "dentist" | "secretary";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState({
    id: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "" as UserRole | "",
  });
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });
  const [clinicSettings, setClinicSettings] = useState({
    name: "",
    specialty: "",
    address: "",
    phone: "",
    email: "",
    ninea: "",
    rc_number: "",
    legal_status: "",
  });

  // Admin specific state
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "secretary" as UserRole,
  });
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Clinic Settings
        const { data: clinicData } = await supabase
          .from("clinic_settings")
          .select("*")
          .single();

        if (clinicData) {
          setClinicSettings({
            name: clinicData.name || "",
            specialty: clinicData.specialty || "",
            address: clinicData.address || "",
            phone: clinicData.phone || "",
            email: clinicData.email || "",
            ninea: clinicData.ninea || "",
            rc_number: clinicData.rc_number || "",
            legal_status: clinicData.legal_status || "",
          });
        }

        // Fetch User Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Default data from auth if profile is missing
          const initialProfile = {
            id: user.id,
            email: user.email || "",
            first_name: user.user_metadata?.first_name || "",
            last_name: user.user_metadata?.last_name || "",
            role: (user.user_metadata?.role as UserRole) || "secretary",
          };

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Error fetching profile detail:", profileError);
          }
          
          if (profile) {
            const role = (profile.role as UserRole) || "secretary";
            setUserProfile({
              id: profile.id,
              email: profile.email || user.email || "",
              first_name: profile.first_name || "",
              last_name: profile.last_name || "",
              role: role,
            });

            // If admin, fetch all users
            if (role === "admin") {
              const res = await adminListUsers();
              if (res.users) setUsers(res.users);
            }
          } else {
            setUserProfile(initialProfile);
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching data:", err);
        toast.error("Erreur lors du chargement des paramètres");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const refreshUsers = async () => {
    setAdminLoading(true);
    const res = await adminListUsers();
    console.log("CLIENT DEBUG: refreshUsers response:", res);
    if (res.users) setUsers(res.users);
    if (res.error) toast.error(res.error);
    setAdminLoading(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminCreateUser(newUser);
      if (res.error) throw new Error(res.error);
      
      toast.success("Utilisateur créé avec succès");
      setNewUser({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "secretary",
      });
      refreshUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRoleByAdmin(userId: string, role: string) {
    try {
      const res = await adminUpdateUserRole(userId, role);
      if (res.error) throw new Error(res.error);
      toast.success("Rôle mis à jour");
      refreshUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      toast.error(message);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) return;
    
    try {
      const res = await adminDeleteUser(userId);
      if (res.error) throw new Error(res.error);
      toast.success("Utilisateur supprimé");
      refreshUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      toast.error(message);
    }
  }

  async function handleSaveClinic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinic_settings")
        .upsert({
          id: "00000000-0000-0000-0000-000000000000",
          ...clinicSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Paramètres de la clinique enregistrés");
    } catch (err: unknown) {
      console.error("Error saving clinic settings:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    
    if (!userProfile.id) {
      toast.error("ID utilisateur manquant. Veuillez rafraîchir la page.");
      return;
    }

    if (!userProfile.email) {
      toast.error("Email manquant.");
      return;
    }

    setSaving(true);
    try {
      console.log("Saving profile for ID:", userProfile.id, userProfile);
      
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userProfile.id,
          email: userProfile.email,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          role: userProfile.role || "secretary",
        });

      if (error) {
        console.error("Supabase error detail:", error);
        throw error;
      }
      
      toast.success("Profil mis à jour avec succès");
    } catch (err: unknown) {
      console.error("Caught error saving profile:", err);
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Erreur lors de la mise à jour : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;
      toast.success("Mot de passe modifié avec succès");
      setPasswords({ new: "", confirm: "" });
    } catch (err: unknown) {
      console.error("Error updating password:", err);
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: "Directeur / Administrateur",
    dentist: "Dentiste",
    secretary: "Assistant(e)",
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Paramètres</h1>
        <p className="text-slate-500 font-medium">
          Gérez les informations de votre clinique et vos préférences personnelles.
        </p>
      </div>

      <Tabs defaultValue={userProfile.role === "admin" ? "clinic" : "user"} className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 border border-slate-200/50 rounded-xl max-w-[500px]">
          {userProfile.role === "admin" && (
            <>
              <TabsTrigger value="clinic" className="rounded-lg px-6 flex items-center gap-2 group">
                <Building2 className="w-4 h-4 group-data-[state=active]:text-primary" /> Clinique
              </TabsTrigger>
              <TabsTrigger value="treatments" className="rounded-lg px-6 flex items-center gap-2 group">
                <Stethoscope className="w-4 h-4 group-data-[state=active]:text-primary" /> Soins
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="user" className="rounded-lg px-6 flex items-center gap-2 group">
            <User className="w-4 h-4 group-data-[state=active]:text-primary" /> Utilisateur
          </TabsTrigger>
          {userProfile.role === "admin" && (
            <TabsTrigger value="accounts" className="rounded-lg px-6 flex items-center gap-2 group">
              <Users className="w-4 h-4 group-data-[state=active]:text-primary" /> Comptes
            </TabsTrigger>
          )}
        </TabsList>

        {userProfile.role === "admin" && (
          <>
            <TabsContent value="clinic">
          <form onSubmit={handleSaveClinic}>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-8 border-b border-slate-50">
                <CardTitle className="text-xl font-black text-slate-900">Informations de la Clinique</CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Ces informations figureront sur vos factures, devis et documents officiels.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="clinic-name" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nom de la Clinique</Label>
                    <Input
                      id="clinic-name"
                      value={clinicSettings.name}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, name: e.target.value })}
                      placeholder="Ex: DABIA"
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="clinic-specialty" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Spécialité</Label>
                    <Input
                      id="clinic-specialty"
                      value={clinicSettings.specialty}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, specialty: e.target.value })}
                      placeholder="Ex: CLINIQUE DENTAIRE"
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="clinic-address" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Adresse</Label>
                  <Input
                    id="clinic-address"
                    value={clinicSettings.address}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, address: e.target.value })}
                    placeholder="Adresse complète"
                    className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="clinic-phone" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Téléphone</Label>
                    <Input
                      id="clinic-phone"
                      value={clinicSettings.phone}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, phone: e.target.value })}
                      placeholder="+221 ..."
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="clinic-email" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email de contact</Label>
                    <Input
                      id="clinic-email"
                      type="email"
                      value={clinicSettings.email}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, email: e.target.value })}
                      placeholder="contact@..."
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50">
                  <div className="space-y-3">
                    <Label htmlFor="clinic-ninea" className="text-sm font-bold text-slate-700 uppercase tracking-wider">NINEA</Label>
                    <Input
                      id="clinic-ninea"
                      value={clinicSettings.ninea}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, ninea: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="clinic-rc" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Registre du Commerce</Label>
                    <Input
                      id="clinic-rc"
                      value={clinicSettings.rc_number}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, rc_number: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="clinic-legal" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Statut Juridique</Label>
                    <Input
                      id="clinic-legal"
                      value={clinicSettings.legal_status}
                      onChange={(e) => setClinicSettings({ ...clinicSettings, legal_status: e.target.value })}
                      placeholder="Ex: SARL au capital de..."
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end bg-slate-50/50 p-6 border-t">
                <Button type="submit" disabled={saving} className="h-11 px-8 font-bold gap-2 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les modifications
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="treatments">
          <TreatmentSettings />
        </TabsContent>
        </>
        )}

        <TabsContent value="user" className="space-y-8">
          <form onSubmit={handleSaveProfile}>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-8 border-b border-slate-50">
                <CardTitle className="text-xl font-black text-slate-900">Profil Utilisateur</CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Gérez vos informations personnelles affichées sur la plateforme.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="first-name" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Prénom</Label>
                    <Input
                      id="first-name"
                      value={userProfile.first_name}
                      onChange={(e) => setUserProfile({ ...userProfile, first_name: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="last-name" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nom</Label>
                    <Input
                      id="last-name"
                      value={userProfile.last_name}
                      onChange={(e) => setUserProfile({ ...userProfile, last_name: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                  <div className="space-y-3 opacity-70">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email</Label>
                    <Input
                      value={userProfile.email}
                      disabled
                      className="h-12 bg-slate-100 border-slate-200 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Rôle</Label>
                    <div className="h-12 px-4 flex items-center bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                      {roleLabels[userProfile.role] || userProfile.role}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end bg-slate-50/50 p-6 border-t">
                <Button type="submit" disabled={saving} className="h-11 px-8 font-bold gap-2 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Mettre à jour le profil
                </Button>
              </CardFooter>
            </Card>
          </form>

          <form onSubmit={handleUpdatePassword}>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-8 border-b border-slate-50">
                <CardTitle className="text-xl font-black text-slate-900">Sécurité</CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Modifiez votre mot de passe pour sécuriser votre compte.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="new-password" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nouveau mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end bg-slate-50/50 p-6 border-t">
                <Button type="submit" variant="outline" disabled={saving || !passwords.new} className="h-11 px-8 font-bold gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Modifier le mot de passe
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {userProfile.role === "admin" && (
          <TabsContent value="accounts" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add User Form */}
              <div className="lg:col-span-1">
                <form onSubmit={handleCreateUser}>
                  <Card className="border-none shadow-sm bg-white overflow-hidden sticky top-8">
                    <CardHeader className="pb-6 border-b border-slate-50">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900">Nouvel Utilisateur</CardTitle>
                      <CardDescription className="text-slate-500 font-medium">
                        Créez un accès pour un nouveau membre de l&apos;équipe.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-first-name" className="text-xs font-bold text-slate-500 uppercase">Prénom</Label>
                        <Input 
                          id="new-first-name"
                          required
                          value={newUser.first_name}
                          onChange={e => setNewUser({...newUser, first_name: e.target.value})}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-last-name" className="text-xs font-bold text-slate-500 uppercase">Nom</Label>
                        <Input 
                          id="new-last-name"
                          required
                          value={newUser.last_name}
                          onChange={e => setNewUser({...newUser, last_name: e.target.value})}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-email" className="text-xs font-bold text-slate-500 uppercase">Email</Label>
                        <Input 
                          id="new-email"
                          type="email"
                          required
                          value={newUser.email}
                          onChange={e => setNewUser({...newUser, email: e.target.value})}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-xs font-bold text-slate-500 uppercase">Mot de passe initial</Label>
                        <Input 
                          id="new-password"
                          type="password"
                          required
                          value={newUser.password}
                          onChange={e => setNewUser({...newUser, password: e.target.value})}
                          className="bg-slate-50 border-slate-200"
                          placeholder="Min. 6 caractères"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Rôle</Label>
                        <select 
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                        >
                          <option value="secretary">Assistant(e)</option>
                          <option value="dentist">Dentiste</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 bg-slate-50/50 border-t">
                      <Button type="submit" disabled={saving} className="w-full font-bold gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Créer le compte
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </div>

              {/* Users List */}
              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="pb-6 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900">
                        Équipe Clinique ({users.length})
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-medium">
                        Liste de tous les membres ayant accès à la plateforme.
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refreshUsers} disabled={adminLoading}>
                      <Loader2 className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Utilisateur</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rôle</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-inner">
                                    {u.first_name?.[0]}{u.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">{u.first_name} {u.last_name}</div>
                                    <div className="text-[11px] text-slate-500 font-medium">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <select 
                                  className="h-8 px-2 bg-white border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20"
                                  value={u.role}
                                  onChange={(e) => handleUpdateRoleByAdmin(u.id, e.target.value)}
                                  disabled={u.id === userProfile.id}
                                >
                                  <option value="secretary">Assistant(e)</option>
                                  <option value="dentist">Dentiste</option>
                                  <option value="admin">Administrateur</option>
                                </select>
                              </td>
                              <td className="p-4 text-right">
                                {u.id !== userProfile.id && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
