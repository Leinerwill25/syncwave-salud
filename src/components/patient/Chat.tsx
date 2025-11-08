'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
// Nota: cambié a textarea para soportar Shift+Enter. Si quieres usar <Input/> otra vez, dime.
import { Input } from '@/components/ui/input';

/**
 * PatientChat (persistencia local + accesibilidad + teclas)
 *
 * - Persistencia local con localStorage: storage.getConversation(id) / saveConversation(id, messages)
 * - Guarda messages y hasInteracted para mantener estado tras recarga.
 * - Enter = enviar (cuando no hay Shift); Shift+Enter = nueva línea.
 * - aria-live="polite" en la zona de mensajes.
 *
 * Requisitos: TailwindCSS y createSupabaseBrowserClient()
 */

type Message = {
	id: string;
	text: string;
	isUser: boolean;
	createdAt: string;
};

const QUICK_PROMPTS = ['Tengo fiebre y dolor de garganta', 'Tengo dolor de cabeza desde ayer', 'Me siento mareado al levantarme', '¿Qué puedo tomar para el dolor muscular?'];

// Cambia este conversationId si quieres múltiples conversaciones separadas por usuario/session
const CONVERSATION_ID = 'default';

const STORAGE_PREFIX = 'patient_chat_v1:';

function nowISO() {
	return new Date().toISOString();
}
function formatTime(iso?: string) {
	if (!iso) return '';
	const d = new Date(iso);
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ---------- simple storage wrapper (localStorage) ---------- */
function storageKey(conversationId = CONVERSATION_ID) {
	return `${STORAGE_PREFIX}${conversationId}`;
}
function saveConversation(conversationId: string, messages: Message[], hasInteracted: boolean) {
	try {
		const payload = {
			messages,
			hasInteracted,
			updatedAt: new Date().toISOString(),
		};
		localStorage.setItem(storageKey(conversationId), JSON.stringify(payload));
	} catch (err) {
		// localStorage pueden fallar en modo incógnito; silencioso
		console.warn('[PatientChat] saveConversation failed', err);
	}
}
function getConversation(conversationId: string): { messages: Message[]; hasInteracted: boolean } | null {
	try {
		const raw = localStorage.getItem(storageKey(conversationId));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return {
			messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
			hasInteracted: Boolean(parsed?.hasInteracted),
		};
	} catch (err) {
		console.warn('[PatientChat] getConversation failed', err);
		return null;
	}
}
/* ---------------------------------------------------------- */

export default function PatientChat() {
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState(''); // contenido del textarea
	const [isLoading, setIsLoading] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);
	const [unread, setUnread] = useState(0);
	const [isTyping, setIsTyping] = useState(false);

	// Nuevo estado: si el usuario ya interactuó (escribir o seleccionar prompt)
	const [hasInteracted, setHasInteracted] = useState(false);

	const panelRef = useRef<HTMLDivElement | null>(null);
	const bubbleRef = useRef<HTMLButtonElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	// Cargar conversación desde localStorage al montar (client-side)
	useEffect(() => {
		const saved = getConversation(CONVERSATION_ID);
		if (saved) {
			setMessages(saved.messages ?? []);
			setHasInteracted(saved.hasInteracted ?? false);
			// Si había mensajes, no mostrar intro
			if ((saved.messages ?? []).length > 0) {
				setHasInteracted(true);
			}
		}
	}, []);

	// Guardar conversación en localStorage cada vez que messages o hasInteracted cambian
	useEffect(() => {
		try {
			saveConversation(CONVERSATION_ID, messages, hasInteracted);
		} catch (err) {
			console.warn('[PatientChat] save effect failed', err);
		}
	}, [messages, hasInteracted]);

	// scroll automático al final cuando llegan nuevos mensajes o typing cambia
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, isTyping]);

	// foco en input al abrir panel
	useEffect(() => {
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 120);
			setUnread(0);
		}
	}, [open]);

	// cerrar con ESC y click fuera sin interferir con la burbuja
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setOpen(false);
		}
		function onDown(e: MouseEvent) {
			if (!open) return;
			const t = e.target as Node | null;
			if (!t) return;
			if (panelRef.current?.contains(t)) return;
			if (bubbleRef.current?.contains(t)) return;
			setOpen(false);
		}
		document.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', onDown);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('mousedown', onDown);
		};
	}, [open]);

	// obtiene access token del cliente Supabase (robusto a distintas formas)
	async function getAccessToken(): Promise<string | null> {
		try {
			const supabase = createSupabaseBrowserClient();
			const maybe = await (supabase.auth.getSession ? supabase.auth.getSession() : Promise.resolve(null));
			const access = (maybe as any)?.data?.session?.access_token ?? (maybe as any)?.session?.access_token ?? (maybe as any)?.access_token ?? null;
			return access ?? null;
		} catch (err) {
			console.warn('[PatientChat] getAccessToken failed', err);
			return null;
		}
	}

	async function sendMessageToApi(content: string) {
		const token = await getAccessToken();
		const res = await fetch('/api/patient/advice', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({ message: content }),
		});
		return res;
	}

	// Envía mensaje (desde input o quick prompt). NO añade mensajes de bienvenida automáticamente.
	const handleSendMessage = async (textArg?: string) => {
		const text = (textArg ?? input).trim();
		if (!text) return;

		// Si es la primera interacción, ocultar intro (expande chat)
		if (!hasInteracted) setHasInteracted(true);

		setErrorText(null);

		const userMsg: Message = { id: `u-${Date.now()}`, text, isUser: true, createdAt: nowISO() };
		setMessages((prev) => [...prev, userMsg]);
		setInput('');
		setIsLoading(true);
		setIsTyping(true);

		try {
			const response = await sendMessageToApi(text);

			if (response.status === 401) {
				setErrorText('No estás autenticado. Por favor inicia sesión.');
				const errMsg: Message = {
					id: `e-${Date.now()}`,
					text: 'No estás autenticado. Por favor inicia sesión.',
					isUser: false,
					createdAt: nowISO(),
				};
				setMessages((prev) => [...prev, errMsg]);
				return;
			}

			if (!response.ok) {
				let errText = 'Error al obtener respuesta de la IA';
				try {
					const errJson = await response.json();
					if (errJson?.error) errText = String(errJson.error);
				} catch {}
				throw new Error(errText);
			}

			// pequeña pausa estética para typing
			await new Promise((r) => setTimeout(r, 300));
			const data = await response.json();
			const aiText = data?.reply ?? 'Sin respuesta';
			const aiMsg: Message = { id: `a-${Date.now()}`, text: aiText, isUser: false, createdAt: nowISO() };
			setMessages((prev) => [...prev, aiMsg]);

			// si panel está cerrado, marcar unread
			if (!open) setUnread((u) => u + 1);
		} catch (err: any) {
			console.error(err);
			const aiMsg: Message = {
				id: `err-${Date.now()}`,
				text: 'Lo siento, ha ocurrido un error. Intenta más tarde.',
				isUser: false,
				createdAt: nowISO(),
			};
			setMessages((prev) => [...prev, aiMsg]);
			setErrorText(err?.message ?? 'Error desconocido');
		} finally {
			setIsLoading(false);
			setIsTyping(false);
		}
	};

	const handleQuick = (q: string) => {
		// marca interacción y envía prompt
		if (!hasInteracted) setHasInteracted(true);
		handleSendMessage(q);
	};

	// clases estilo corporativo / sanitario
	const bubbleGradient = 'bg-gradient-to-br from-[#0f766e] to-[#0369a1]';
	const panelShadow = 'shadow-[0_12px_40px_rgba(2,6,23,0.10)]';

	// TEXTO DE INTRO (solo en la tarjeta de introducción, no en el hilo)
	const INTRO_TITLE = '¿Cómo te puedo ayudar?';
	const INTRO_SUB = 'Escribe tus síntomas o elige una sugerencia. El asistente es una IA para orientación general — no sustituye una consulta médica.';

	/* ---------- keyboard helper: Enter = send, Shift+Enter = newline ---------- */
	const handleKeyDownOnInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			// no enviar si ya estamos enviando o input vacío
			if (isLoading) return;
			if (input.trim() === '') return;
			handleSendMessage();
		}
	};
	/* ----------------------------------------------------------------------- */

	return (
		<>
			{/* PANEL (oculto cuando open = false) */}
			<div ref={panelRef} aria-hidden={!open} className={`fixed right-6 bottom-20 z-50 w-[520px] max-w-[95vw] h-[520px] max-h-[80vh] transform transition-all duration-200 ease-out ${open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-6 opacity-0 pointer-events-none'} ${panelShadow} rounded-2xl overflow-hidden bg-white border border-slate-100 flex flex-col`} role="dialog" aria-label="Asistente médico (IA)">
				{/* HEADER */}
				<div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-lg bg-white ring-1 ring-slate-100 flex items-center justify-center">
							<svg className="w-6 h-6 text-[#0f766e]" viewBox="0 0 24 24" fill="none" aria-hidden>
								<path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Asesor Médico — Agente IA</div>
							<div className="text-xs text-slate-500">Orientación rápida para malestares generales</div>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{isTyping ? <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">Escribiendo…</div> : <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">Disponible</div>}
						<button onClick={() => setOpen(false)} aria-label="Cerrar panel" className="p-2 rounded-md hover:bg-slate-100 transition-colors">
							<svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none">
								<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
					</div>
				</div>

				{/* Intro card + quick prompts: SOLO se muestra si NO hay interacción */}
				{!hasInteracted && (
					<div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
						<div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4">
							<div className="text-sm text-slate-700">
								<div className="font-medium text-slate-900">{INTRO_TITLE}</div>
								<div className="block text-slate-500 text-xs mt-1">{INTRO_SUB}</div>
							</div>
						</div>

						{/* Quick prompts */}
						<div className="mt-3 flex flex-wrap gap-2">
							{QUICK_PROMPTS.map((q) => (
								<button key={q} onClick={() => handleQuick(q)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition" aria-label={`Sugerencia: ${q}`}>
									{q}
								</button>
							))}
						</div>
					</div>
				)}

				{/* MENSAJES (aquí SOLO aparecen los mensajes reales, nunca el intro) */}
				<div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-white to-slate-50" aria-live="polite" aria-atomic="false" role="region" aria-label="Mensajes del chat">
					{/* Placeholder inicial: SOLO mostrar si YA hubo interacción y no hay mensajes */}
					{hasInteracted && messages.length === 0 && <div className="text-center text-sm text-slate-500 px-3">Aquí aparecerán tus mensajes y las respuestas del asistente.</div>}

					{/* Mensajes reales */}
					{messages.length > 0 &&
						messages.map((m) => (
							<div key={m.id} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
								<div className={`flex flex-col ${m.isUser ? 'items-end' : 'items-start'}`}>
									<div
										className={`max-w-[78%] whitespace-pre-wrap break-words text-sm leading-6 ${m.isUser ? 'bg-[#0f766e] text-white rounded-2xl rounded-br-none px-4 py-2 shadow-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm'}`}
										// role presentation: message content for screen readers
										role="article"
										aria-label={m.isUser ? `Mensaje tuyo: ${m.text}` : `Respuesta: ${m.text}`}>
										{m.text}
									</div>
									<div className="text-[11px] text-slate-400 mt-1">{formatTime(m.createdAt)}</div>
								</div>
							</div>
						))}

					{/* typing indicator (solo visual) */}
					{isTyping && messages.length > 0 && (
						<div className="flex justify-start">
							<div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm text-sm text-slate-700">
								<span className="animate-pulse">Escribiendo…</span>
							</div>
						</div>
					)}
				</div>

				{/* FOOTER: input */}
				<footer className="px-6 py-4 bg-white border-t border-slate-100">
					{errorText && <div className="text-xs text-red-600 mb-2">{errorText}</div>}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							// si hay texto, marcar interacción y enviar
							if (input.trim() && !hasInteracted) setHasInteracted(true);
							handleSendMessage();
						}}
						className="flex items-end gap-3">
						{/* Textarea para multiline + accesibilidad */}
						<div className="flex-1">
							<label htmlFor="patient-chat-input" className="sr-only">
								Escribe tu consulta
							</label>
							<textarea id="patient-chat-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDownOnInput} placeholder="Describe tus síntomas o pregunta... (Enter enviar, Shift+Enter nueva línea)" disabled={isLoading} rows={2} className="w-full min-h-[44px] max-h-36 resize-y border border-slate-200 rounded-md px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent" aria-label="Escribe tu consulta. Enter para enviar, Shift+Enter para nueva línea" />
							<div className="mt-1 text-[11px] text-slate-400">Enter: enviar · Shift+Enter: nueva línea</div>
						</div>

						<button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow text-white font-medium transition-colors disabled:opacity-50 bg-gradient-to-r from-[#0f766e] to-[#0369a1] hover:from-[#0b5f57] hover:to-[#075f8b]" aria-label="Enviar mensaje">
							Enviar
						</button>
					</form>

					<div className="mt-2 text-xs text-slate-400">Información orientativa. No reemplaza una consulta médica.</div>
				</footer>
			</div>

			{/* BURBUJA FLOTANTE (minimizada) */}
			<button ref={bubbleRef} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} className={`fixed right-6 bottom-6 z-50 flex items-center justify-center w-16 h-16 rounded-full ${bubbleGradient} text-white shadow-lg ring-1 ring-slate-200 transform transition-all duration-200 hover:scale-105`}>
				{!open ? (
					<div className="relative flex items-center justify-center w-full h-full">
						<svg className="w-8 h-8 drop-shadow" viewBox="0 0 24 24" fill="none">
							<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
							<path d="M8 11h8M8 7h8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
						</svg>

						{/* IA badge */}
						<span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#0f766e]">IA</span>

						{/* unread */}
						{unread > 0 && <span className="absolute -top-2 -left-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-semibold">{unread}</span>}
					</div>
				) : (
					<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
						<path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				)}
			</button>
		</>
	);
}
