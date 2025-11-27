'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2, Calendar, User, Search } from 'lucide-react';

interface Conversation {
	id: string;
	title?: string;
	created_at: string;
	lastMessage?: {
		body: string;
		created_at: string;
	};
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
	unreadCount: number;
}

export default function RoleUserMessagesPage() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchConversations();
	}, []);

	const fetchConversations = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/messages', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar conversaciones');

			const data = await res.json();
			// Sanitizar mensajes para no mostrar información médica sensible
			const sanitizedConversations = (data.conversations || []).map((conv: Conversation) => ({
				...conv,
				lastMessage: conv.lastMessage
					? {
							...conv.lastMessage,
							body: conv.lastMessage.body ? 'Mensaje recibido' : undefined, // No mostrar contenido del mensaje
						}
					: undefined,
			}));
			setConversations(sanitizedConversations);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (iso: string) => {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	};

	const filteredConversations = conversations.filter((conv) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			conv.Patient?.firstName?.toLowerCase().includes(search) ||
			conv.Patient?.lastName?.toLowerCase().includes(search) ||
			conv.Patient?.identifier?.toLowerCase().includes(search) ||
			conv.title?.toLowerCase().includes(search)
		);
	});

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando mensajes...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mensajes</h1>
				<p className="text-sm sm:text-base text-slate-600 mt-1">Registro administrativo de comunicaciones</p>
			</motion.div>

			{/* Search Bar */}
			<div className="mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
					<input
						type="text"
						placeholder="Buscar por paciente o asunto..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
					/>
				</div>
			</div>

			{/* Conversations List */}
			{filteredConversations.length === 0 ? (
				<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
					<MessageCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">{searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones registradas'}</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredConversations.map((conv, index) => (
						<motion.div
							key={conv.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
										<MessageCircle className="w-6 h-6" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-lg font-semibold text-slate-900">
												{conv.Patient
													? `${conv.Patient.firstName} ${conv.Patient.lastName}`
													: conv.title || 'Sin título'}
											</h3>
											{conv.unreadCount > 0 && (
												<span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-red-500 text-white">
													{conv.unreadCount}
												</span>
											)}
										</div>
										<div className="flex flex-wrap gap-4 text-sm text-slate-600">
											{conv.Patient?.identifier && <span>C.I.: {conv.Patient.identifier}</span>}
											{conv.lastMessage && (
												<span className="flex items-center gap-1">
													<Calendar className="w-4 h-4" />
													Último mensaje: {formatDate(conv.lastMessage.created_at)}
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
							<div className="mt-4 pt-4 border-t border-slate-200">
								<p className="text-xs text-slate-500 italic">
									Nota: El contenido detallado de los mensajes solo es visible para el médico especialista.
								</p>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	);
}
