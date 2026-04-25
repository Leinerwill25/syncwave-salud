'use client';
// src/components/AshOnboarding/index.tsx
// Asistente flotante de onboarding para /register — 100% gratuito con Gemini 2.0 Flash
// Consciente del paso actual y tipo de usuario del RegisterForm

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown, Sparkles } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type UserType = 'MEDICO' | 'PACIENTE' | 'ENFERMERO' | 'ADMIN' | null;

// ─── Quick replies por contexto ───────────────────────────────────────────────
const QUICK_REPLIES_INITIAL = [
  'Soy médico',
  'Soy paciente',
  'Soy enfermero/a',
  'Tengo una clínica',
];

const QUICK_REPLIES_BY_TYPE: Record<string, string[]> = {
  MEDICO: ['¿Cuánto cuesta?', '¿Qué datos necesito?', '¿Cómo pago?'],
  PACIENTE: ['¿Es gratis?', '¿Para qué sirve la cédula?', '¿Qué datos son obligatorios?'],
  ENFERMERO: ['¿Qué es la matrícula?', '¿Cuánto cuesta?', '¿Qué datos necesito?'],
  ADMIN: ['¿Cómo cuento especialistas?', '¿Qué son las sedes?', '¿Cuánto cuesta?'],
};

// ─── Mensaje de bienvenida ────────────────────────────────────────────────────
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy Ash 👋 Estoy aquí para ayudarte durante tu registro. ¿Te estás registrando como médico, paciente, enfermero/a, o como clínica/centro médico?',
};

// ─── Inferir tipo de usuario del texto ───────────────────────────────────────
function inferUserType(text: string): UserType {
  const lower = text.toLowerCase();
  if (lower.includes('médico') || lower.includes('medico') || lower.includes('doctor') || lower.includes('especialista') || lower.includes('consultorio'))
    return 'MEDICO';
  if (lower.includes('paciente') || lower.includes('gratis'))
    return 'PACIENTE';
  if (lower.includes('enfermero') || lower.includes('enfermera') || lower.includes('enfermer') || lower.includes('matrícula') || lower.includes('matricula'))
    return 'ENFERMERO';
  if (lower.includes('clínica') || lower.includes('clinica') || lower.includes('hospital') || lower.includes('centro médico') || lower.includes('especialistas') || lower.includes('sedes'))
    return 'ADMIN';
  return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AshOnboarding() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contexto del formulario (detectado automáticamente de los mensajes)
  const [userType, setUserType] = useState<UserType>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Solo renderizar en /register exacto
  if (pathname !== '/register') return null;

  // ── Auto-apertura a los 4 segundos ──────────────────────────────────────
  useEffect(() => {
    if (hasAutoOpened) return;
    autoOpenTimer.current = setTimeout(() => {
      setIsOpen(true);
      setHasAutoOpened(true);
      setShowBadge(false);
    }, 4000);
    return () => { if (autoOpenTimer.current) clearTimeout(autoOpenTimer.current); };
  }, [hasAutoOpened]);

  // ── Scroll al último mensaje ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, isOpen, isMinimized]);

  // ── Focus en input ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // ── Detectar paso actual escuchando el DOM del RegisterForm ──────────────
  // (Lee el aria-current del stepper del formulario)
  useEffect(() => {
    if (!isOpen) return;
    const detectStep = () => {
      const stepEl = document.querySelector('[aria-current="step"]');
      if (stepEl) {
        const stepText = stepEl.textContent?.trim();
        const stepNum = parseInt(stepText || '1');
        if (!isNaN(stepNum) && stepNum !== currentStep) {
          setCurrentStep(stepNum);
        }
      }
    };
    detectStep();
    const observer = new MutationObserver(detectStep);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [isOpen, currentStep]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Detectar tipo de usuario
      const detected = inferUserType(content);
      if (detected && !userType) setUserType(detected);
      const effectiveType = detected || userType;

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: content.trim() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInputValue('');
      setIsLoading(true);

      try {
        // Historial para la API (sin el welcome hardcoded, se incluye el contexto vía system prompt)
        const apiMessages = updatedMessages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));

        // Si es el primer mensaje del usuario, incluir el welcome como contexto del asistente
        if (apiMessages.length === 1) {
          apiMessages.unshift({ role: 'assistant', content: WELCOME_MESSAGE.content });
        }

        const response = await fetch('/api/ash-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            userType: effectiveType ?? undefined,
            currentStep,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.reply || 'Lo siento, intenta de nuevo. 😊',
          },
        ]);
      } catch (err) {
        console.error('[AshOnboarding]', err);
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
    [messages, isLoading, userType, currentStep]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleOpen = () => {
    if (autoOpenTimer.current) clearTimeout(autoOpenTimer.current);
    setIsOpen(true);
    setHasAutoOpened(true);
    setShowBadge(false);
    setIsMinimized(false);
  };

  // Quick replies según el contexto actual
  const quickReplies =
    messages.length <= 2
      ? QUICK_REPLIES_INITIAL
      : userType && QUICK_REPLIES_BY_TYPE[userType]
      ? QUICK_REPLIES_BY_TYPE[userType]
      : [];

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
            className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl shadow-2xl hover:shadow-teal-500/40 hover:scale-105 transition-all duration-200 group"
            aria-label="Abrir asistente de registro Ash"
          >
            {/* Badge de nuevo mensaje */}
            {showBadge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-white"
              >
                1
              </motion.span>
            )}

            <div className="relative flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-teal-600 animate-pulse" />
            </div>

            <div className="flex flex-col items-start leading-none">
              <span className="text-xs font-bold">Ash</span>
              <span className="text-[10px] text-teal-100 mt-0.5">Asistente ASHIRA</span>
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
            className="fixed bottom-6 right-6 z-[9990] w-[360px] sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200/70 overflow-hidden flex flex-col"
            style={{ maxHeight: isMinimized ? 'auto' : '560px' }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-teal-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold text-sm leading-none">Ash</p>
                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      IA
                    </span>
                    {/* Indicador de paso actual */}
                    {currentStep > 1 && (
                      <span className="text-[9px] bg-white/15 text-teal-100 px-1.5 py-0.5 rounded-full font-medium">
                        Paso {currentStep}
                      </span>
                    )}
                  </div>
                  <p className="text-teal-100 text-[10px] mt-0.5">Asistente de Registro · ASHIRA</p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setIsMinimized((v) => !v)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                  aria-label={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                  aria-label="Cerrar asistente"
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

                    {/* Typing indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-end gap-2"
                      >
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                          <div className="flex gap-1 items-center h-4">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="block w-1.5 h-1.5 bg-teal-400 rounded-full"
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
                  {quickReplies.length > 0 && !isLoading && (
                    <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-1.5 flex-wrap flex-shrink-0">
                      {quickReplies.map((reply) => (
                        <motion.button
                          key={reply}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => sendMessage(reply)}
                          className="text-xs px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-full transition-colors font-medium"
                        >
                          {reply}
                        </motion.button>
                      ))}
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
                        placeholder="Escribe tu pregunta..."
                        rows={1}
                        disabled={isLoading}
                        className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 placeholder-slate-400 bg-slate-50 disabled:opacity-50 transition-all max-h-28 overflow-y-auto"
                      />
                      <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim() || isLoading}
                        className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                        aria-label="Enviar mensaje"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                      Enter para enviar · Shift+Enter nueva línea
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
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-teal-600 to-cyan-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
        }`}
      >
        {message.content.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
