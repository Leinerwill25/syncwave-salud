'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { useRouter } from 'next/navigation';

export default function SafecareLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      
      // Mapeo de usuario "SafeCare" al correo técnico independiente
      const loginEmail = username.toLowerCase() === 'safecare' 
        ? 'staff@safecare.ashira.click' 
        : username;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Usuario o contraseña incorrectos para el portal SafeCare.');
        }
        throw authError;
      }

      // Éxito: Redirigir al panel de staff
      router.push('/dashboard/safecare');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al intentar iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="p-8 sm:p-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-slate-200">
                <ShieldCheck className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">SafeCare 24/7</h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Portal de Staff Autorizado</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre de Usuario</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ej: SafeCare"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-bold leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Activity className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Entrar al Panel
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Exclusivo para ASHIRA • SafeCare
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-500 text-xs font-medium">
          ¿Problemas con el acceso? Contacte a soporte técnico ASHIRA.
        </p>
      </motion.div>
    </div>
  );
}
