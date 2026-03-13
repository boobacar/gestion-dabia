"use client";

import {
  Calendar,
  Home,
  Inbox,
  Settings,
  FileText,
  Users,
  Package,
  ChevronUp,
  User2,
  LogOut,
  Loader2,
  MessageSquare,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Menu items.
const items: {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
  staffOnly?: boolean;
}[] = [
  {
    title: "Tableau de Bord",
    url: "/admin",
    icon: Home,
    adminOnly: true,
  },
  {
    title: "Importation CSV",
    url: "/admin/import",
    icon: Inbox,
    adminOnly: true,
  },
  {
    title: "Patients (DMP)",
    url: "/admin/patients",
    icon: Users,
  },
  {
    title: "Agenda & RDV",
    url: "/admin/appointments",
    icon: Calendar,
  },
  {
    title: "Factures & Devis",
    url: "/admin/invoices",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Dépenses",
    url: "/admin/expenses",
    icon: TrendingDown,
    adminOnly: true,
  },
  {
    title: "Stocks",
    url: "/admin/inventory",
    icon: Package,
  },
  {
    title: "Paramètres",
    url: "/admin/settings",
    icon: Settings,
    adminOnly: true,
  },
  {
    title: "DABIA Connect",
    url: "/admin/messages",
    icon: MessageSquare,
    adminOnly: true,
  },
  {
    title: "WhatsApp Settings",
    url: "/admin/settings/whatsapp",
    icon: Settings,
    adminOnly: true,
  },
];

export function AppSidebar() {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const [user, setUser] = useState<unknown>(null);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", user.id)
          .single();
        setProfile(profile);
      }
      setLoading(false);
    }
    getUser();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const roleLabels: Record<string, string> = {
    admin: "Directeur",
    dentist: "Dentiste",
    assistant: "Assistant(e)",
  };

  return (
    <Sidebar className="border-r border-slate-200/50 bg-white/80 backdrop-blur-xl">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-100 shadow-sm bg-white">
            <Image
              src="/logo.jpg"
              alt="DABIA Logo"
              fill
              priority
              className="object-contain p-1"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              DABIA
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
              Clinique Dentaire
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items
                .filter(item => {
                  if (item.adminOnly) return profile?.role === "admin";
                  if (item.staffOnly) return profile?.role === "admin" || profile?.role === "dentist";
                  return true;
                })
                .map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      id={`menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      isActive={isActive}
                      tooltip={item.title}
                      render={
                        <Link
                          href={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                            isActive 
                              ? "bg-primary/10 text-primary font-semibold" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        />
                      }
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                        isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                      <span>{item.title}</span>
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!isMounted ? (
          <div className="h-12 w-full animate-pulse bg-slate-50 rounded-xl" />
        ) : (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 text-left group">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User2 className="h-4 w-4" />}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : (user as { email?: string })?.email?.split('@')[0] || "Invité"}
                </span>
                <span className="text-xs text-slate-500 truncate lowercase first-letter:uppercase">
                  {profile ? roleLabels[profile.role] : "DABIA Staff"}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-[200px] rounded-xl p-1"
          >
            <DropdownMenuItem 
              className="rounded-lg cursor-pointer p-0"
            >
              <Link 
                href="/admin/settings" 
                className="flex items-center w-full px-2 py-1.5"
              >
                <User2 className="mr-2 h-4 w-4" />
                <span>Mon Profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function cn(...inputs: (string | boolean | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}
