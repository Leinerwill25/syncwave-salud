'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Share2, 
  Trophy, 
  ArrowRight, 
  Copy, 
  CheckCircle2,
  Sparkles,
  Gift,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getReferralStats, generateReferralLink } from '@/lib/actions/referrals';
import { ReferralStats } from '@/types/referrals';

interface ReferralWidgetProps {
  userId: string;
}

export default function ReferralWidget({ userId }: ReferralWidgetProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadStats() {
      const data = await getReferralStats(userId);
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, [userId]);

  const handleCopyLink = async () => {
    if (!stats?.referralCode) {
      const res = await generateReferralLink(userId);
      if (res.success && res.link) {
        navigator.clipboard.writeText(res.link);
      }
    } else {
      const link = `${window.location.origin}/register?ref=${stats.referralCode}`;
      navigator.clipboard.writeText(link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="h-48 bg-slate-50 rounded-3xl animate-pulse border border-slate-100"></div>
  );

  return (
    <div className="relative overflow-hidden bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm group hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
        {/* Left Content */}
        <div className="flex-1 space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-2">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Programa de Embajadores</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Comparte Salud, <br />
              <span className="text-indigo-600">Gana Pulsos.</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm">
              Invita a tus amigos y familiares. Obtén hasta <span className="font-bold text-indigo-600">150 Pulsos</span> por cada referido que complete su primer servicio.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Copiado al portapapeles
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Enlace Invitación
                </>
              )}
            </button>
            <Link 
              href="/dashboard/patient/referidos"
              className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group/link"
            >
              Ver Estadísticas
              <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Vertical Divider (Desktop) */}
        <div className="hidden lg:block w-px h-24 bg-slate-100"></div>

        {/* Stats Grid */}
        <div className="w-full lg:w-auto grid grid-cols-2 gap-4 sm:gap-6 min-w-[280px]">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registrados</p>
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xl font-black text-slate-900">{stats?.totalReferrals || 0}</span>
            </div>
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center space-y-1">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Pulsos Ganados</p>
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-600" />
              <span className="text-xl font-black text-indigo-700">{stats?.totalPointsAwarded || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Badge (Visual Decoration) */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-600/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
        <Gift className="w-8 h-8 text-indigo-200" />
      </div>
    </div>
  );
}
