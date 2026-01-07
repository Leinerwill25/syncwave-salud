'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Loader2, Search, User, Clock, Check, CheckCheck, Plus, Sparkles, Bot } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { getRoleUserSession } from '@/lib/role-user-auth-client';
import { toast } from 'sonner';

type Conversation = {
	userId: string;
	userType: 'user' | 'role_user';
	userName: string;
	lastMessage: string;
	lastMessageTime: string;
	unreadCount: number;
	lastMessageSenderId: string;
	lastMessageSenderType: string;
};

type Message = {
	id: string;
	sender_id: string;
	sender_type: string;
	receiver_id: string;
	receiver_type: string;
	message: string;
	is_read: boolean;
	created_at: string;
};

export default function MensajeriaPage() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [currentUserType, setCurrentUserType] = useState<'user' | 'role_user'>('user');
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; type: 'user' | 'role_user'; name: string }>>([]);
	const [showNewConversation, setShowNewConversation] = useState(false);
	const [selectedNewUser, setSelectedNewUser] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const supabase = createSupabaseBrowserClient();
	const channelRef = useRef<any | null>(null);
	const mountedRef = useRef(false);
	const previousUnreadCountRef = useRef<number>(0);
	const selectedConversationRef = useRef<Conversation | null>(null);
	const shouldAutoScrollRef = useRef(false);
	const isInitialLoadRef = useRef(true);

	// Definir funciones antes de los useEffect que las usan
	const loadConversations = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/conversations', {
				credentials: 'include',
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setConversations(data.conversations || []);
			}
		} catch (err) {
			console.error('[Mensajeria] Error cargando conversaciones:', err);
		}
	}, []);

	const loadMessages = useCallback(async (userId: string, userType: string) => {
		try {
			const res = await fetch(`/api/messaging/messages/${userId}?userType=${userType}`, {
				credentials: 'include',
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setMessages(data.messages || []);
			}
		} catch (err) {
			console.error('[Mensajeria] Error cargando mensajes:', err);
		}
	}, []);

	const loadAvailableUsers = useCallback(async () => {
		try {
			const res = await fetch('/api/messaging/users', {
				credentials: 'include',
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setAvailableUsers(data.users || []);
			}
		} catch (err) {
			console.error('[Mensajeria] Error cargando usuarios:', err);
		}
	}, []);

	const handleSelectConversation = useCallback(
		(conv: Conversation) => {
			setSelectedConversation(conv);
			selectedConversationRef.current = conv;
			isInitialLoadRef.current = true;
			shouldAutoScrollRef.current = false;
			loadMessages(conv.userId, conv.userType);
			setShowNewConversation(false);
		},
		[loadMessages]
	);

	const unsubscribeFromMessages = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
	}, [supabase]);

	const markAsRead = useCallback(async (messageId: string) => {
		try {
			await fetch('/api/messaging/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ messageId }),
			});
		} catch (err) {
			console.error('[Mensajeria] Error marcando como leído:', err);
		}
	}, []);

	const subscribeToMessages = useCallback(() => {
		if (!organizationId || !currentUserId) return;

		// Limpiar suscripción anterior
		unsubscribeFromMessages();

		// Crear canal para mensajes
		const channel = supabase
			.channel(`realtime:messages:${currentUserId}:${currentUserType}`, {
				config: {
					broadcast: { self: true },
				},
			})
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'private_messages',
					filter: `organization_id=eq.${organizationId}`,
				},
				(payload: any) => {
					console.log('[Mensajeria Realtime] Nuevo mensaje recibido:', payload);
					const newMessage = payload.new;

					if (!newMessage) return;

					// Verificar si el mensaje es relevante para el usuario actual
					const isForCurrentUser = newMessage.receiver_id === currentUserId && newMessage.receiver_type === currentUserType;
					const isFromCurrentUser = newMessage.sender_id === currentUserId && newMessage.sender_type === currentUserType;

					if (isForCurrentUser || isFromCurrentUser) {
						// Obtener selectedConversation actual desde el ref
						const currentConv = selectedConversationRef.current;

						// Verificar si es de la conversación actual
						const isFromSelectedConversation = currentConv && ((newMessage.sender_id === currentConv.userId && newMessage.sender_type === currentConv.userType) || (newMessage.receiver_id === currentConv.userId && newMessage.receiver_type === currentConv.userType));

						// Si estamos viendo esta conversación, agregar el mensaje a la lista
						if (isFromSelectedConversation && currentConv) {
							setMessages((prev) => {
								// Evitar duplicados
								if (prev.find((m) => m.id === newMessage.id)) {
									console.log('[Mensajeria] Mensaje duplicado, ignorando');
									return prev;
								}
								console.log('[Mensajeria] Agregando nuevo mensaje a la conversación actual');
								return [...prev, newMessage];
							});

							// Marcar como leído si es para el usuario actual
							if (isForCurrentUser) {
								markAsRead(newMessage.id);
							}
						} else if (isForCurrentUser && !isFromSelectedConversation) {
							// Mostrar notificación toast si hay un nuevo mensaje de otra conversación
							toast.info('Nuevo mensaje recibido', {
								description: newMessage.message.substring(0, 50) + (newMessage.message.length > 50 ? '...' : ''),
								duration: 5000,
							});
						}

						// Siempre recargar conversaciones para actualizar contadores y últimos mensajes
						if (mountedRef.current) {
							console.log('[Mensajeria] Recargando lista de conversaciones');
							loadConversations();
						}
					}
				}
			)
			.subscribe((status, err) => {
				console.log('[Mensajeria] Estado de suscripción Realtime:', status);
				if (err) {
					console.error('[Mensajeria] Error en suscripción Realtime:', err);
				}
				if (status === 'SUBSCRIBED') {
					console.log('[Mensajeria] ✅ Suscrito exitosamente a mensajes en tiempo real');
				} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
					console.error('[Mensajeria] ❌ Error o timeout en suscripción Realtime');
				}
			});

		channelRef.current = channel;
	}, [organizationId, currentUserId, currentUserType, supabase, loadConversations, unsubscribeFromMessages, markAsRead]);

	// Cargar información del usuario actual
	useEffect(() => {
		mountedRef.current = true;

		const loadUserInfo = async () => {
			try {
				// Intentar role-user primero
				const roleUserSession = await getRoleUserSession();
				if (roleUserSession) {
					setCurrentUserId(roleUserSession.roleUserId);
					setCurrentUserType('role_user');
					setOrganizationId(roleUserSession.organizationId);
					return;
				}

				// Si no es role-user, obtener usuario regular
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (user) {
					const { data: appUser } = await supabase.from('user').select('id, organizationId').eq('authId', user.id).maybeSingle();

					if (appUser) {
						setCurrentUserId(appUser.id);
						setCurrentUserType('user');
						setOrganizationId(appUser.organizationId);
					}
				}
			} catch (err) {
				console.error('[Mensajeria] Error cargando usuario:', err);
			}
		};

		loadUserInfo();

		return () => {
			mountedRef.current = false;
		};
	}, [supabase]);

	// Cargar conversaciones y usuarios disponibles
	useEffect(() => {
		if (!currentUserId) return;

		setLoading(true);
		Promise.all([loadConversations(), loadAvailableUsers()])
			.catch((err) => {
				console.error('[Mensajeria] Error cargando datos iniciales:', err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [currentUserId, loadConversations, loadAvailableUsers]);

	// Suscribirse a mensajes en tiempo real
	useEffect(() => {
		if (!currentUserId || !organizationId) {
			console.log('[Mensajeria] No se puede suscribir - faltan datos:', { currentUserId, organizationId });
			return;
		}

		console.log('[Mensajeria] Iniciando suscripción a Realtime...');
		subscribeToMessages();

		return () => {
			console.log('[Mensajeria] Limpiando suscripción Realtime');
			unsubscribeFromMessages();
		};
	}, [currentUserId, currentUserType, organizationId, subscribeToMessages, unsubscribeFromMessages]);

	// Scroll automático al final de los mensajes (solo cuando es necesario)
	useEffect(() => {
		if (shouldAutoScrollRef.current && messagesContainerRef.current && messagesEndRef.current) {
			// Usar scrollTop para mejor control
			const container = messagesContainerRef.current;
			container.scrollTop = container.scrollHeight;
			shouldAutoScrollRef.current = false;
		} else if (isInitialLoadRef.current && messages.length > 0) {
			// Solo hacer scroll automático en la carga inicial
			if (messagesContainerRef.current) {
				const container = messagesContainerRef.current;
				setTimeout(() => {
					container.scrollTop = container.scrollHeight;
				}, 100);
				isInitialLoadRef.current = false;
			}
		}
	}, [messages]);

	// Detectar nuevos mensajes no leídos y mostrar notificación
	useEffect(() => {
		const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
		if (totalUnread > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
			const newMessagesCount = totalUnread - previousUnreadCountRef.current;
			const latestConversation = conversations.find((c) => c.unreadCount > 0);
			if (latestConversation && !selectedConversation) {
				toast.info(`Nuevo mensaje de ${latestConversation.userName}`, {
					description: latestConversation.lastMessage.substring(0, 50) + (latestConversation.lastMessage.length > 50 ? '...' : ''),
					duration: 5000,
					action: {
						label: 'Ver',
						onClick: () => handleSelectConversation(latestConversation),
					},
				});
			}
		}
		previousUnreadCountRef.current = totalUnread;
	}, [conversations, selectedConversation, handleSelectConversation]);

	// Sincronizar ref con estado
	useEffect(() => {
		selectedConversationRef.current = selectedConversation;
	}, [selectedConversation]);

	const handleStartNewConversation = (userId: string, userType: 'user' | 'role_user', userName: string) => {
		const newConv: Conversation = {
			userId,
			userType,
			userName,
			lastMessage: '',
			lastMessageTime: new Date().toISOString(),
			unreadCount: 0,
			lastMessageSenderId: '',
			lastMessageSenderType: '',
		};
		setSelectedConversation(newConv);
		setMessages([]);
		setShowNewConversation(false);
		setSelectedNewUser(null);
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMessage.trim() || !selectedConversation || sending) return;

		try {
			setSending(true);
			const res = await fetch('/api/messaging/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					receiver_id: selectedConversation.userId,
					receiver_type: selectedConversation.userType,
					message: newMessage.trim(),
				}),
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setNewMessage('');
				// Activar scroll automático cuando se envía un mensaje
				shouldAutoScrollRef.current = true;
				// El mensaje se agregará automáticamente vía Realtime
				loadConversations();
			} else {
				toast.error(data.error || 'Error al enviar mensaje');
			}
		} catch (err) {
			console.error('[Mensajeria] Error enviando mensaje:', err);
			toast.error('Error al enviar mensaje');
		} finally {
			setSending(false);
		}
	};

	const filteredConversations = conversations.filter((conv) => conv.userName.toLowerCase().includes(searchTerm.toLowerCase()));

	const isMessageFromCurrentUser = (message: Message) => {
		return message.sender_id === currentUserId && message.sender_type === currentUserType;
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
		} else if (diffInHours < 48) {
			return 'Ayer';
		} else {
			return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="w-full h-[calc(100vh-180px)] flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
			{/* Header mejorado */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl blur-xl opacity-30"></div>
							<div className="relative bg-gradient-to-r from-teal-600 to-cyan-600 p-4 rounded-2xl shadow-lg">
								<MessageSquare className="w-8 h-8 text-white" />
							</div>
						</div>
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Mensajería Privada</h1>
							<p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-teal-500" />
								Comunicación en tiempo real con tu equipo
							</p>
						</div>
					</div>
				</div>
			</motion.div>

			<div className="flex-1 flex gap-6 min-h-0">
				{/* Lista de conversaciones - diseño mejorado */}
				<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-96 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 flex flex-col overflow-hidden">
					<div className="p-5 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white space-y-4">
						<button onClick={() => setShowNewConversation(!showNewConversation)} className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:via-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold group">
							<Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
							Nueva Conversación
						</button>

						<AnimatePresence>
							{showNewConversation && (
								<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
									<select value={selectedNewUser || ''} onChange={(e) => setSelectedNewUser(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white shadow-sm transition-all">
										<option value="">Seleccionar usuario...</option>
										{availableUsers
											.filter((u) => !conversations.find((c) => c.userId === u.id && c.userType === u.type))
											.map((user) => (
												<option key={`${user.type}_${user.id}`} value={`${user.type}_${user.id}`}>
													{user.name} ({user.type === 'role_user' ? 'Usuario' : 'Doctor'})
												</option>
											))}
									</select>
									{selectedNewUser && (
										<motion.button
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											onClick={() => {
												const [userType, userId] = selectedNewUser.split('_');
												const user = availableUsers.find((u) => u.id === userId && u.type === userType);
												if (user) {
													handleStartNewConversation(userId, userType as 'user' | 'role_user', user.name);
												}
											}}
											className="w-full px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all text-sm font-medium shadow-md">
											Iniciar conversación
										</motion.button>
									)}
								</motion.div>
							)}
						</AnimatePresence>

						<div className="relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input type="text" placeholder="Buscar conversación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm transition-all" />
						</div>
					</div>

					<div className="flex-1 overflow-y-auto custom-scrollbar">
						{filteredConversations.length === 0 ? (
							<div className="p-12 text-center text-slate-400">
								<MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
								<p className="font-medium">No hay conversaciones</p>
								<p className="text-sm mt-1">Inicia una nueva conversación para comenzar</p>
							</div>
						) : (
							filteredConversations.map((conv) => (
								<motion.div key={`${conv.userType}_${conv.userId}`} whileHover={{ backgroundColor: 'rgba(20, 184, 166, 0.05)', x: 2 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectConversation(conv)} className={`p-4 border-b border-slate-100 cursor-pointer transition-all relative ${selectedConversation?.userId === conv.userId && selectedConversation?.userType === conv.userType ? 'bg-gradient-to-r from-teal-50 to-cyan-50/50 border-l-4 border-l-teal-600 shadow-sm' : 'hover:bg-slate-50/50'}`}>
									{conv.unreadCount > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-2.5 h-2.5 bg-teal-600 rounded-full ring-2 ring-white" />}
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-3">
												<div className="relative shrink-0">
													<div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-base shadow-lg ring-2 ring-white">{conv.userName[0]?.toUpperCase() || 'U'}</div>
													{conv.unreadCount > 0 && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</div>}
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-slate-900 truncate text-sm">{conv.userName}</h3>
													<p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage || 'Sin mensajes'}</p>
												</div>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<span className="text-xs text-slate-400 font-medium">{formatTime(conv.lastMessageTime)}</span>
										</div>
									</div>
								</motion.div>
							))
						)}
					</div>
				</motion.div>

				{/* Área de mensajes - diseño mejorado */}
				<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 flex flex-col min-w-0 overflow-hidden">
					{selectedConversation ? (
						<>
							{/* Header del chat */}
							<div className="p-5 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white">{selectedConversation.userName[0]?.toUpperCase() || 'U'}</div>
									<div>
										<h2 className="font-bold text-slate-900 text-lg">{selectedConversation.userName}</h2>
										<p className="text-xs text-slate-500 flex items-center gap-1">
											{selectedConversation.userType === 'role_user' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
											{selectedConversation.userType === 'role_user' ? 'Usuario de rol' : 'Doctor'}
										</p>
									</div>
								</div>
							</div>

							{/* Mensajes */}
							<div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-white to-slate-50/50">
								{messages.map((msg) => {
									const isFromCurrentUser = isMessageFromCurrentUser(msg);
									return (
										<motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
											<div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${isFromCurrentUser ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-br-sm' : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'}`}>
												<p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
												<div className={`flex items-center gap-2 mt-2 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
													<span className={`text-xs ${isFromCurrentUser ? 'text-teal-50/80' : 'text-slate-500'}`}>{formatTime(msg.created_at)}</span>
													{isFromCurrentUser && <span className={msg.is_read ? 'text-teal-50' : 'text-teal-200'}>{msg.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}</span>}
												</div>
											</div>
										</motion.div>
									);
								})}
								<div ref={messagesEndRef} />
							</div>

							{/* Input de mensaje */}
							<form onSubmit={handleSendMessage} className="p-5 border-t border-slate-200/50 bg-gradient-to-r from-white to-slate-50">
								<div className="flex gap-3">
									<input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm transition-all" disabled={sending} />
									<button type="submit" disabled={!newMessage.trim() || sending} className="px-6 py-3 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:via-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl">
										{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
										<span className="hidden sm:inline">Enviar</span>
									</button>
								</div>
							</form>
						</>
					) : (
						<div className="flex-1 flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-50 to-white">
							<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
								<div className="relative mb-6">
									<div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-2xl opacity-20"></div>
									<MessageSquare className="w-20 h-20 mx-auto text-slate-300 relative" />
								</div>
								<h3 className="text-xl font-semibold text-slate-600 mb-2">Selecciona una conversación</h3>
								<p className="text-sm text-slate-500">O inicia una nueva para comenzar a comunicarte</p>
							</motion.div>
						</div>
					)}
				</motion.div>
			</div>

			{/* Estilos personalizados para scrollbar */}
			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: transparent;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: #cbd5e1;
					border-radius: 3px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: #94a3b8;
				}
			`}</style>
		</div>
	);
}
