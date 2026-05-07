'use client';

import React from 'react';
import { ShieldCheck, Zap, ChevronRight, Activity } from 'lucide-react';
import Link from 'next/link';

export default function SafecareWidget() {
  return (
    <Link href="/dashboard/patient/safecare" className="group block">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-xl border border-slate-800 p-6 relative overflow-hidden transition-all hover:shadow-indigo-500/10 hover:shadow-2xl hover:-translate-y-1">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -ml-12 -mb-12 group-hover:bg-teal-500/20 transition-colors"></div>

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-[#7FFFD4]" />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#7FFFD4]/10 rounded-full border border-[#7FFFD4]/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7FFFD4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7FFFD4]"></span>
              </span>
              <span className="text-[10px] font-black text-[#7FFFD4] uppercase tracking-tighter">SafeCare 24/7</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Clínica en Casa</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Atención médica domiciliaria con beneficios exclusivos para ti.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
              Ver beneficios exclusivos
              <ChevronRight className="w-4 h-4" />
            </span>
            <Activity className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
