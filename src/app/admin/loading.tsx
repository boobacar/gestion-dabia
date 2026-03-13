import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-outfit">
          Chargement <span className="text-primary italic">DABIA</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight animate-pulse">
          Optimisation de l&apos;interface en cours...
        </p>
      </div>
      
      {/* Skeleton Mockup */}
      <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-40 grayscale">
         {[1, 2, 3, 4].map((i) => (
           <div key={i} className="h-32 bg-slate-200/50 rounded-2xl animate-pulse border border-slate-100"></div>
         ))}
      </div>
    </div>
  );
}
