'use client';

import { useState } from 'react';
import { Bell, MessageSquare, Mail, Smartphone, Check, X } from 'lucide-react';
import type { MedicConfig } from '@/types/medic-config';

export default function NotificationPreferences({ 
	config, 
	onUpdate 
}: { 
	config: MedicConfig; 
	onUpdate: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const [notifications, setNotifications] = useState({
		whatsapp: config.config.notifications?.whatsapp || false,
		email: config.config.notifications?.email !== false, // default true
		push: config.config.notifications?.push || false,
	});

	const [whatsappNumber, setWhatsappNumber] = useState('');
	const [emailNotifications, setEmailNotifications] = useState({
		newAppointment: true,
		appointmentReminder: true,
		patientMessage: true,
		prescriptionRequest: true,
		systemUpdates: false,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const payload = {
				notifications: {
					...notifications,
					whatsappNumber: notifications.whatsapp ? whatsappNumber : null,
					emailPreferences: emailNotifications,
				},
			};

			const res = await fetch('/api/medic/config', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar preferencias');
			}

			setSuccess('Preferencias guardadas correctamente');
			onUpdate();
			
			// Disparar evento personalizado para notificar al sidebar que debe recargar
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('medicConfigUpdated'));
			}
			
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al guardar las preferencias';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Mensajes de estado */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
					<X className="w-5 h-5 text-red-600" />
					<span className="text-red-700">{error}</span>
				</div>
			)}
			{success && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
					<Check className="w-5 h-5 text-green-600" />
					<span className="text-green-700">{success}</span>
				</div>
			)}

			{/* Notificaciones por WhatsApp */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-100 rounded-lg">
							<MessageSquare className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
							<p className="text-sm text-gray-600">Recibe notificaciones por WhatsApp</p>
						</div>
					</div>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={notifications.whatsapp}
							onChange={(e) => setNotifications(prev => ({ ...prev, whatsapp: e.target.checked }))}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
					</label>
				</div>
				{notifications.whatsapp && (
					<div className="mt-4">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Número de WhatsApp
						</label>
						<input
							type="tel"
							value={whatsappNumber}
							onChange={(e) => setWhatsappNumber(e.target.value)}
							placeholder="+58 412 1234567"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						/>
						<p className="mt-1 text-xs text-gray-500">
							Incluya el código de país (ej: +58 para Venezuela)
						</p>
					</div>
				)}
			</div>

			{/* Notificaciones por Email */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Mail className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Email</h3>
							<p className="text-sm text-gray-600">Recibe notificaciones por correo electrónico</p>
						</div>
					</div>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={notifications.email}
							onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
					</label>
				</div>
				{notifications.email && (
					<div className="mt-4 space-y-3">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Preferencias de Email
						</label>
						{Object.entries({
							newAppointment: 'Nueva cita programada',
							appointmentReminder: 'Recordatorio de cita',
							patientMessage: 'Mensaje de paciente',
							prescriptionRequest: 'Solicitud de receta',
							systemUpdates: 'Actualizaciones del sistema',
						}).map(([key, label]) => (
							<label key={key} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
								<input
									type="checkbox"
									checked={emailNotifications[key as keyof typeof emailNotifications]}
									onChange={(e) => setEmailNotifications(prev => ({
										...prev,
										[key]: e.target.checked,
									}))}
									className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
								/>
								<span className="text-sm text-gray-700">{label}</span>
							</label>
						))}
					</div>
				)}
			</div>

			{/* Notificaciones Push */}
			<div className="bg-gray-50 rounded-xl p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Smartphone className="w-5 h-5 text-purple-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Notificaciones Push</h3>
							<p className="text-sm text-gray-600">Recibe notificaciones en tiempo real en tu dispositivo</p>
						</div>
					</div>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={notifications.push}
							onChange={(e) => setNotifications(prev => ({ ...prev, push: e.target.checked }))}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
					</label>
				</div>
				{notifications.push && (
					<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<p className="text-sm text-blue-800">
							Las notificaciones push requieren que permitas las notificaciones en tu navegador.
							Haz clic en el ícono de candado en la barra de direcciones para configurarlas.
						</p>
					</div>
				)}
			</div>

			{/* Botón de guardar */}
			<div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{loading ? 'Guardando...' : 'Guardar Preferencias'}
				</button>
			</div>
		</form>
	);
}

