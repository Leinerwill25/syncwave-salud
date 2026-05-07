'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Users, 
  Trophy, 
  Share2, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  Gift, 
  Award,
  ChevronRight,
  TrendingUp,
  Mail,
  QrCode,
  Sparkles,
  Info,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReferralStats, generateReferralLink } from '@/lib/actions/referrals';
import { ReferralStats } from '@/types/referrals';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        const dataStats = await getReferralStats(data.user.id);
        setStats(dataStats);
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleCopyLink = async () => {
    if (!userId) return;
    let link = '';
    if (!stats?.referralCode) {
      const res = await generateReferralLink(userId);
      if (res.success && res.link) {
        link = res.link;
      }
      const updated = await getReferralStats(userId);
      setStats(updated);
    } else {
      link = `${window.location.origin}/register?ref=${stats.referralCode}`;
    }
    
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Cargando Ecosistema de Embajadores</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 space-y-12">
      
      {/* Hero Header - Diseño Corporativo Premium */}
      <section className="relative pt-8 pb-16 overflow-hidden">
        {/* Decoración de fondo aurora */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none opacity-40">
           <div className="absolute top-[-10%] right-[10%] w-[40%] h-[60%] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse-slow"></div>
           <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[50%] bg-teal-400/10 blur-[100px] rounded-full animate-pulse-slow"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-white/50 backdrop-blur-sm border border-white/20 rounded-full shadow-sm"
          >
            <div className="p-1 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-full">
              <Award className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">Programa de Embajadores ASHIRA</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]"
          >
            Tu influencia <br />
            <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent italic">transforma vidas.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 font-medium text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Ayuda a tus amigos y familiares a acceder a la mejor salud digital de Venezuela mientras acumulas beneficios exclusivos como Embajador Elite.
          </motion.p>
        </div>
      </section>

      {/* Grid Principal: Tarjeta Virtual y Estadísticas */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Columna Izquierda: La "Tarjeta de Embajador" */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative group cursor-default"
          >
            {/* Efecto de luz dinámico al hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            <div className="relative bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 overflow-hidden shadow-2xl border border-white/10">
              {/* Textura de tarjeta de lujo */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Ambassador Card</p>
                      <h4 className="text-white font-bold text-xl">ASHIRA Elite</h4>
                   </div>
                   <div className="h-10 w-10 relative">
                     <Image src="/icon.png" alt="Ashira" fill className="object-contain opacity-50" />
                   </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Invite Link</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between backdrop-blur-md group/link hover:border-white/30 transition-all">
                      <span className="text-white/80 font-mono text-sm truncate mr-4">
                        {stats?.referralCode ? `${window.location.origin.replace('http://', '').replace('https://', '')}/ref?=${stats.referralCode}` : 'PROCESANDO...'}
                      </span>
                      <Share2 className="w-4 h-4 text-white/40 group-hover/link:text-teal-400 transition-colors shrink-0" />
                    </div>
                    <button 
                      onClick={handleCopyLink}
                      className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-teal-500/20 active:scale-95 shrink-0"
                    >
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-6">
                   <div className="flex -space-x-3">
                     {[1,2,3,4].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                         <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-300">U{i}</div>
                       </div>
                     ))}
                     <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white/50">+</div>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">ID Miembro</p>
                      <p className="text-white/60 font-mono text-[10px] uppercase">{userId?.slice(0,13) || '----------'}</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Social Quick Share */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Mail, label: 'Email', color: 'bg-indigo-50 text-indigo-600' },
              { icon: QrCode, label: 'Código QR', color: 'bg-teal-50 text-teal-600' },
              { icon: Users, label: 'WhatsApp', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Share2, label: 'Más', color: 'bg-slate-50 text-slate-600' },
            ].map((social, i) => (
              <motion.button 
                key={i}
                whileHover={{ y: -2 }}
                className={`flex flex-col items-center gap-2 p-5 ${social.color} rounded-3xl border border-transparent hover:border-current transition-all`}
              >
                <social.icon className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">{social.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Estadísticas en Glassmorphism */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] p-8 shadow-xl space-y-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              Rendimiento Global
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-3xl p-6 flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Invitados Registrados</p>
                  <p className="text-3xl font-black text-slate-900">{stats?.totalReferrals || 0}</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-3xl p-6 flex items-center justify-between group hover:border-teal-100 transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pulsos Acumulados</p>
                  <p className="text-3xl font-black text-slate-900">{stats?.totalPointsAwarded || 0}</p>
                </div>
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <TrendingUp className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-indigo-900 font-bold text-xs">Crecimiento este mes</p>
                  <p className="text-indigo-600/70 text-[10px] font-medium">Has superado tu meta por un +12%</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Recompensas - Corporativo y Limpio */}
      <section className="max-w-6xl mx-auto px-4 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
           <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tu camino de beneficios</h3>
              <p className="text-slate-500 font-medium text-sm">Cada acción de tus recomendados tiene recompensa.</p>
           </div>
           <Link href="/dashboard/patient/salud-plus" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
              Ver Catálogo Completo <ArrowRight className="w-4 h-4" />
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              title: 'Registro Inicial', 
              desc: 'Tu referido crea su cuenta y completa su perfil clínico básico.', 
              reward: '30 Pulsos',
              icon: UserPlus,
              color: 'indigo'
            },
            { 
              title: 'Primera Acción', 
              desc: 'Cuando solicita su primera cita o servicio SafeCare domiciliario.', 
              reward: '120 Pulsos',
              icon: Zap,
              color: 'teal'
            },
            { 
              title: 'Elite Bonus', 
              desc: 'Bonificación especial por cada 5 referidos activos en un mismo mes.', 
              reward: '500 Pulsos',
              icon: Sparkles,
              color: 'amber'
            }
          ].map((item, idx) => (
            <div key={idx} className="group relative bg-white border border-slate-100 rounded-[2rem] p-8 space-y-6 hover:shadow-2xl hover:border-indigo-100 transition-all">
               <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7" />
               </div>
               <div className="space-y-2">
                  <h4 className="font-black text-slate-900 tracking-tight">{item.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
               </div>
               <div className="pt-2 flex items-center justify-between">
                  <span className={`text-lg font-black text-${item.color}-600`}>{item.reward}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historial Reciente - Minimalista y Corporativo */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest text-center mb-8">Actividad de Embajador</h3>
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          {stats?.referrals && stats.referrals.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {stats.referrals.map((ref, idx) => (
                <div key={idx} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-white transition-colors">
                  <div className="flex items-center gap-5 w-full sm:w-auto">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${
                      ref.status === 'converted' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {ref.status === 'converted' ? <CheckCircle2 className="w-6 h-6" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{ref.referred_email || 'Invitado Privado'}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">
                        Registrado el {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      ref.status === 'converted' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {ref.status === 'converted' ? 'Completado' : 'Pendiente'}
                    </div>
                    <div className="text-right hidden md:block">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Recompensa</p>
                       <p className="text-xs font-bold text-slate-600">{ref.status === 'converted' ? '+150 Pulsos' : '--'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-900 font-bold">Tu red de impacto aún está vacía</p>
                <p className="text-slate-400 text-xs font-medium">Los grandes cambios comienzan compartiendo. Comienza tu red hoy.</p>
              </div>
              <button 
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                Compartir ASHIRA <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Final - Elegante y Simple */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-[3rem] p-10 sm:p-16 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
           
           <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">¿Dudas sobre tus beneficios?</h2>
              <p className="text-indigo-200/70 font-medium text-sm sm:text-base">
                Nuestro equipo corporativo de soporte está listo para asistirte en cada paso de tu camino como Embajador Elite.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                 <button className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all active:scale-95 shadow-xl">
                    Contactar Soporte
                 </button>
                 <button className="w-full sm:w-auto px-10 py-5 border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
                    Preguntas Frecuentes
                 </button>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

// Iconos adicionales faltantes en el import anterior
const UserPlus = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/>
  </svg>
);
