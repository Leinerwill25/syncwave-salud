// app/dashboard/medic/mensajes/[id]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, User, Stethoscope, Clock, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

interface Message {
	id: string;
	sender_id: string;
	recipient_user_id?: string;
	patient_id?: string;
	body: string;
	attachments: string[];
	read: boolean;
	created_at: string;
	sender?: {
		id: string;
		name: string;
		email: string;
	};
	recipient?: {
		id: string;
		name: string;
		email: string;
	};
	Patient?: {
		id: string;
		firstName: string;
		lastName: string;
	};
}

interface Conversation {
	id: string;
	title?: string;
	messages: Message[];
	patient?: {
		id: string;
		firstName: string;
		lastName: string;
	};
}

export default function ConversationPage() {
	const params = useParams();
	const router = useRouter();
	const conversationId = params.id as string;
	const [conversation, setConversation] = useState<Conversation | null>(null);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [messageBody, setMessageBody] = useState('');
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const channelRef = useRef<any>(null);

	useEffect(() => {
		if (conversationId) {
			fetchConversation();
		}
	}, [conversationId]);

	// Suscripción a Realtime para nuevos mensajes en esta conversación
	useEffect(() => {
		if (!conversationId) return;

		const supabase = createSupabaseBrowserClient();
		
		// Limpiar suscripción anterior
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}

		// Crear canal para esta conversación
		const channel = supabase.channel(`realtime:messages:conversation:${conversationId}`);

		// Suscribirse a cambios en la tabla message para esta conversación
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'message',
				filter: `conversation_id=eq.${conversationId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Nuevo mensaje recibido:', payload);
				// Recargar conversación cuando llegue un mensaje nuevo
				fetchConversation();
			}
		);

		channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'message',
				filter: `conversation_id=eq.${conversationId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Mensaje actualizado:', payload);
				// Recargar conversación cuando se actualice un mensaje (ej: marcado como leído)
				fetchConversation();
			}
		);

		channel.subscribe((status: string) => {
			console.log('[Realtime] Estado de suscripción:', status);
		});

		channelRef.current = channel;

		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [conversationId]);

	useEffect(() => {
		scrollToBottom();
	}, [conversation?.messages]);

	// Obtener el ID del usuario actual
	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const res = await fetch('/api/auth/me', { credentials: 'include' });
				if (res.ok) {
					const data = await res.json();
					setCurrentUserId(data.id || null);
				}
			} catch (err) {
				console.error('Error obteniendo usuario actual:', err);
			}
		};
		fetchCurrentUser();
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const fetchConversation = async () => {
		try {
			const res = await fetch(`/api/medic/messages/${conversationId}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404 || res.status === 403) {
					router.push('/dashboard/medic/mensajes');
					return;
				}
				throw new Error('Error al cargar conversación');
			}

			const data = await res.json();
			
			// Procesar para obtener información del paciente
			const patient = data.messages?.find((msg: Message) => msg.Patient)?.Patient;
			
			setConversation({
				...data,
				patient: patient ? {
					id: patient.id,
					firstName: patient.firstName,
					lastName: patient.lastName,
				} : undefined,
			});
			setLoading(false);
		} catch (err) {
			console.error('Error:', err);
			setLoading(false);
		}
	};

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!messageBody.trim() || sending) return;

		setSending(true);
		try {
			// Obtener patient_id de la conversación
			const patientId = conversation?.patient?.id || 
				conversation?.messages?.find(m => m.patient_id)?.patient_id;

			const res = await fetch('/api/medic/messages/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					conversation_id: conversationId,
					patient_id: patientId,
					body: messageBody,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al enviar mensaje');
			}

			setMessageBody('');
			await fetchConversation();
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al enviar mensaje');
		} finally {
			setSending(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
				<div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
					<div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
				</div>
			</div>
		);
	}

	if (!conversation) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<p className="text-slate-600 text-lg mb-4">Conversación no encontrada</p>
					<Link href="/dashboard/medic/mensajes">
						<Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Volver a mensajes
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const isOwnMessage = (message: Message) => {
		return message.sender_id === currentUserId;
	};

	return (
		<div className="flex flex-col h-[calc(100vh-200px)]">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Link href="/dashboard/medic/mensajes">
					<Button
						variant="ghost"
						className="text-slate-600 hover:bg-blue-50 border border-blue-200"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div className="flex items-center gap-3 flex-1">
					{conversation.patient ? (
						<div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold shadow-md">
							<span className="text-lg">
								{conversation.patient.firstName?.[0] || ''}
								{conversation.patient.lastName?.[0] || ''}
							</span>
						</div>
					) : (
						<div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
							<Stethoscope className="w-6 h-6" />
						</div>
					)}
					<div>
						<h1 className="text-2xl font-bold text-slate-900">
							{conversation.patient
								? `${conversation.patient.firstName} ${conversation.patient.lastName}`
								: conversation.title || 'Conversación'}
						</h1>
						{conversation.patient && (
							<p className="text-sm text-slate-600">Paciente</p>
						)}
					</div>
				</div>
			</div>

			{/* Mensajes */}
			<div
				ref={messagesContainerRef}
				className="flex-1 bg-white rounded-2xl border border-blue-100 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-white via-blue-50/20 to-white"
			>
				{conversation.messages.length === 0 ? (
					<div className="text-center text-slate-500 py-12">
						<div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
							<MessageSquare className="w-10 h-10 text-teal-600" />
						</div>
						<p className="text-lg font-medium mb-2">No hay mensajes aún</p>
						<p className="text-sm">Inicia la conversación enviando un mensaje</p>
					</div>
				) : (
					<AnimatePresence>
						{conversation.messages.map((message) => {
							const isOwn = isOwnMessage(message);
							return (
								<motion.div
									key={message.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
								>
									<div
										className={`max-w-[75%] rounded-2xl p-4 shadow-md ${
											isOwn
												? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
												: 'bg-white border-2 border-blue-100 text-slate-900'
										}`}
									>
									{!isOwn && message.sender && (
										<div className="flex items-center gap-2 mb-2">
											<User className="w-4 h-4 text-teal-600" />
											<span className="font-semibold text-sm text-slate-700">
												{message.sender.name}
											</span>
										</div>
									)}
										{!isOwn && message.Patient && (
											<div className="flex items-center gap-2 mb-2">
												<User className="w-4 h-4 text-blue-600" />
												<span className="font-semibold text-sm text-slate-700">
													{message.Patient.firstName} {message.Patient.lastName}
												</span>
											</div>
										)}
										<p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
										<div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
											<span className={`text-xs ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>
												{new Date(message.created_at).toLocaleTimeString('es-ES', {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</span>
											{isOwn && (
												<span>
													{message.read ? (
														<CheckCheck className="w-4 h-4 text-white/80" />
													) : (
														<Check className="w-4 h-4 text-white/80" />
													)}
												</span>
											)}
										</div>
										{message.attachments && message.attachments.length > 0 && (
											<div className="mt-3 flex flex-wrap gap-2">
												{message.attachments.map((att, idx) => (
													<a
														key={idx}
														href={att}
														target="_blank"
														rel="noopener noreferrer"
														className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
															isOwn
																? 'bg-white/20 text-white hover:bg-white/30'
																: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
														}`}
													>
														<Paperclip className="w-3 h-3" />
														Archivo {idx + 1}
													</a>
												))}
											</div>
										)}
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input de mensaje */}
			<form
				onSubmit={handleSend}
				className="mt-4 bg-white rounded-2xl border border-blue-100 p-4 shadow-sm"
			>
				<div className="flex gap-3">
					<input
						type="text"
						value={messageBody}
						onChange={(e) => setMessageBody(e.target.value)}
						placeholder="Escribe un mensaje..."
						disabled={sending}
						className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 disabled:bg-slate-50 disabled:cursor-not-allowed"
					/>
					<Button
						type="submit"
						disabled={!messageBody.trim() || sending}
						className="px-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{sending ? (
							<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
						) : (
							<Send className="w-5 h-5" />
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
