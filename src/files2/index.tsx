'use client';

// src/components/AshDashboard/index.tsx
// Ash como guía interna del dashboard médico de ASHIRA
// Conoce todos los módulos y guía al médico en su flujo de configuración y uso

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown, Sparkles, HelpCircle, BookOpen } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Mapa de módulos por ruta ─────────────────────────────────────────────────
const MODULE_MAP: Record<string, { name: string; quickReplies: string[] }> = {
  '/dashboard/medic': {
    name: 'Panel General',
    quickReplies: ['¿Cómo interpreto los KPIs?', '¿Por qué no veo citas hoy?', '¿Qué son los puntos violeta en el calendario?'],
  },
  '/dashboard/medic/configuracion': {
    name: 'Configuración - Perfil Profesional',
    quickReplies: ['¿Qué necesito para completar mi perfil?', '¿Cómo agrego mis servicios?', '¿Dónde subo mi firma digital?'],
  },
  '/dashboard/medic/configuracion/consultorio': {
    name: 'Configuración - Consultorio',
    quickReplies: ['¿Por qué necesito 3 fotos mínimo?', '¿Cómo configuro la ubicación en el mapa?', '¿Qué es Cashea?'],
  },
  '/dashboard/medic/configuracion/roles': {
    name: 'Configuración - Roles',
    quickReplies: ['¿Cómo creo un rol de Asistente?', '¿Qué diferencia hay entre Asistente y Recepción?', '¿Cómo agrego a mi asistente?'],
  },
  '/dashboard/medic/configuracion/moneda': {
    name: 'Configuración - Moneda',
    quickReplies: ['¿Qué moneda debo elegir?', '¿Puedo cambiar la moneda después?', '¿Cómo se calcula la tasa?'],
  },
  '/dashboard/medic/citas': {
    name: 'Módulo de Citas',
    quickReplies: ['¿Cómo agendo una cita?', '¿Qué diferencia hay entre turno y hora exacta?', '¿Por qué no puedo guardar sin servicio?'],
  },
  '/dashboard/medic/consultas': {
    name: 'Módulo de Consultas',
    quickReplies: ['¿Cómo genero un informe con audio?', '¿Qué es una consulta sucesiva?', '¿Cómo veo el historial de un paciente?'],
  },
  '/dashboard/medic/recetas': {
    name: 'Módulo de Recetas',
    quickReplies: ['¿Cómo emito una receta?', '¿Puedo generar la receta en Word?', '¿Qué marcadores usa la plantilla?'],
  },
  '/dashboard/medic/plantilla-informe': {
    name: 'Plantillas de Informe',
    quickReplies: ['¿Qué marcadores usa el informe?', '¿Soy obstetra, tengo plantillas diferentes?', '¿Cómo subo el archivo Word?'],
  },
  '/dashboard/medic/plantilla-receta': {
    name: 'Plantilla de Receta',
    quickReplies: ['¿Qué marcadores uso en la receta?', '¿Cuántas hojas debe tener el Word?', '¿Cómo funciona {{recipe}}?'],
  },
  '/dashboard/medic/whatsapp': {
    name: 'Integración WhatsApp',
    quickReplies: ['¿Cómo conecto mi WhatsApp?', '¿Qué pasa si el QR no aparece?', '¿Cómo envío un recordatorio?'],
  },
};

const DEFAULT_MODULE = {
  name: 'Dashboard ASHIRA',
  quickReplies: ['¿Por dónde empiezo a configurar?', '¿Cuál es el flujo completo de setup?', '¿Cómo agrego un asistente?'],
};

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Ash 👋 Tu asistente interno de ASHIRA. Estoy aquí para guiarte en cualquier módulo del sistema. ¿En qué te puedo ayudar?',
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AshDashboard() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Solo renderizar en rutas del dashboard médico
  const isDashboardRoute = pathname?.startsWith('/dashboard/medic');
  if (!isDashboardRoute) return null;

  // Detectar módulo actual
  const currentModuleData = Object.entries(MODULE_MAP).find(([path]) =>
    pathname === path || pathname?.startsWith(path + '/')
  )?.[1] || DEFAULT_MODULE;

  // Actualizar mensaje de bienvenida cuando cambia el módulo
  useEffect(() => {
    if (isOpen && messages.length === 1) {
      const moduleMsg: Message = {
        id: `module-${Date.now()}`,
        role: 'assistant',
        content: `Estás en ${currentModuleData.name}. ¿Tienes alguna duda sobre este módulo?`,
      };
      setMessages([WELCOME_MESSAGE, moduleMsg]);
    }
  }, [pathname]);

  // Scroll al final de mensajes
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, isOpen, isMinimized]);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: content.trim() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInputValue('');
      setIsLoading(true);

      try {
        const apiMessages = updatedMessages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));

        if (apiMessages.length === 1) {
          apiMessages.unshift({ role: 'assistant', content: WELCOME_MESSAGE.content });
        }

        const response = await fetch('/api/ash-dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            currentModule: currentModuleData.name,
            currentPath: pathname,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.reply || 'No entendí eso. ¿Puedes reformularlo?',
          },
        ]);

        // Contar no leídos si el chat está minimizado
        if (isMinimized) {
          setUnreadCount((n) => n + 1);
        }
      } catch (err) {
        console.error('[AshDashboard]', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Ups, algo salió mal 😅 Intenta de nuevo o escríbenos a soporte@ashirasoftware.com',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, currentModuleData.name, pathname, isMinimized]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    if (!hasOpenedBefore) {
      setHasOpenedBefore(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUnreadCount(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Botón flotante ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={handleOpen}
            className="fixed bottom-24 right-6 z-[9980] flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl shadow-2xl hover:shadow-violet-500/30 hover:scale-105 transition-all duration-200 group"
            aria-label="Abrir asistente ASHIRA"
            title="Ash — Asistente ASHIRA"
          >
            {/* Badge de no leídos */}
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-white"
              >
                {unreadCount}
              </motion.span>
            )}

            <div className="relative flex-shrink-0">
              <HelpCircle className="w-5 h-5" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-violet-600 animate-pulse" />
            </div>

            <div className="flex flex-col items-start leading-none">
              <span className="text-xs font-bold">Ash</span>
              <span className="text-[10px] text-violet-200 mt-0.5">Ayuda ASHIRA</span>
            </div>

            <Sparkles className="w-3.5 h-3.5 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel de chat ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-[9980] w-[360px] sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200/70 overflow-hidden flex flex-col"
            style={{ maxHeight: isMinimized ? 'auto' : '580px' }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-violet-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold text-sm leading-none">Ash</p>
                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      Dashboard
                    </span>
                  </div>
                  <p className="text-violet-200 text-[10px] mt-0.5 truncate max-w-[200px]">{currentModuleData.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setIsMinimized((v) => !v);
                    if (!isMinimized) setUnreadCount(0);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                  aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Cuerpo colapsable ────────────────────────────────────────── */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {/* ── Mensajes ────────────────────────────────────────── */}
                  <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 min-h-0 bg-slate-50/60">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} message={msg} />
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-end gap-2"
                      >
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                          <div className="flex gap-1 items-center h-4">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="block w-1.5 h-1.5 bg-violet-400 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── Quick replies ────────────────────────────────────── */}
                  {messages.length <= 3 && !isLoading && (
                    <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-1.5 flex-wrap flex-shrink-0">
                      {currentModuleData.quickReplies.map((reply) => (
                        <motion.button
                          key={reply}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => sendMessage(reply)}
                          className="text-xs px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full transition-colors font-medium"
                        >
                          {reply}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* ── Acceso rápido al flujo inicial ─────────────────── */}
                  {messages.length === 1 && (
                    <div className="px-4 pb-2 bg-white border-t border-slate-100 flex-shrink-0">
                      <button
                        onClick={() => sendMessage('¿Cuál es el flujo completo para configurar ASHIRA desde cero?')}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-700 hover:from-violet-100 hover:to-indigo-100 transition-colors"
                      >
                        <BookOpen className="w-4 h-4 flex-shrink-0" />
                        <span>Ver guía de configuración inicial paso a paso</span>
                      </button>
                    </div>
                  )}

                  {/* ── Input ────────────────────────────────────────────── */}
                  <div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={(e) => {
                          const t = e.currentTarget;
                          t.style.height = 'auto';
                          t.style.height = Math.min(t.scrollHeight, 112) + 'px';
                        }}
                        placeholder="Escribe tu pregunta sobre ASHIRA..."
                        rows={1}
                        disabled={isLoading}
                        className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-slate-800 placeholder-slate-400 bg-slate-50 disabled:opacity-50 transition-all max-h-28 overflow-y-auto"
                      />
                      <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim() || isLoading}
                        className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                        aria-label="Enviar"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                      Enter para enviar · Ash conoce todos los módulos de ASHIRA
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Burbuja de chat ──────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}
