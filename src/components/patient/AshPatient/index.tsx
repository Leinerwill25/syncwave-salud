'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Send,
  Minimize2,
  ChevronUp,
  Calendar,
  Pill,
  Stethoscope,
  Bell,
  FlaskConical,
  MapPin,
  Phone,
  ExternalLink,
  Loader2,
  Sparkles,
  Heart,
  ArrowRight,
  User,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  richContent?: RichContent;
};

type RichContent =
  | { type: 'specialists'; data: Specialist[] }
  | { type: 'appointments'; data: Appointment[] }
  | { type: 'consultation'; data: ConsultationData | null }
  | { type: 'prescriptions'; data: Prescription[] }
  | { type: 'reminders'; data: Reminder[] }
  | { type: 'lab_results'; data: LabResult[] };

type Specialist = {
  id: string;
  name: string;
  specialty?: string | null;
  address?: string | null;
  phone?: string | null;
  photo?: string | null;
  organization?: { id: string } | null;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  doctor?: { name: string | null } | null;
  organization?: { name: string | null } | null;
};

type ConsultationData = {
  id: string;
  started_at?: string | null;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  doctor?: { name: string | null } | null;
};

type Prescription = {
  id: string;
  issued_at: string;
  valid_until?: string | null;
  isExpired?: boolean;
  doctor?: { name: string | null } | null;
  prescription_item?: Array<{ id: string; name: string }>;
};

type Reminder = {
  prescription_item_id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  taken_today: boolean;
  has_pending_today: boolean;
};

type LabResult = {
  id: string;
  result_type?: string | null;
  is_critical: boolean;
  reported_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_MAP: Record<string, string> = {
  '/dashboard/patient': 'Inicio',
  '/dashboard/patient/citas': 'Mis Citas',
  '/dashboard/patient/historial': 'Historial',
  '/dashboard/patient/recetas': 'Recetas',
  '/dashboard/patient/recordatorios': 'Medicamentos',
  '/dashboard/patient/resultados': 'Laboratorio',
  '/dashboard/patient/mensajes': 'Mensajes',
  '/dashboard/patient/configuracion': 'Ajustes',
};

const QUICK_REPLIES: Record<string, string[]> = {
  default: ['¿Qué médico necesito?', 'Mis próximas citas', 'Ver mis recetas'],
  '/dashboard/patient/historial': ['Mi última consulta', 'Ver diagnósticos'],
  '/dashboard/patient/recordatorios': ['Pastillas de hoy', '¿A qué hora tomo?'],
};

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Ash 👋 Tu guía de salud en ASHIRA. ¿En qué puedo apoyarte hoy?',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AshPatient({ patientName = 'Paciente' }: { patientName?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [dynamicName, setDynamicName] = useState(patientName);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  if (!pathname?.startsWith('/dashboard/patient')) return null;

  const currentSection = Object.entries(SECTION_MAP).find(([path]) => pathname === path || pathname?.startsWith(path + '/'))?.[1] || 'Dashboard';
  const quickReplies = QUICK_REPLIES[pathname || ''] || QUICK_REPLIES['default'];

  // Cargar nombre real del paciente
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/patient/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.firstName) setDynamicName(data.firstName);
        }
      } catch (err) {
        console.warn('[Ash Patient] No se pudo cargar el nombre real:', err);
      }
    };
    fetchProfile();
  }, []);

  // Efecto para mostrar el saludo proactivo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowGreeting(true);
    }, 4000); // Aparece a los 4 segundos

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setShowGreeting(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const executeAction = async (action: any) => {
    try {
      const endpoints: Record<string, string> = {
        search_specialists: `/api/patient/explore?type=CONSULTORIO_PRIVADO&per_page=5${action.specialty ? `&specialty=${action.specialty}` : ''}${action.query ? `&query=${action.query}` : ''}`,
        show_appointments: '/api/patient/appointments?status=upcoming&limit=3',
        show_last_consultation: '/api/patient/historial',
        show_prescriptions: '/api/patient/recetas?status=active',
        show_reminders: '/api/patient/medication-reminders',
        show_lab_results: '/api/patient/resultados',
      };

      const res = await fetch(endpoints[action.type], { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();

      if (action.type === 'search_specialists') {
        const raw = data.data || [];
        const seen = new Set();
        const specs: Specialist[] = [];
        for (const it of raw) {
          const id = it.organization?.id || it.id;
          if (seen.has(id)) continue;
          seen.add(id);
          specs.push({
            id: it.id, name: it.name, specialty: it.specialty, address: it.address,
            phone: it.phone, photo: it.photo, organization: it.organization
          });
          if (specs.length >= 5) break;
        }
        return { type: 'specialists', data: specs };
      }
      
      if (action.type === 'show_last_consultation') return { type: 'consultation', data: data.consultations?.[0] || null };
      if (action.type === 'show_reminders') return { type: 'reminders', data: (data.reminders || []).slice(0, 4) };
      
      const typeMap: any = { show_appointments: 'appointments', show_prescriptions: 'prescriptions', show_lab_results: 'lab_results' };
      return { type: typeMap[action.type], data: (data.data || []).slice(0, 3) };
    } catch { return null; }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ash-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
          context: { section: currentSection, patientName: dynamicName }
        }),
      });

      const data = await res.json();
      let richContent: any = undefined;
      if (data.action) richContent = await executeAction(data.action);

      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant', content: data.message, richContent
      }]);
      
      // Decidir si mostrar el video periódicamente (30% de probabilidad)
      if (Math.random() < 0.3) {
        setShowVideo(true);
        setTimeout(() => setShowVideo(false), 15000); // Ocultar tras 15s
      }
      
      if (!isOpen) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'Lo siento, tuve un problema de conexión. ¿Podrías repetir?' }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="ash-container font-sans text-slate-800">
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
            {/* Globo de saludo proactivo */}
            <AnimatePresence>
              {showGreeting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10, x: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="relative mb-2 px-4 py-3 bg-white border border-teal-100 shadow-[0_10px_25px_rgba(0,0,0,0.1)] rounded-2xl max-w-[200px]"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowGreeting(false); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors shadow-sm"
                  >
                    <X size={10} />
                  </button>
                  <p className="text-[12px] leading-tight font-medium text-slate-700">
                    ¡Hola, <span className="text-teal-600 font-bold">{dynamicName.split(' ')[0]}</span>! 👋 Estoy aquí por si tienes alguna duda.
                  </p>
                  {/* Flechita del globo */}
                  <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-teal-100 rotate-45"></div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-600 to-blue-600 shadow-[0_8px_32px_rgba(20,184,166,0.4)] flex items-center justify-center group"
            >
              <Sparkles className="text-white w-7 h-7" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unread}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999] w-[400px] max-w-[calc(100vw-32px)] bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden flex flex-col origin-bottom-right"
            style={{ height: isMinimized ? 'auto' : '650px', maxHeight: 'calc(100vh - 100px)' }}
          >
            {/* Header Moderno */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="text-white w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight tracking-tight">Ash Inteligencia</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <p className="text-emerald-600 font-medium text-[10px] uppercase tracking-widest">{currentSection}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                  {isMinimized ? <ChevronUp size={18} /> : <Minimize2 size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <ChatBubble message={msg} />
                    </motion.div>
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Footer Input */}
                <div className="px-6 py-5 bg-white/50 border-t border-slate-100">
                  {messages.length < 3 && !isLoading && (
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                      {quickReplies.map(qr => (
                        <button
                          key={qr} onClick={() => sendMessage(qr)}
                          className="px-4 py-2 bg-white border border-teal-100 text-teal-700 text-xs font-medium rounded-2xl hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm whitespace-nowrap"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative group">
                    <textarea
                      ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
                      placeholder="Cuéntame, ¿cómo te sientes hoy?"
                      className="w-full bg-slate-50 border-none rounded-3xl pl-5 pr-14 py-3.5 text-sm focus:ring-2 focus:ring-teal-500/20 transition-all resize-none shadow-inner"
                      rows={1}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Video de Ash (Heygen) ────────────────────────────────────────── */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-[380px] sm:right-[420px] z-[9999] w-[280px] sm:w-[320px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-emerald-200/50 overflow-hidden"
          >
            <div className="relative pt-[56.25%] overflow-hidden bg-black">
              <iframe 
                className="absolute left-0 w-full"
                style={{ height: '120%', top: '-10%' }}
                src="https://app.heygen.com/embeds/c2ea881b6b18436e91122d5e234c69d4?autoplay=1"
                title="Video de Avatar IV" 
                frameBorder="0" 
                allow="encrypted-media; fullscreen;" 
                allowFullScreen
              />
            </div>
            <button 
              onClick={() => setShowVideo(false)}
              className="absolute top-2 right-2 p-1.5 bg-white/70 hover:bg-white rounded-full transition-colors shadow-sm"
              aria-label="Cerrar video"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isAsh = message.role === 'assistant';
  return (
    <div className={`flex ${isAsh ? 'justify-start' : 'justify-end'} group`}>
      <div className={`max-w-[85%] flex flex-col ${isAsh ? 'items-start' : 'items-end'}`}>
        <div className={`
          relative px-5 py-3.5 text-sm leading-relaxed
          ${isAsh 
            ? 'bg-white text-slate-800 rounded-[1.5rem] rounded-bl-none shadow-sm border border-slate-100' 
            : 'bg-gradient-to-tr from-teal-600 to-blue-600 text-white rounded-[1.5rem] rounded-br-none shadow-md shadow-teal-500/10'}
        `}>
          {message.content}
        </div>
        {message.richContent && (
          <div className="mt-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RichRenderer content={message.richContent} />
          </div>
        )}
      </div>
    </div>
  );
}

function RichRenderer({ content }: { content: RichContent }) {
  const CardWrapper = ({ children, icon: Icon, title, color }: any) => (
    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={16} className={color.replace('bg-', 'text-')} />
        </div>
        <h4 className="font-bold text-slate-800 text-xs">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  if (content.type === 'specialists') return (
    <div className="space-y-3">
      {content.data.map(sp => (
        <div key={sp.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-teal-200 transition-all group">
          <div className="flex gap-3 mb-4">
            {sp.photo ? (
              <img src={sp.photo} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-50" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                <User size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-slate-900 text-sm truncate">{sp.name}</h5>
              <p className="text-teal-600 text-[11px] font-bold uppercase tracking-wider">{sp.specialty}</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {sp.address && <div className="flex items-center gap-2 text-slate-500 text-[11px]"><MapPin size={12} /> <span className="truncate">{sp.address}</span></div>}
            {sp.phone && <div className="flex items-center gap-2 text-slate-500 text-[11px]"><Phone size={12} /> {sp.phone}</div>}
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/patient/consultorio/${sp.organization?.id || sp.id}`} className="flex-1 py-2 text-center text-[11px] font-bold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">Perfil</Link>
            <Link href={`/dashboard/patient/citas/new?clinic_id=${sp.organization?.id || sp.id}`} className="flex-1 py-2 text-center text-[11px] font-bold text-white bg-teal-600 rounded-xl shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-1">
              <Calendar size={12} /> Agendar
            </Link>
          </div>
        </div>
      ))}
      <Link href="/dashboard/patient/consultorio" className="flex items-center justify-center gap-1 text-[11px] font-bold text-teal-600 hover:gap-2 transition-all">Ver más especialistas <ArrowRight size={12} /></Link>
    </div>
  );

  if (content.type === 'appointments') return (
    <CardWrapper icon={Calendar} title="Próximas Citas" color="bg-blue-500">
      {content.data.map(apt => (
        <div key={apt.id} className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
          <p className="text-xs font-bold text-slate-900">{new Date(apt.scheduled_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(apt.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • Dr. {apt.doctor?.name || 'Médico'}</p>
        </div>
      ))}
      <Link href="/dashboard/patient/citas" className="block text-center text-[10px] font-bold text-blue-600">Ver calendario completo</Link>
    </CardWrapper>
  );

  if (content.type === 'prescriptions') return (
    <CardWrapper icon={Pill} title="Recetas Médicas" color="bg-purple-500">
      {content.data.map(rx => (
        <div key={rx.id} className="flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-900">Receta #{rx.id.slice(0, 5)}</p>
            <p className="text-[10px] text-slate-500">Dr. {rx.doctor?.name || 'Médico'}</p>
          </div>
          <Link href="/dashboard/patient/recetas" className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all"><ExternalLink size={14} /></Link>
        </div>
      ))}
    </CardWrapper>
  );

  if (content.type === 'reminders') return (
    <CardWrapper icon={Bell} title="Medicamentos Hoy" color="bg-orange-500">
      {content.data.map(r => (
        <div key={r.prescription_item_id} className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${r.taken_today ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-800">{r.medication_name}</p>
            <p className="text-[10px] text-slate-500">{r.dosage} • {r.frequency}</p>
          </div>
          {r.taken_today && <Heart size={14} className="text-rose-500 fill-rose-500" />}
        </div>
      ))}
    </CardWrapper>
  );

  return null;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl w-fit shadow-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i} className="w-1.5 h-1.5 bg-teal-400 rounded-full"
            animate={{ y: [0, -3, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Ash escribiendo</span>
    </div>
  );
}
