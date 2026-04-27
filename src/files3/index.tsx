'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Shield,
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
  reason?: string | null;
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
  status: string;
  isExpired?: boolean;
  doctor?: { name: string | null } | null;
  prescription_item?: Array<{ id: string; name: string; dosage?: string | null }>;
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

// ─── Section map ──────────────────────────────────────────────────────────────
const SECTION_MAP: Record<string, string> = {
  '/dashboard/patient': 'Panel Principal',
  '/dashboard/patient/citas': 'Mis Citas',
  '/dashboard/patient/historial': 'Historial Médico',
  '/dashboard/patient/recetas': 'Mis Recetas',
  '/dashboard/patient/recordatorios': 'Recordatorios de Medicamentos',
  '/dashboard/patient/resultados': 'Resultados de Laboratorio',
  '/dashboard/patient/mensajes': 'Mensajes',
  '/dashboard/patient/pagos': 'Pagos y Facturas',
  '/dashboard/patient/consultorio': 'Consultorios',
  '/dashboard/patient/family': 'Grupo Familiar',
  '/dashboard/patient/configuracion': 'Configuración',
  '/dashboard/patient/qr-urgente': 'QR de Emergencia',
};

const QUICK_REPLIES_BY_SECTION: Record<string, string[]> = {
  default: [
    '¿Qué especialista necesito?',
    'Ver mis próximas citas',
    'Ver mis recetas activas',
  ],
  '/dashboard/patient/historial': [
    'Mi última consulta médica',
    'Ver mis diagnósticos',
    'Descargar mi historial',
  ],
  '/dashboard/patient/recetas': [
    'Ver mis recetas activas',
    'Buscar un especialista',
    '¿Cuándo vence mi receta?',
  ],
  '/dashboard/patient/recordatorios': [
    'Mis medicamentos de hoy',
    'Marcar pastilla como tomada',
    '¿A qué hora tomo mi próxima dosis?',
  ],
  '/dashboard/patient/resultados': [
    'Ver mis resultados',
    'Tengo un resultado crítico',
    '¿Cómo subo un resultado?',
  ],
};

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Ash 👋 Tu asistente en ASHIRA. Puedo ayudarte a encontrar especialistas, ver tus citas, recetas y mucho más. ¿En qué te ayudo hoy?',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AshPatient({ patientName = 'Paciente' }: { patientName?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Only show on patient routes
  if (!pathname?.startsWith('/dashboard/patient')) return null;

  const currentSection =
    Object.entries(SECTION_MAP).find(([path]) => pathname === path || pathname?.startsWith(path + '/'))?.[1] || 'Dashboard';

  const quickReplies =
    QUICK_REPLIES_BY_SECTION[pathname || ''] || QUICK_REPLIES_BY_SECTION['default'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ─── Execute rich actions ────────────────────────────────────────────────
  const executeAction = async (action: { type: string; specialty?: string; query?: string }) => {
    try {
      switch (action.type) {
        case 'search_specialists': {
          const params = new URLSearchParams({ type: 'CONSULTORIO_PRIVADO', per_page: '5' });
          if (action.specialty) params.set('specialty', action.specialty);
          if (action.query) params.set('query', action.query);
          const res = await fetch(`/api/patient/explore?${params}`, { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          const raw = data.data || [];
          // Deduplicate by organization id
          const seen = new Set<string>();
          const specialists: Specialist[] = [];
          for (const item of raw) {
            const orgId = item.organization?.id || item.id;
            if (seen.has(orgId)) continue;
            seen.add(orgId);
            specialists.push({
              id: item.id,
              name: item.name,
              specialty: item.specialty || null,
              address: item.address || null,
              phone: item.phone || null,
              photo: item.photo || null,
              organization: item.organization ? { id: item.organization.id } : null,
            });
            if (specialists.length >= 5) break;
          }
          return { type: 'specialists' as const, data: specialists };
        }

        case 'show_appointments': {
          const res = await fetch('/api/patient/appointments?status=upcoming&limit=3', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return { type: 'appointments' as const, data: (data.data || []).slice(0, 3) as Appointment[] };
        }

        case 'show_last_consultation': {
          const res = await fetch('/api/patient/historial', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          const consultations = data.consultations || [];
          return {
            type: 'consultation' as const,
            data: consultations.length > 0 ? (consultations[0] as ConsultationData) : null,
          };
        }

        case 'show_prescriptions': {
          const res = await fetch('/api/patient/recetas?status=active', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return { type: 'prescriptions' as const, data: (data.data || []).slice(0, 3) as Prescription[] };
        }

        case 'show_reminders': {
          const res = await fetch('/api/patient/medication-reminders', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return {
            type: 'reminders' as const,
            data: (data.reminders || []).slice(0, 4) as Reminder[],
          };
        }

        case 'show_lab_results': {
          const res = await fetch('/api/patient/resultados', { credentials: 'include' });
          if (!res.ok) return null;
          const data = await res.json();
          return { type: 'lab_results' as const, data: (data.data || []).slice(0, 3) as LabResult[] };
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  // ─── Send message ────────────────────────────────────────────────────────
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
          messages: history
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
          context: { section: currentSection, patientName },
        }),
      });

      const data = await res.json();
      let richContent: RichContent | undefined = undefined;

      if (data.action) {
        const result = await executeAction(data.action);
        if (result) richContent = result as RichContent;
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'No pude procesar eso. Intenta de nuevo.',
        richContent,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Tuve un problema de conexión. Intenta de nuevo.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ash-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Abrir Ash"
          >
            {/* Ash logo */}
            <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'serif' }}>A</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ash-chat"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: isMinimized ? 'auto' : '620px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm" style={{ fontFamily: 'serif' }}>A</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">Ash</p>
                  <p className="text-white/70 text-[11px] mt-0.5">{currentSection}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {!isMinimized && (
              <div className="flex flex-col flex-1 bg-slate-50 min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ maxHeight: '440px' }}>
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies — show only when no loading and last msg is from assistant */}
                {!isLoading && messages[messages.length - 1]?.role === 'assistant' && messages.length <= 2 && (
                  <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                    {quickReplies.map((qr) => (
                      <button
                        key={qr}
                        onClick={() => sendMessage(qr)}
                        className="text-[11px] px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-50 transition whitespace-nowrap shadow-sm"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 bg-white flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escríbele a Ash..."
                      disabled={isLoading}
                      rows={1}
                      className="flex-1 resize-none px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-slate-50 max-h-24 overflow-y-auto"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Enter para enviar · Ash es tu asistente en ASHIRA
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <span className="text-white text-[11px] font-bold" style={{ fontFamily: 'serif' }}>A</span>
        </div>
      )}
      <div className={`max-w-[88%] ${isUser ? '' : 'w-full'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm ml-auto w-fit'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>

        {/* Rich content below the bubble */}
        {message.richContent && (
          <div className="mt-2">
            <RichContentRenderer content={message.richContent} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Rich Content Renderer ────────────────────────────────────────────────────
function RichContentRenderer({ content }: { content: RichContent }) {
  switch (content.type) {
    case 'specialists':
      return <SpecialistCards specialists={content.data} />;
    case 'appointments':
      return <AppointmentCards appointments={content.data} />;
    case 'consultation':
      return <ConsultationCard data={content.data} />;
    case 'prescriptions':
      return <PrescriptionCards prescriptions={content.data} />;
    case 'reminders':
      return <ReminderCards reminders={content.data} />;
    case 'lab_results':
      return <LabResultCards results={content.data} />;
    default:
      return null;
  }
}

// ─── Specialist Cards ─────────────────────────────────────────────────────────
function SpecialistCards({ specialists }: { specialists: Specialist[] }) {
  if (!specialists.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No encontré especialistas disponibles en este momento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {specialists.map((sp) => {
        const orgId = sp.organization?.id || sp.id;
        return (
          <div key={sp.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-start gap-2.5 mb-2.5">
              {sp.photo ? (
                <img src={sp.photo} alt={sp.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{sp.name}</p>
                {sp.specialty && (
                  <span className="inline-block text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium mt-0.5">
                    {sp.specialty}
                  </span>
                )}
              </div>
            </div>
            {sp.address && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{sp.address}</span>
              </div>
            )}
            {sp.phone && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{sp.phone}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Link
                href={`/dashboard/patient/consultorio/${orgId}`}
                className="flex-1 text-center py-1.5 text-[11px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
              >
                Ver perfil
              </Link>
              <Link
                href={`/dashboard/patient/citas/new?clinic_id=${orgId}`}
                className="flex-1 text-center py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Crear cita
              </Link>
            </div>
          </div>
        );
      })}
      <Link
        href="/dashboard/patient/consultorio"
        className="block text-center text-[11px] text-indigo-600 hover:underline py-1"
      >
        Ver todos los consultorios →
      </Link>
    </div>
  );
}

// ─── Appointment Cards ────────────────────────────────────────────────────────
function AppointmentCards({ appointments }: { appointments: Appointment[] }) {
  if (!appointments.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No tienes citas próximas. <Link href="/dashboard/patient/citas/new" className="text-indigo-600 font-medium">Agenda una aquí</Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((apt) => (
        <div key={apt.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-900">
              {new Date(apt.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <p className="text-[11px] text-slate-600 mb-1">
            {new Date(apt.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            {apt.doctor?.name ? ` · Dr. ${apt.doctor.name}` : ''}
          </p>
          {apt.organization?.name && (
            <p className="text-[11px] text-slate-500">{apt.organization.name}</p>
          )}
          <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
            apt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {apt.status === 'SCHEDULED' ? 'Agendada' : apt.status === 'COMPLETED' ? 'Completada' : apt.status}
          </span>
        </div>
      ))}
      <Link href="/dashboard/patient/citas" className="block text-center text-[11px] text-indigo-600 hover:underline py-1">
        Ver todas las citas →
      </Link>
    </div>
  );
}

// ─── Consultation Card ────────────────────────────────────────────────────────
function ConsultationCard({ data }: { data: ConsultationData | null }) {
  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No hay consultas registradas aún.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Stethoscope className="w-4 h-4 text-teal-500 flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-900">Última consulta</p>
      </div>
      {data.started_at && (
        <p className="text-[11px] text-slate-500 mb-1">
          {new Date(data.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          {data.doctor?.name ? ` · Dr. ${data.doctor.name}` : ''}
        </p>
      )}
      {data.chief_complaint && (
        <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 mb-1.5">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Motivo</p>
          <p className="text-[11px] text-slate-800">{data.chief_complaint}</p>
        </div>
      )}
      {data.diagnosis && (
        <div className="bg-teal-50 rounded-lg px-2.5 py-1.5">
          <p className="text-[10px] text-teal-600 font-medium uppercase tracking-wide">Diagnóstico</p>
          <p className="text-[11px] text-slate-800">{data.diagnosis}</p>
        </div>
      )}
      <Link href="/dashboard/patient/historial" className="block text-center text-[11px] text-indigo-600 hover:underline mt-2">
        Ver historial completo →
      </Link>
    </div>
  );
}

// ─── Prescription Cards ───────────────────────────────────────────────────────
function PrescriptionCards({ prescriptions }: { prescriptions: Prescription[] }) {
  if (!prescriptions.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No tienes recetas activas en este momento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prescriptions.map((rx) => (
        <div key={rx.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Pill className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-900">Receta #{rx.id.slice(0, 6)}</p>
          </div>
          {rx.doctor?.name && (
            <p className="text-[11px] text-slate-500 mb-1">Dr. {rx.doctor.name}</p>
          )}
          {rx.prescription_item && rx.prescription_item.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {rx.prescription_item.slice(0, 3).map((item) => (
                <span key={item.id} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                  {item.name}
                </span>
              ))}
            </div>
          )}
          {rx.valid_until && (
            <p className={`text-[10px] font-medium ${rx.isExpired ? 'text-red-600' : 'text-slate-500'}`}>
              {rx.isExpired ? '⚠ Vencida' : `Válida hasta ${new Date(rx.valid_until).toLocaleDateString('es-ES')}`}
            </p>
          )}
        </div>
      ))}
      <Link href="/dashboard/patient/recetas" className="block text-center text-[11px] text-indigo-600 hover:underline py-1">
        Ver todas mis recetas →
      </Link>
    </div>
  );
}

// ─── Reminder Cards ───────────────────────────────────────────────────────────
function ReminderCards({ reminders }: { reminders: Reminder[] }) {
  if (!reminders.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No tienes recordatorios de medicamentos activos.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((r) => (
        <div
          key={r.prescription_item_id}
          className={`bg-white border rounded-xl p-3 shadow-sm ${
            r.taken_today ? 'border-green-200' : r.has_pending_today ? 'border-amber-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${r.taken_today ? 'text-green-500' : r.has_pending_today ? 'text-amber-500' : 'text-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{r.medication_name}</p>
              {r.dosage && <p className="text-[11px] text-slate-500">{r.dosage}</p>}
              {r.frequency && <p className="text-[11px] text-slate-500">{r.frequency}</p>}
              <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                r.taken_today ? 'bg-green-100 text-green-700' :
                r.has_pending_today ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {r.taken_today ? '✓ Tomado hoy' : r.has_pending_today ? '⏰ Pendiente' : 'Próximo'}
              </span>
            </div>
          </div>
        </div>
      ))}
      <Link href="/dashboard/patient/recordatorios" className="block text-center text-[11px] text-indigo-600 hover:underline py-1">
        Ver todos los recordatorios →
      </Link>
    </div>
  );
}

// ─── Lab Result Cards ─────────────────────────────────────────────────────────
function LabResultCards({ results }: { results: LabResult[] }) {
  if (!results.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-500 text-center">
        No tienes resultados de laboratorio registrados.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((r) => (
        <div key={r.id} className={`bg-white border rounded-xl p-3 shadow-sm ${r.is_critical ? 'border-red-300' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <FlaskConical className={`w-4 h-4 flex-shrink-0 ${r.is_critical ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{r.result_type || 'Resultado de Lab'}</p>
              <p className="text-[11px] text-slate-500">
                {new Date(r.reported_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {r.is_critical && (
              <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold flex-shrink-0">
                CRÍTICO
              </span>
            )}
          </div>
        </div>
      ))}
      <Link href="/dashboard/patient/resultados" className="block text-center text-[11px] text-indigo-600 hover:underline py-1">
        Ver todos los resultados →
      </Link>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[11px] font-bold" style={{ fontFamily: 'serif' }}>A</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
