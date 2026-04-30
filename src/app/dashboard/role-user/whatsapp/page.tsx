'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
	Loader2, 
	MessageSquare, 
	RefreshCw, 
	Power, 
	CheckCircle2, 
	AlertCircle, 
	QrCode,
	MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getRoleUserSession, roleNameEquals } from '@/lib/role-user-auth-client';

interface WahaSession {
	status: 'PENDING' | 'STARTING' | 'SCAN_QR' | 'WORKING' | 'FAILED' | 'STOPPED';
	qrCode?: string;
}

export default function RoleUserWhatsappConfigPage() {
	// WAHA Session State
	const [session, setSession] = useState<WahaSession | null>(null);
	const [wahaLoading, setWahaLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	// Existing Configuration State
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [whatsappNumber, setWhatsappNumber] = useState('');
	const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState('');
	const [doctorName, setDoctorName] = useState<string | null>(null);
	const [canEdit, setCanEdit] = useState(false);

	// WAHA Status Fetching
	const fetchWahaStatus = useCallback(async () => {
		try {
			const res = await fetch('/api/waha/session');
			const data = await res.json();
			setSession(data);
		} catch (err) {
			console.error('Error fetching WAHA status:', err);
		} finally {
			setWahaLoading(false);
		}
	}, []);

	// Initial Load and Polling
	useEffect(() => {
		const loadConfig = async () => {
			try {
				setLoading(true);
				setError(null);

				const roleSession = await getRoleUserSession();
				if (!roleSession) {
					setError('Debe iniciar sesión como usuario de rol.');
					return;
				}

				const isAssistant = roleNameEquals(roleSession.roleName, 'Asistente De Citas');
				setCanEdit(isAssistant);

				const res = await fetch('/api/role-users/whatsapp-config', {
					credentials: 'include',
				});
				const data = await res.json().catch(() => ({}));

				if (!res.ok) {
					throw new Error(data.error || 'Error al cargar configuración de WhatsApp');
				}

				if (data?.config) {
					setWhatsappNumber(data.config.whatsappNumber || '');
					setWhatsappMessageTemplate(
						data.config.whatsappMessageTemplate ||
							'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con la Dra. {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"',
					);
					setDoctorName(data.config.doctorName || null);
				}
			} catch (err: any) {
				console.error('[RoleUserWhatsappConfigPage] Error:', err);
				setError(err.message || 'Error al cargar configuración de WhatsApp');
			} finally {
				setLoading(false);
			}
		};

		loadConfig();
		fetchWahaStatus();

		const interval = setInterval(() => {
			if (session?.status !== 'WORKING') {
				fetchWahaStatus();
			}
		}, 5000);
		
		return () => clearInterval(interval);
	}, [fetchWahaStatus, session?.status]);

	// WAHA Action Handlers
	const handleStartWahaSession = async () => {
		if (!canEdit) return;
		setActionLoading(true);
		try {
			const res = await fetch('/api/waha/session', { method: 'POST' });
			const data = await res.json();
			if (data.success) {
				toast.success('Iniciando sesión de WhatsApp...');
				fetchWahaStatus();
			} else {
				toast.error(data.error || 'Error al iniciar sesión');
			}
		} catch (err) {
			toast.error('Error de conexión');
		} finally {
			setActionLoading(false);
		}
	};

	const handleWahaLogout = async () => {
		if (!canEdit) return;
		if (!confirm('¿Estás seguro de cerrar la sesión de WhatsApp del consultorio?')) return;
		setActionLoading(true);
		try {
			const res = await fetch('/api/waha/session', { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				toast.success('Sesión cerrada');
				fetchWahaStatus();
			} else {
				toast.error(data.error || 'Error al cerrar sesión');
			}
		} catch (err) {
			toast.error('Error de conexión');
		} finally {
			setActionLoading(false);
		}
	};

	// Save Manual Config
	const handleSaveConfig = async () => {
		if (!canEdit) return;
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const res = await fetch('/api/role-users/whatsapp-config', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					whatsappNumber: whatsappNumber.trim() || null,
					whatsappMessageTemplate: whatsappMessageTemplate,
				}),
			});
			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar configuración de WhatsApp');
			}

			setSuccess('Configuración de WhatsApp actualizada correctamente.');
			toast.success('Configuración guardada');
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserWhatsappConfigPage] Error al guardar:', err);
			setError(err.message || 'Error al guardar configuración de WhatsApp');
		} finally {
			setSaving(false);
		}
	};

	const getStatusBadge = () => {
		switch (session?.status) {
			case 'WORKING':
				return <Badge className="bg-green-500 text-white hover:bg-green-600">Conectado</Badge>;
			case 'SCAN_QR':
				return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Esperando QR</Badge>;
			case 'STARTING':
			case 'PENDING':
				return <Badge className="bg-blue-500 text-white animate-pulse">Iniciando...</Badge>;
			case 'FAILED':
				return <Badge variant="destructive">Error</Badge>;
			case 'STOPPED':
				return <Badge variant="outline">Desconectado</Badge>;
			default:
				return <Badge variant="secondary">Cargando...</Badge>;
		}
	};

	const renderPreview = () => {
		const exampleMessage = whatsappMessageTemplate
			.replace('{NOMBRE_PACIENTE}', 'María Pérez')
			.replace('{FECHA}', '15/12/2025')
			.replace('{HORA}', '10:30 am')
			.replace('{NOMBRE_DOCTORA}', doctorName || 'Nombre del médico')
			.replace('{CLÍNICA}', 'Syncwave Salud')
			.replace('{SERVICIOS}', 'Consulta ginecológica, Ecografía transvaginal');

		return exampleMessage;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32 text-slate-500 gap-2">
				<Loader2 className="w-8 h-8 animate-spin" />
				<span className="text-lg font-medium">Cargando configuración de WhatsApp...</span>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 px-4 max-w-6xl">
			{/* Header */}
			<div className="flex items-center gap-4 mb-8">
				<div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 shadow-sm">
					<MessageCircle className="w-8 h-8" />
				</div>
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración de WhatsApp</h1>
					<p className="text-slate-500 mt-1">
						Gestiona la conexión automática del consultorio y personaliza tus recordatorios.
					</p>
				</div>
			</div>

			{/* Mensajes de Alerta */}
			{(error || success) && (
				<div className="mb-6 space-y-3">
					{error && (
						<div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 animate-in fade-in slide-in-from-top-2">
							<AlertCircle className="w-5 h-5 shrink-0" />
							<span className="text-sm font-medium">{error}</span>
						</div>
					)}
					{success && (
						<div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 animate-in fade-in slide-in-from-top-2">
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<span className="text-sm font-medium">{success}</span>
						</div>
					)}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* SECCIÓN 1: WAHA SESSION (Integración Automática) */}
				<section className="space-y-6">
					<Card className="border-none shadow-xl bg-white/70 backdrop-blur-md overflow-hidden">
						<CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
							<div className="flex justify-between items-center mb-1">
								<CardTitle className="text-xl font-bold flex items-center gap-2">
									<RefreshCw className={`w-5 h-5 text-emerald-600 ${session?.status === 'STARTING' ? 'animate-spin' : ''}`} />
									WhatsApp del Consultorio
								</CardTitle>
								{getStatusBadge()}
							</div>
							<CardDescription>
								Conexión automática para recordatorios inteligentes y gestión por IA.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="flex flex-col items-center justify-center p-8 bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-200 min-h-[300px] transition-all hover:border-emerald-200">
								{(session?.status?.includes('QR') || session?.status === 'STARTING') && session?.qrCode ? (
									<div className="text-center animate-in zoom-in-95 duration-300">
										<div className="bg-white p-5 rounded-2xl shadow-xl mb-4 inline-block border border-slate-100">
											<img src={session.qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
										</div>
										<p className="text-sm font-semibold text-slate-700 mb-2 flex items-center justify-center gap-2">
											<QrCode className="w-4 h-4" /> Escanea para vincular
										</p>
										<p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
											Abre WhatsApp en tu teléfono &gt; Dispositivos vinculados &gt; Vincular un dispositivo
										</p>
									</div>
								) : session?.status === 'WORKING' ? (
									<div className="text-center animate-in fade-in duration-500">
										<div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
											<CheckCircle2 className="w-12 h-12 text-emerald-500" />
										</div>
										<h3 className="text-xl font-bold text-slate-800">¡Conexión Activa!</h3>
										<p className="text-sm text-slate-500 mt-2">
											El sistema automático está operando correctamente.
										</p>
									</div>
								) : (
									<div className="text-center py-8">
										<div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
											<Power className={`w-10 h-10 ${session?.status === 'STOPPED' ? 'text-slate-400' : 'text-emerald-500 animate-pulse'}`} />
										</div>
										<p className="text-slate-500 font-medium tracking-tight">Sin conexión activa</p>
										<p className="text-xs text-slate-400 mt-1">Haz clic en Conectar para iniciar.</p>
									</div>
								)}
							</div>
						</CardContent>
						<CardFooter className="flex flex-col gap-3 bg-slate-50/30 border-t border-slate-100 pt-5">
							{session?.status === 'WORKING' ? (
								<Button 
									variant="outline" 
									className="w-full h-12 text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600 transition-colors font-semibold"
									onClick={handleWahaLogout}
									disabled={actionLoading || !canEdit}
								>
									{actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Power className="mr-2 h-5 w-5" />}
									Desconectar WhatsApp
								</Button>
							) : (
								<>
									<Button 
										className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all active:scale-95 font-semibold"
										onClick={handleStartWahaSession}
										disabled={actionLoading || session?.status === 'STARTING' || !canEdit}
									>
										{actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
										{session?.status?.includes('QR') ? 'Recargar QR' : 'Conectar WhatsApp'}
									</Button>
									
									{(session?.status === 'STARTING' || session?.status === 'SCAN_QR' || session?.status === 'FAILED') && (
										<Button 
											variant="ghost" 
											className="w-full text-slate-400 hover:text-red-500 text-xs transition-colors py-1 h-auto"
											onClick={handleWahaLogout}
											disabled={actionLoading || !canEdit}
										>
											Detener y Limpiar (Reset)
										</Button>
									)}
								</>
							)}

							{!canEdit && (
								<p className="text-[10px] text-amber-600 text-center italic mt-1">
									* Solo el rol Asistente De Citas puede gestionar esta conexión.
								</p>
							)}
						</CardFooter>
					</Card>

					<Card className="bg-slate-900 border-none text-white overflow-hidden relative shadow-2xl">
						<div className="absolute -top-6 -right-6 p-8 opacity-10">
							<MessageSquare className="w-32 h-32" />
						</div>
						<CardHeader>
							<CardTitle className="text-lg">¿Cómo funciona la IA?</CardTitle>
							<CardDescription className="text-slate-400">
								Gestión automatizada para optimizar tu tiempo.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/10">
								<div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 h-fit">
									<CheckCircle2 className="w-5 h-5" />
								</div>
								<div>
									<h4 className="font-semibold text-sm">Recordatorios Proactivos</h4>
									<p className="text-xs text-slate-400 mt-1">El sistema envía mensajes preventivos antes de cada cita.</p>
								</div>
							</div>
							<div className="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/10">
								<div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 h-fit">
									<RefreshCw className="w-5 h-5" />
								</div>
								<div>
									<h4 className="font-semibold text-sm">Sincronización en Vivo</h4>
									<p className="text-xs text-slate-400 mt-1">Las respuestas de los pacientes actualizan tu agenda automáticamente.</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* SECCIÓN 2: CONFIGURACIÓN MANUAL Y PLANTILLA */}
				<section className="space-y-6">
					<Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
						<CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
							<CardTitle className="text-xl font-bold">Personalización de Mensajes</CardTitle>
							<CardDescription>
								Configura tu número personal y la estructura de los recordatorios.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6 space-y-6">
							{/* Número de WhatsApp Personal */}
							<div className="space-y-2">
								<label className="text-sm font-bold text-slate-700 flex items-center gap-2">
									Tu WhatsApp Personal de Trabajo
								</label>
								<div className="relative">
									<input
										type="text"
										value={whatsappNumber}
										onChange={(e) => setWhatsappNumber(e.target.value)}
										placeholder="Ej: +584121234567"
										disabled={!canEdit}
										className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300"
									/>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
										<MessageCircle className="w-5 h-5" />
									</div>
								</div>
								<p className="text-[11px] text-slate-400 leading-tight">
									Usado para enlaces directos de "Abrir WhatsApp" en el módulo de citas.
								</p>
							</div>

							{/* Plantilla de Mensaje */}
							<div className="space-y-2">
								<label className="text-sm font-bold text-slate-700 flex items-center justify-between">
									Plantilla para Recordatorios
									<Badge variant="outline" className="text-[10px] font-normal border-slate-200 text-slate-400">
										Organización
									</Badge>
								</label>
								<textarea
									value={whatsappMessageTemplate}
									onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
									rows={8}
									disabled={!canEdit}
									className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none transition-all disabled:bg-slate-50 disabled:text-slate-400 leading-relaxed"
									placeholder="Escribe aquí tu plantilla..."
								/>
								
								<div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
									<h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables Disponibles</h5>
									<div className="grid grid-cols-2 gap-x-4 gap-y-1">
										{[
											['{NOMBRE_PACIENTE}', 'Nombre completo'],
											['{FECHA}', 'DD/MM/AAAA'],
											['{HORA}', 'Hora cita'],
											['{NOMBRE_DOCTORA}', 'Médico/a'],
											['{CLÍNICA}', 'Lugar'],
											['{SERVICIOS}', 'Lista servicios'],
										].map(([variable, desc]) => (
											<div key={variable} className="flex items-center justify-between text-[11px]">
												<code className="text-emerald-700 font-bold">{variable}</code>
												<span className="text-slate-400">{desc}</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</CardContent>
						<CardFooter className="bg-slate-50/30 border-t border-slate-100 pt-5 pb-5">
							{canEdit ? (
								<Button
									onClick={handleSaveConfig}
									disabled={saving}
									className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98]"
								>
									{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
									Guardar Cambios
								</Button>
							) : (
								<div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 w-full">
									<AlertCircle className="w-4 h-4 shrink-0" />
									<p className="text-xs font-medium">Solo personal autorizado puede editar la plantilla.</p>
								</div>
							)}
						</CardFooter>
					</Card>

					{/* VISTA PREVIA (Estilo "WhatsApp Message bubble") */}
					<div className="space-y-3">
						<h2 className="text-sm font-bold text-slate-600 px-1 uppercase tracking-widest flex items-center gap-2">
							<MessageCircle className="w-4 h-4" />
							Vista Previa del Mensaje
						</h2>
						<div className="rounded-3xl bg-slate-200 p-6 shadow-inner relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
							<div className="max-w-[85%] bg-white rounded-2xl rounded-tl-none p-4 shadow-md animate-in slide-in-from-left-4 duration-500">
								<p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed italic">
									{renderPreview()}
								</p>
								<div className="flex justify-end mt-2">
									<p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
										10:30 AM ✓✓
									</p>
								</div>
							</div>
						</div>
						<p className="text-[10px] text-slate-400 text-center italic">
							* Los valores de las variables son de ejemplo.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}


