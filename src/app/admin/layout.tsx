import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full bg-slate-50/50 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/70 px-6 backdrop-blur-xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-slate-100 transition-colors" />
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 tracking-tight">DABIA Gestion</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Administration Centrale</span>
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
