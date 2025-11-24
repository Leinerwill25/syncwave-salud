'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, User, Check, CheckCheck, Plus, Stethoscope, Search, Clock, X, Paperclip, Sparkles, ChevronLeft } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

type Message = {
	id: string;
	body: string;
	attachments: string[];
	read: boolean;
	created_at: string;
	sender: {
		id: string;
		name: string | null;
		email: string | null;
		role?: string | null;
	} | null;
	recipient: {
		id: string;
		name: string | null;
		role?: string | null;
	} | null;
	conversation: {
		id: string;
		title: string | null;
	} | null;
};

type Conversation = {
	id: string;
	title: string | null;
	created_at: string;
	messages: Message[];
	lastMessage?: Message;
	unreadCount?: number;
	doctor?: {
		id: string;
		name: string | null;
		specialty: string | null;
		photo: string | null;
	};
};

type Doctor = {
	id: string;
	name: string | null;
	email: string | null;
	specialty: string | null;
	photo: string | null;
};

export default function MensajesPage() {
	const [loading, setLoading] = useState(true);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [messages, setMessages] = useState<Message[]>([]);
	const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
	const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
	const [showNewConversation, setShowNewConversation] = useState(false);
	const [newMessage, setNewMessage] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [sending, setSending] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [patientId, setPatientId] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const channelRef = useRef<any>(null);

	useEffect(() => {
		loadMessages();
		loadAvailableDoctors();
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, selectedConversation]);

	// Suscripción a Realtime para nuevos mensajes
	useEffect(() => {
		if (!patientId) return;

		const supabase = createSupabaseBrowserClient();
		
		// Limpiar suscripción anterior
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}

		// Crear canal para mensajes del paciente
		const channel = supabase.channel(`realtime:messages:patient:${patientId}`);

		// Suscribirse a cambios en la tabla message donde el paciente participa
		channel.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'message',
				filter: `patient_id=eq.${patientId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Nuevo mensaje recibido:', payload);
				// Recargar mensajes cuando llegue uno nuevo
				loadMessages();
			}
		);

		channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'message',
				filter: `patient_id=eq.${patientId}`,
			},
			(payload: any) => {
				console.log('[Realtime] Mensaje actualizado:', payload);
				// Recargar mensajes cuando se actualice uno (ej: marcado como leído)
				loadMessages();
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
	}, [patientId]);

	const loadMessages = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/messages', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar mensajes');

			const data = await res.json();
			
			// Obtener patientId de los mensajes o conversaciones
			if (data.messages && data.messages.length > 0 && data.messages[0].patient_id) {
				setPatientId(data.messages[0].patient_id);
			} else if (data.conversations && data.conversations.length > 0) {
				const firstConv = data.conversations[0];
				if (firstConv.messages && firstConv.messages.length > 0 && firstConv.messages[0].patient_id) {
					setPatientId(firstConv.messages[0].patient_id);
				}
			}
			
			// Procesar conversaciones con información del doctor
			const processedConversations = (data.conversations || []).map((conv: any) => {
				const messages = conv.messages || [];
				const lastMessage = messages[messages.length - 1];
				
				// Usar la información del doctor que viene de la API (doctorInfo)
				// Si no está disponible, intentar obtenerla de los mensajes
				let doctor = conv.doctorInfo || null;
				
				if (!doctor) {
					// Fallback: identificar al doctor desde los mensajes
					let doctorId: string | null = null;
					let doctorName: string | null = null;
					
					for (const msg of messages) {
						// Si el sender no es el paciente actual, entonces el sender es el doctor
						if (msg.sender?.id && msg.sender.id !== currentUserId && msg.sender.role === 'MEDICO') {
							doctorId = msg.sender.id;
							doctorName = msg.sender.name;
							break;
						}
						// Si el sender es el paciente, entonces el recipient es el doctor
						if (msg.sender?.id === currentUserId && msg.recipient?.id && msg.recipient.role === 'MEDICO') {
							doctorId = msg.recipient.id;
							doctorName = msg.recipient.name;
							break;
						}
					}
					
					doctor = doctorId ? {
						id: doctorId,
						name: doctorName,
						specialty: null,
						photo: null,
					} : null;
				}
				
				// Los mensajes no leídos son los que tienen sender (del médico) y no están leídos
				const unreadCount = messages.filter((m: Message) => {
					// Un mensaje no leído es uno que:
					// 1. No está leído
					// 2. El sender es el doctor (no el paciente)
					return !m.read && m.sender?.id && m.sender.id !== currentUserId;
				}).length;

				return {
					...conv,
					lastMessage,
					unreadCount,
					doctor,
				};
			});

			setConversations(processedConversations);
			setMessages(data.messages || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	// Obtener el ID del usuario actual (paciente)
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

	const loadAvailableDoctors = async () => {
		try {
			const res = await fetch('/api/patient/messages/available-doctors', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setAvailableDoctors(data.doctors || []);
			}
		} catch (err) {
			console.error('Error cargando doctores disponibles:', err);
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const handleStartConversation = async (doctor: Doctor) => {
		setSelectedDoctor(doctor);
		setShowNewConversation(false);
		setSelectedConversation(null);
		// Buscar si ya existe una conversación con este doctor
		const existingConv = conversations.find((conv) => {
			return conv.doctor?.id === doctor.id;
		});
		if (existingConv) {
			setSelectedConversation(existingConv.id);
			setSelectedDoctor(null);
		}
	};

	const handleSendMessage = async () => {
		if (!newMessage.trim() || sending) return;

		setSending(true);
		try {
			// Si hay un doctor seleccionado pero no hay conversación, crear una nueva
			let conversationId = selectedConversation;
			let recipientUserId = null;

			if (selectedDoctor && !conversationId) {
				// Crear nueva conversación
				const convRes = await fetch('/api/patient/messages/conversation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						title: `Conversación con Dr. ${selectedDoctor.name}`,
						recipient_user_id: selectedDoctor.id,
					}),
				});

				if (convRes.ok) {
					const convData = await convRes.json();
					conversationId = convData.data?.id || convData.id || null;
				}

				recipientUserId = selectedDoctor.id;
			} else if (selectedConversation) {
				// Obtener el recipient de la conversación
				const conv = conversations.find(c => c.id === selectedConversation);
				if (conv?.doctor) {
					recipientUserId = conv.doctor.id;
				}
			}

			if (!conversationId && !recipientUserId) {
				alert('Debe seleccionar un destinatario');
				return;
			}

			const res = await fetch('/api/patient/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					conversation_id: conversationId,
					recipient_user_id: recipientUserId,
					body: newMessage,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Error al enviar mensaje');
			}

			setNewMessage('');
			setSelectedDoctor(null);
			if (conversationId) {
				setSelectedConversation(conversationId);
			}
			await loadMessages();
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al enviar el mensaje');
		} finally {
			setSending(false);
		}
	};

	const currentConversation = selectedConversation
		? conversations.find(c => c.id === selectedConversation)
		: null;

	const currentMessages = currentConversation?.messages || [];

	const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

	const filteredConversations = conversations.filter((conv) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			conv.title?.toLowerCase().includes(search) ||
			conv.doctor?.name?.toLowerCase().includes(search) ||
			conv.lastMessage?.body?.toLowerCase().includes(search)
		);
	});

	const filteredDoctors = availableDoctors.filter((doctor) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			doctor.name?.toLowerCase().includes(search) ||
			doctor.specialty?.toLowerCase().includes(search)
		);
	});

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-3 sm:p-4 md:p-6 h-screen overflow-hidden">
			<div className="max-w-7xl mx-auto h-full flex flex-col">
				{/* Header Principal */}
				<div className="mb-3 sm:mb-4 md:mb-6 flex-shrink-0">
					<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-1 sm:mb-2">
						<div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
							<MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
						</div>
						<div className="min-w-0 flex-1">
							<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 truncate">Centro de Mensajería</h1>
							<p className="text-slate-600 text-xs sm:text-sm mt-0.5 sm:mt-1">Comunícate directamente con tus especialistas</p>
						</div>
					</div>
				</div>

				{/* Contenedor Principal */}
				<div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 backdrop-blur-sm flex-1 min-h-0 flex flex-col">
					<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[420px_1fr] flex-1 min-h-0 h-full">
						{/* Sidebar - Lista de conversaciones */}
						<div className={`${selectedConversation || selectedDoctor ? 'hidden lg:flex' : 'flex'} border-r border-slate-200/60 bg-gradient-to-b from-white via-slate-50/50 to-white flex-col`}>
							{/* Header del Sidebar */}
							<div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-blue-50/30 backdrop-blur-sm">
								<div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<div className="relative flex-shrink-0">
											<div className="p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-md">
												<MessageSquare className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
											</div>
											{unreadCount > 0 && (
												<span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 px-1.5 sm:px-2 py-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full shadow-lg animate-pulse">
													{unreadCount > 99 ? '99+' : unreadCount}
												</span>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate">Conversaciones</h2>
											<p className="text-[10px] sm:text-xs text-slate-500">{conversations.length} activas</p>
										</div>
									</div>
									{availableDoctors.length > 0 && (
										<button
											onClick={() => setShowNewConversation(!showNewConversation)}
											className="p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg hover:scale-105 flex-shrink-0"
											title="Nueva conversación"
										>
											<Plus className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
										</button>
									)}
								</div>

								{/* Búsqueda Mejorada */}
								<div className="relative">
									<Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
									<input
										type="text"
										placeholder="Buscar conversaciones o doctores..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full pl-9 sm:pl-10 md:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 text-xs sm:text-sm transition-all shadow-sm hover:shadow-md"
									/>
								</div>
							</div>

							{/* Lista de doctores disponibles para nueva conversación */}
							<AnimatePresence>
								{showNewConversation && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className="overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-teal-50/50 via-cyan-50/30 to-blue-50/20"
									>
										<div className="p-3 sm:p-4 md:p-5">
											<div className="flex items-center justify-between mb-3 sm:mb-4">
												<div className="flex items-center gap-1.5 sm:gap-2">
													<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 flex-shrink-0" />
													<p className="text-xs sm:text-sm font-bold text-slate-900">Nueva Conversación</p>
												</div>
												<button
													onClick={() => setShowNewConversation(false)}
													className="p-1 sm:p-1.5 hover:bg-teal-100 rounded-lg transition-colors flex-shrink-0"
												>
													<X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
												</button>
											</div>
											<div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-60 md:max-h-72 overflow-y-auto custom-scrollbar">
												{filteredDoctors.length === 0 ? (
													<div className="text-center py-6 sm:py-8">
														<Stethoscope className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
														<p className="text-[10px] sm:text-xs text-slate-500">No hay doctores disponibles</p>
													</div>
												) : (
													filteredDoctors.map((doctor) => (
														<motion.button
															key={doctor.id}
															onClick={() => handleStartConversation(doctor)}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 bg-white rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all text-left border-2 border-slate-100 hover:border-teal-200 shadow-sm hover:shadow-md"
														>
															{doctor.photo ? (
																<img
																	src={doctor.photo}
																	alt={doctor.name || ''}
																	className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 sm:border-3 border-teal-200 shadow-md flex-shrink-0"
																/>
															) : (
																<div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-lg ring-1 sm:ring-2 ring-teal-200 flex-shrink-0">
																	<Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
																</div>
															)}
															<div className="flex-1 min-w-0">
																<p className="font-bold text-slate-900 truncate text-xs sm:text-sm">Dr. {doctor.name}</p>
																{doctor.specialty && (
																	<p className="text-[10px] sm:text-xs text-slate-600 truncate mt-0.5">{doctor.specialty}</p>
																)}
															</div>
														</motion.button>
													))
												)}
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							{/* Lista de conversaciones */}
							<div className="flex-1 overflow-y-auto custom-scrollbar">
								{loading ? (
									<div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
										{Array.from({ length: 5 }).map((_, i) => (
											<div key={i} className="h-16 sm:h-20 md:h-24 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg sm:rounded-xl md:rounded-2xl animate-pulse"></div>
										))}
									</div>
								) : filteredConversations.length === 0 ? (
									<div className="p-6 sm:p-8 md:p-12 text-center">
										<div className="p-3 sm:p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
											<MessageSquare className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-slate-400" />
										</div>
										<p className="text-slate-600 font-medium mb-1 text-xs sm:text-sm md:text-base">No hay conversaciones</p>
										<p className="text-[10px] sm:text-xs text-slate-400">Inicia una nueva conversación con tu especialista</p>
									</div>
								) : (
									<div className="divide-y divide-slate-100">
										{filteredConversations.map((conv) => {
											const isSelected = selectedConversation === conv.id;
											return (
												<motion.button
													key={conv.id}
													onClick={() => {
														setSelectedConversation(conv.id);
														setSelectedDoctor(null);
														setShowNewConversation(false);
													}}
													whileHover={{ x: 2 }}
													className={`w-full p-3 sm:p-4 md:p-5 text-left transition-all ${
														isSelected 
															? 'bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-l-4 border-teal-500 shadow-sm' 
															: 'hover:bg-slate-50/80'
													}`}
												>
													<div className="flex items-start gap-2 sm:gap-3 md:gap-4">
														{conv.doctor?.photo ? (
															<img
																src={conv.doctor.photo}
																alt={conv.doctor.name || ''}
																className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 sm:border-3 border-teal-200 shadow-md flex-shrink-0"
															/>
														) : (
															<div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-lg ring-1 sm:ring-2 ring-teal-200">
																<Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
															</div>
														)}
														<div className="flex-1 min-w-0">
															<div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
																<h3 className="font-bold text-slate-900 truncate text-xs sm:text-sm md:text-base">
																	{conv.doctor?.name ? `Dr. ${conv.doctor.name}` : conv.title || 'Conversación'}
																</h3>
																{conv.unreadCount && conv.unreadCount > 0 && (
																	<span className="px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full flex-shrink-0 ml-1 sm:ml-2 shadow-md animate-pulse">
																		{conv.unreadCount > 99 ? '99+' : conv.unreadCount}
																	</span>
																)}
															</div>
															{conv.lastMessage && (
																<>
																	<p className="text-[10px] sm:text-xs md:text-sm text-slate-600 line-clamp-2 mb-1 sm:mb-2 leading-relaxed break-words">
																		{conv.lastMessage.body}
																	</p>
																	<div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] md:text-xs text-slate-500">
																		<Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
																		{new Date(conv.lastMessage.created_at).toLocaleDateString('es-ES', {
																			day: 'numeric',
																			month: 'short',
																			hour: '2-digit',
																			minute: '2-digit',
																		})}
																	</div>
																</>
															)}
															{conv.doctor?.specialty && (
																<p className="text-[9px] sm:text-[10px] md:text-xs text-slate-500 mt-1 sm:mt-2 font-medium truncate">{conv.doctor.specialty}</p>
															)}
														</div>
													</div>
												</motion.button>
											);
										})}
									</div>
								)}
							</div>
						</div>

						{/* Área de mensajes */}
						<div className="flex flex-col bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 h-full min-h-0">
							{currentConversation || selectedDoctor ? (
								<>
									{/* Header del chat mejorado */}
									<div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-slate-200/60 bg-gradient-to-r from-white via-teal-50/30 to-cyan-50/20 backdrop-blur-sm shadow-sm flex-shrink-0">
										<div className="flex items-center gap-2 sm:gap-3 md:gap-4">
											<button
												onClick={() => {
													setSelectedConversation(null);
													setSelectedDoctor(null);
												}}
												className="lg:hidden p-1.5 hover:bg-teal-100 rounded-lg transition-colors flex-shrink-0 mr-1"
											>
												<ChevronLeft className="w-4 h-4 text-slate-600" />
											</button>
											{currentConversation?.doctor?.photo || selectedDoctor?.photo ? (
												<img
													src={currentConversation?.doctor?.photo || selectedDoctor?.photo || ''}
													alt={currentConversation?.doctor?.name || selectedDoctor?.name || ''}
													className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover border-2 sm:border-3 border-teal-200 shadow-lg ring-1 sm:ring-2 ring-teal-100 flex-shrink-0"
												/>
											) : (
												<div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg ring-1 sm:ring-2 ring-teal-200 flex-shrink-0">
													<Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
												</div>
											)}
											<div className="flex-1 min-w-0">
												<h2 className="font-bold text-slate-900 text-sm sm:text-base md:text-lg truncate">
													{currentConversation?.doctor?.name
														? `Dr. ${currentConversation.doctor.name}`
														: selectedDoctor
														? `Dr. ${selectedDoctor.name}`
														: currentConversation?.title || 'Conversación'}
												</h2>
												{currentConversation?.doctor?.specialty && (
													<p className="text-[10px] sm:text-xs md:text-sm text-slate-600 mt-0.5 truncate">{currentConversation.doctor.specialty}</p>
												)}
											</div>
										</div>
									</div>

									{/* Mensajes con diseño mejorado */}
									<div
										ref={messagesContainerRef}
										className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4 md:space-y-6 bg-gradient-to-b from-white via-slate-50/20 to-blue-50/10 custom-scrollbar min-h-0"
									>
										{currentMessages.length === 0 ? (
											<div className="flex items-center justify-center h-full">
												<div className="text-center px-4">
													<div className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 shadow-lg">
														<MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-slate-400" />
													</div>
													<h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-1 sm:mb-2">No hay mensajes aún</h3>
													<p className="text-xs sm:text-sm text-slate-500">Inicia la conversación enviando un mensaje</p>
												</div>
											</div>
										) : (
											currentMessages.map((msg) => {
												const isPatientMessage = 
													(msg.recipient !== null && msg.recipient.id !== null) ||
													(currentUserId !== null && msg.sender?.id === currentUserId);

												return (
													<motion.div
														key={msg.id}
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ duration: 0.3 }}
														className={`flex ${isPatientMessage ? 'justify-end' : 'justify-start'}`}
													>
														<div
															className={`max-w-[85%] sm:max-w-[80%] md:max-w-[78%] rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg ${
																isPatientMessage
																	? 'bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white'
																	: 'bg-white border-2 border-slate-200 text-slate-900 shadow-md'
															}`}
														>
															{!isPatientMessage && msg.sender && (
																<div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-slate-200">
																	<User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 flex-shrink-0" />
																	<span className="font-bold text-xs sm:text-sm text-slate-700 truncate">
																		{msg.sender.name || 'Médico'}
																	</span>
																</div>
															)}
															<p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mb-2 sm:mb-3 break-words">{msg.body}</p>
															<div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/20">
																<span className={`text-[10px] sm:text-xs font-medium ${isPatientMessage ? 'text-white/90' : 'text-slate-500'}`}>
																	{new Date(msg.created_at).toLocaleTimeString('es-ES', {
																		hour: '2-digit',
																		minute: '2-digit',
																	})}
																</span>
																{isPatientMessage && (
																	<span>
																		{msg.read ? (
																			<CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
																		) : (
																			<Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
																		)}
																	</span>
																)}
															</div>
															{msg.attachments && msg.attachments.length > 0 && (
																<div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-white/20">
																	{msg.attachments.map((att, idx) => (
																		<a
																			key={idx}
																			href={att}
																			target="_blank"
																			rel="noopener noreferrer"
																			className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium transition-all hover:scale-105 ${
																				isPatientMessage
																					? 'bg-white/20 text-white hover:bg-white/30 shadow-md'
																					: 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm'
																			}`}
																		>
																			<Paperclip className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
																			Archivo {idx + 1}
																		</a>
																	))}
																</div>
															)}
														</div>
													</motion.div>
												);
											})
										)}
										<div ref={messagesEndRef} />
									</div>

									{/* Input de mensaje mejorado */}
									<div className="p-3 sm:p-4 md:p-5 lg:p-6 border-t border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg flex-shrink-0">
										<form
											onSubmit={(e) => {
												e.preventDefault();
												handleSendMessage();
											}}
											className="flex items-end gap-2 sm:gap-3 md:gap-4"
										>
											<div className="flex-1 min-w-0">
												<textarea
													value={newMessage}
													onChange={(e) => setNewMessage(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' && !e.shiftKey) {
															e.preventDefault();
															handleSendMessage();
														}
													}}
													placeholder="Escribe tu mensaje aquí..."
													disabled={sending}
													rows={2}
													className="w-full px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 border-2 border-slate-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 disabled:bg-slate-50 disabled:cursor-not-allowed resize-none shadow-sm transition-all max-h-28 sm:max-h-32 overflow-y-auto text-xs sm:text-sm"
												/>
											</div>
											<button
												type="submit"
												disabled={!newMessage.trim() || sending || (!selectedConversation && !selectedDoctor)}
												className="p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white rounded-xl sm:rounded-2xl hover:from-teal-700 hover:via-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105 active:scale-95 flex-shrink-0"
											>
												{sending ? (
													<div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
												) : (
													<Send className="w-4 h-4 sm:w-5 sm:h-5" />
												)}
											</button>
										</form>
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 min-h-0 overflow-hidden">
									<div className="text-center max-w-md px-4 sm:px-6 md:px-8">
										<motion.div
											initial={{ scale: 0.9, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-full w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 shadow-2xl"
										>
											<MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
										</motion.div>
										<h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">Centro de Mensajería</h3>
										<p className="text-xs sm:text-sm md:text-base text-slate-600 mb-4 sm:mb-5 md:mb-6 leading-relaxed px-2">
											Selecciona una conversación existente o inicia una nueva para comunicarte con tus especialistas de manera directa y segura.
										</p>
										{availableDoctors.length > 0 && (
											<button
												onClick={() => setShowNewConversation(true)}
												className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white rounded-xl sm:rounded-2xl font-bold hover:from-teal-700 hover:via-cyan-700 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base"
											>
												<Plus className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 inline mr-1.5 sm:mr-2" />
												Nueva Conversación
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 8px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: transparent;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: linear-gradient(to bottom, #14b8a6, #06b6d4);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: linear-gradient(to bottom, #0d9488, #0891b2);
				}
			`}</style>
		</div>
	);
}
