'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getRoleUserSession, roleNameEquals } from '@/lib/role-user-auth-client';

export default function RoleUserWhatsappConfigPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [whatsappNumber, setWhatsappNumber] = useState('');
	const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState('');
	const [doctorName, setDoctorName] = useState<string | null>(null);

	const [canEdit, setCanEdit] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);

				const session = await getRoleUserSession();
				if (!session) {
					setError('Debe iniciar sesión como usuario de rol.');
					return;
				}

				const isAssistant = roleNameEquals(session.roleName, 'Asistente De Citas');
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

		load();
	}, []);

	const handleSave = async () => {
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
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserWhatsappConfigPage] Error al guardar:', err);
			setError(err.message || 'Error al guardar configuración de WhatsApp');
		} finally {
			setSaving(false);
		}
	};

	const renderPreview = () => {
		const exampleMessage = whatsappMessageTemplate
			.replace('{NOMBRE_PACIENTE}', 'María Pérez')
			.replace('{FECHA}', '15/12/2025')
			.replace('{HORA}', '10:30 am')
			.replace('{NOMBRE_DOCTORA}', doctorName || 'Nombre del médico')
			.replace('{CLÍNICA}', 'ASHIRA')
			.replace('{SERVICIOS}', 'Consulta ginecológica, Ecografía transvaginal');

		return exampleMessage;
	};

	return (
		<div className="w-full max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-6 flex items-center gap-3">
				<div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
					<MessageCircle className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración de WhatsApp</h1>
					<p className="text-sm text-slate-600 mt-1">
						Registra tu número personal de WhatsApp y personaliza el mensaje base que se usará al enviar recordatorios y confirmaciones de citas desde el módulo de Citas.
					</p>
				</div>
			</div>

			{/* Mensajes */}
			{error && (
				<div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{success && (
				<div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span>{success}</span>
				</div>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-16 text-slate-500 gap-2">
					<Loader2 className="w-5 h-5 animate-spin" />
					<span>Cargando configuración...</span>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Formulario */}
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							Tu número de WhatsApp personal
						</label>
						<input
							type="text"
							value={whatsappNumber}
							onChange={(e) => setWhatsappNumber(e.target.value)}
							placeholder="Ej: +584121234567"
							disabled={!canEdit}
							className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
						/>
						<p className="mt-1 text-xs text-slate-500">
							<strong>Importante:</strong> Registra aquí el número de WhatsApp personal que usas para agendar citas y comunicarte con los pacientes. Este es el número desde el cual envías los recordatorios y confirmaciones de citas. Usa el formato internacional con código de país (ejemplo: +58 para Venezuela).
						</p>
					</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Plantilla de mensaje para recordatorios
							</label>
							<textarea
								value={whatsappMessageTemplate}
								onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
								rows={8}
								disabled={!canEdit}
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-vertical disabled:bg-slate-50 disabled:text-slate-400"
							/>
							<p className="mt-2 text-xs text-slate-500">
								Puede personalizar el texto usando estas variables:
							</p>
							<ul className="mt-1 text-xs text-slate-500 list-disc list-inside space-y-0.5">
								<li>
									<span className="font-mono text-emerald-700">{'{NOMBRE_PACIENTE}'}</span> — nombre
									completo del paciente
								</li>
								<li>
									<span className="font-mono text-emerald-700">{'{FECHA}'}</span> — fecha de la cita
									(formato dd/mm/aaaa)
								</li>
								<li>
									<span className="font-mono text-emerald-700">{'{HORA}'}</span> — hora de la cita
								</li>
								<li>
									<span className="font-mono text-emerald-700">{'{NOMBRE_DOCTORA}'}</span> — nombre del
									médico/a
								</li>
								<li>
									<span className="font-mono text-emerald-700">{'{CLÍNICA}'}</span> — nombre del
									consultorio o clínica
								</li>
								<li>
									<span className="font-mono text-emerald-700">{'{SERVICIOS}'}</span> — lista de
									servicios programados
								</li>
							</ul>
						</div>

						{canEdit ? (
							<div className="pt-2">
								<button
									type="button"
									onClick={handleSave}
									disabled={saving}
									className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{saving && <Loader2 className="w-4 h-4 animate-spin" />}
									<span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
								</button>
							</div>
						) : (
							<p className="mt-2 text-xs text-amber-600">
								Solo el rol <strong>Asistente De Citas</strong> puede editar esta plantilla. Otros roles la
								pueden visualizar.
							</p>
						)}
					</div>

					{/* Vista previa */}
					<div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
						<h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
							<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
								<MessageCircle className="w-3.5 h-3.5" />
							</span>
							Vista previa del mensaje
						</h2>
						<div className="flex-1 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 text-sm text-emerald-50 shadow-inner">
							<div className="bg-emerald-50/10 rounded-2xl p-3 whitespace-pre-line">
								{renderPreview()}
							</div>
							<p className="mt-3 text-[11px] text-emerald-100/80">
								Esta es una vista de ejemplo. Al enviar un recordatorio desde el módulo de Citas se abrirá
								WhatsApp Web o la app del dispositivo con este texto prellenado.
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


