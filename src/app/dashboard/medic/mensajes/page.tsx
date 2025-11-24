// app/dashboard/medic/mensajes/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Clock, User, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

interface Conversation {
	id: string;
	title?: string;
	created_at: string;
	lastMessage?: {
		id: string;
		body: string;
		created_at: string;
		sender_id: string;
		recipient_user_id?: string;
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
	};
	unreadCount: number;
	patient?: {
		id: string;
		firstName: string;
		lastName: string;
	};
	doctor?: {
		id: string;
		name: string;
		specialty?: string;
	};
}

export default function MessagesPage() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const channelRef = useRef<any>(null);

	useEffect(() => {
		fetchConversations();
		
		// Obtener el ID del usuario actual
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

	// Suscripción a Realtime para nuevos mensajes del médico
	useEffect(() => {
		if (!currentUserId) return;

		const supabase = createSupabaseBrowserClient();
		
		// Limpiar suscripción anterior
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}

		// Crear canal para mensajes del médico
		const channel = supabase.channel(`realtime:messages:medic:${currentUserId}`);

		// Suscribirse a cambios en la tabla message donde el médico es sender o recipient
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'message',
				filter: `sender_id=eq.${currentUserId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Nuevo mensaje enviado:', payload);
				// Recargar conversaciones cuando se envíe un mensaje
				fetchConversations();
			}
		);

		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'message',
				filter: `recipient_user_id=eq.${currentUserId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Nuevo mensaje recibido:', payload);
				// Recargar conversaciones cuando llegue un mensaje nuevo
				fetchConversations();
			}
		);

		channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'message',
				filter: `recipient_user_id=eq.${currentUserId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Mensaje actualizado:', payload);
				// Recargar conversaciones cuando se actualice un mensaje
				fetchConversations();
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
	}, [currentUserId]);

	const fetchConversations = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/messages', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar conversaciones');

			const data = await res.json();
			
			// Procesar conversaciones para obtener información del paciente
			const processedConversations = (data.conversations || []).map((conv: any) => {
				// Obtener información del paciente del último mensaje
				const lastMsg = conv.lastMessage;
				const patient = lastMsg?.Patient ? {
					id: lastMsg.Patient.id,
					firstName: lastMsg.Patient.firstName,
					lastName: lastMsg.Patient.lastName,
				} : null;

				// Obtener información del doctor si es diferente al médico actual
				const doctor = lastMsg?.User && lastMsg.sender_id !== lastMsg.recipient_user_id ? {
					id: lastMsg.User.id || lastMsg.sender_id,
					name: lastMsg.User.name,
				} : null;

				return {
					...conv,
					patient,
					doctor,
				};
			});

			setConversations(processedConversations);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const filteredConversations = conversations.filter((conv) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			conv.title?.toLowerCase().includes(search) ||
			conv.lastMessage?.body?.toLowerCase().includes(search) ||
			conv.lastMessage?.sender?.name?.toLowerCase().includes(search) ||
			conv.lastMessage?.recipient?.name?.toLowerCase().includes(search) ||
			conv.patient?.firstName?.toLowerCase().includes(search) ||
			conv.patient?.lastName?.toLowerCase().includes(search)
		);
	});

	const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div>
					<div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
						<div className="p-2 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg sm:rounded-xl text-white">
							<MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
						</div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mensajes</h1>
						{totalUnread > 0 && (
							<span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full">
								{totalUnread}
							</span>
						)}
					</div>
					<p className="text-sm sm:text-base text-slate-600">Gestiona tus conversaciones con pacientes y colegas</p>
				</div>
			</div>

			{/* Búsqueda */}
			<div className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-3 sm:p-4 shadow-sm">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
					<input
						type="text"
						placeholder="Buscar conversaciones por paciente, doctor o mensaje..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-blue-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 bg-white"
					/>
				</div>
			</div>

			{/* Lista de conversaciones */}
			{loading ? (
				<div className="space-y-3 sm:space-y-4">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6 animate-pulse">
							<div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
							<div className="h-4 bg-slate-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			) : filteredConversations.length === 0 ? (
				<div className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-8 sm:p-12 text-center shadow-sm">
					<div className="p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
						<MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600" />
					</div>
					<p className="text-slate-600 text-base sm:text-lg font-medium mb-2">
						{searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
					</p>
					{searchTerm && (
						<p className="text-xs sm:text-sm text-slate-500">Intenta con otros términos de búsqueda</p>
					)}
				</div>
			) : (
				<div className="space-y-3 sm:space-y-4">
					<AnimatePresence>
						{filteredConversations.map((conv) => (
							<Link key={conv.id} href={`/dashboard/medic/mensajes/${conv.id}`}>
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer group"
								>
									<div className="flex items-start justify-between gap-3 sm:gap-4">
										<div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
											{/* Avatar */}
											<div className="flex-shrink-0">
												{conv.patient ? (
													<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold shadow-md text-sm sm:text-lg">
														<span>
															{conv.patient.firstName?.[0] || ''}
															{conv.patient.lastName?.[0] || ''}
														</span>
													</div>
												) : conv.doctor ? (
													<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
														<Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
													</div>
												) : (
													<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white shadow-md">
														<User className="w-6 h-6 sm:w-7 sm:h-7" />
													</div>
												)}
											</div>

											{/* Contenido */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-2 flex-wrap">
													<h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate">
														{conv.patient
															? `${conv.patient.firstName} ${conv.patient.lastName}`
															: conv.doctor
															? `Dr. ${conv.doctor.name}`
															: conv.title || `Conversación ${conv.id.slice(0, 8)}`}
													</h3>
													{conv.unreadCount > 0 && (
														<span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0">
															{conv.unreadCount}
														</span>
													)}
												</div>
												{conv.lastMessage && (
													<>
														<p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 line-clamp-2 group-hover:text-slate-900 transition-colors">
															{conv.lastMessage.body}
														</p>
														<div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500">
															<div className="flex items-center gap-1">
																<Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
																{new Date(conv.lastMessage.created_at).toLocaleDateString('es-ES', {
																	day: 'numeric',
																	month: 'short',
																	year: 'numeric',
																	hour: '2-digit',
																	minute: '2-digit',
																})}
															</div>
															{conv.lastMessage.sender && (
																<span className="text-slate-400 truncate">
																	• {conv.lastMessage.sender.name}
																</span>
															)}
															{conv.lastMessage.recipient && !conv.lastMessage.sender && (
																<span className="text-slate-400 truncate">
																	• {conv.lastMessage.recipient.name}
																</span>
															)}
														</div>
													</>
												)}
											</div>
										</div>

										{/* Indicador de no leído */}
										{conv.unreadCount > 0 && (
											<div className="flex-shrink-0">
												<div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-teal-600 rounded-full"></div>
											</div>
										)}
									</div>
								</motion.div>
							</Link>
						))}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
