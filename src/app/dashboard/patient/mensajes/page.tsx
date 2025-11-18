'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Paperclip, User, Check, CheckCheck } from 'lucide-react';

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
	} | null;
	recipient: {
		id: string;
		name: string | null;
	} | null;
	conversation: {
		id: string;
		title: string | null;
	} | null;
};

type Conversation = {
	id: string;
	title: string | null;
	messages: Message[];
};

export default function MensajesPage() {
	const [loading, setLoading] = useState(true);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
	const [newMessage, setNewMessage] = useState('');
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		loadMessages();
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, selectedConversation]);

	const loadMessages = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/messages', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar mensajes');

			const data = await res.json();
			setConversations(data.conversations || []);
			setMessages(data.messages || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !selectedConversation) return;

		try {
			const res = await fetch('/api/patient/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					conversation_id: selectedConversation,
					body: newMessage,
				}),
			});

			if (!res.ok) throw new Error('Error al enviar mensaje');

			setNewMessage('');
			loadMessages();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al enviar el mensaje');
		}
	};

	const currentMessages = selectedConversation
		? conversations.find(c => c.id === selectedConversation)?.messages || []
		: messages;

	const unreadCount = messages.filter(m => !m.read).length;

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto">
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-8rem)]">
						{/* Lista de conversaciones */}
						<div className="border-r border-gray-200 overflow-y-auto">
							<div className="p-6 border-b border-gray-200">
								<h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
									<MessageSquare className="w-6 h-6 text-indigo-600" />
									Mensajes
									{unreadCount > 0 && (
										<span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
											{unreadCount}
										</span>
									)}
								</h1>
							</div>

							{loading ? (
								<div className="p-4 space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
									))}
								</div>
							) : (
								<div className="divide-y divide-gray-200">
									{conversations.map((conv) => {
										const lastMessage = conv.messages?.[conv.messages.length - 1];
										const unread = conv.messages?.filter(m => !m.read).length || 0;
										return (
											<button
												key={conv.id}
												onClick={() => setSelectedConversation(conv.id)}
												className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
													selectedConversation === conv.id ? 'bg-indigo-50' : ''
												}`}
											>
												<div className="flex items-start justify-between mb-1">
													<h3 className="font-semibold text-gray-900">
														{conv.title || 'Conversación'}
													</h3>
													{unread > 0 && (
														<span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
															{unread}
														</span>
													)}
												</div>
												{lastMessage && (
													<p className="text-sm text-gray-600 line-clamp-1">{lastMessage.body}</p>
												)}
											</button>
										);
									})}

									{messages.map((msg) => (
										<button
											key={msg.id}
											onClick={() => setSelectedConversation(null)}
											className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
												selectedConversation === null ? 'bg-indigo-50' : ''
											}`}
										>
											<div className="flex items-start justify-between mb-1">
												<h3 className="font-semibold text-gray-900">
													{msg.sender?.name || 'Médico'}
												</h3>
												{!msg.read && (
													<span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
														Nuevo
													</span>
												)}
											</div>
											<p className="text-sm text-gray-600 line-clamp-1">{msg.body}</p>
										</button>
									))}
								</div>
							)}
						</div>

						{/* Área de mensajes */}
						<div className="lg:col-span-2 flex flex-col">
							{selectedConversation || messages.length > 0 ? (
								<>
									{/* Header del chat */}
									<div className="p-4 border-b border-gray-200">
										<h2 className="font-semibold text-gray-900">
											{selectedConversation
												? conversations.find(c => c.id === selectedConversation)?.title || 'Conversación'
												: 'Mensajes Directos'}
										</h2>
									</div>

									{/* Mensajes */}
									<div className="flex-1 overflow-y-auto p-4 space-y-4">
										{currentMessages.map((msg) => {
											const isFromMe = !msg.sender; // TODO: comparar con userId del paciente
											return (
												<div
													key={msg.id}
													className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
												>
													<div
														className={`max-w-md rounded-lg p-4 ${
															isFromMe
																? 'bg-indigo-600 text-white'
																: 'bg-gray-100 text-gray-900'
														}`}
													>
														{!isFromMe && msg.sender && (
															<div className="flex items-center gap-2 mb-2">
																<User className="w-4 h-4" />
																<span className="font-semibold text-sm">
																	{msg.sender.name || 'Médico'}
																</span>
															</div>
														)}
														<p className="text-sm">{msg.body}</p>
														<div className="flex items-center justify-between mt-2">
															<span className="text-xs opacity-70">
																{new Date(msg.created_at).toLocaleTimeString('es-ES', {
																	hour: '2-digit',
																	minute: '2-digit',
																})}
															</span>
															{isFromMe && (
																<span>
																	{msg.read ? (
																		<CheckCheck className="w-4 h-4" />
																	) : (
																		<Check className="w-4 h-4" />
																	)}
																</span>
															)}
														</div>
														{msg.attachments && msg.attachments.length > 0 && (
															<div className="mt-2 flex flex-wrap gap-2">
																{msg.attachments.map((att, idx) => (
																	<a
																		key={idx}
																		href={att}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs"
																	>
																		<Paperclip className="w-3 h-3" />
																		Archivo {idx + 1}
																	</a>
																))}
															</div>
														)}
													</div>
												</div>
											);
										})}
										<div ref={messagesEndRef} />
									</div>

									{/* Input de mensaje */}
									<div className="p-4 border-t border-gray-200">
										<div className="flex items-center gap-2">
											<input
												type="text"
												value={newMessage}
												onChange={(e) => setNewMessage(e.target.value)}
												onKeyPress={(e) => {
													if (e.key === 'Enter' && !e.shiftKey) {
														e.preventDefault();
														handleSendMessage();
													}
												}}
												placeholder="Escribe un mensaje..."
												className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
											/>
											<button
												onClick={handleSendMessage}
												disabled={!newMessage.trim() || !selectedConversation}
												className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<Send className="w-5 h-5" />
											</button>
										</div>
									</div>
								</>
							) : (
								<div className="flex-1 flex items-center justify-center">
									<div className="text-center">
										<MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600 text-lg">No hay mensajes</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
