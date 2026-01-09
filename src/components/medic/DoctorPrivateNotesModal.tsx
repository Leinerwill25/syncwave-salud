'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Save, Loader2, AlertCircle } from 'lucide-react';

interface DoctorPrivateNotesModalProps {
	isOpen: boolean;
	onClose: () => void;
	consultationId: string;
	patientId?: string | null;
	unregisteredPatientId?: string | null;
	doctorId?: string;
}

export default function DoctorPrivateNotesModal({
	isOpen,
	onClose,
	consultationId,
	patientId,
	unregisteredPatientId,
	doctorId,
}: DoctorPrivateNotesModalProps) {
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);

	// Cargar observaciones existentes al abrir el modal (optimizado)
	useEffect(() => {
		if (isOpen && consultationId) {
			// Cargar notas de forma asíncrona sin bloquear la UI
			const loadNotesAsync = async () => {
				// No mostrar loading inicial para que el modal aparezca rápido
				await loadNotes();
			};
			loadNotesAsync();
		} else {
			// Limpiar estado al cerrar
			setNotes('');
			setError(null);
			setSuccess(null);
			setLastUpdated(null);
		}
	}, [isOpen, consultationId]);

	async function loadNotes() {
		// Solo mostrar loading si tarda más de 300ms
		const loadingTimeout = setTimeout(() => setLoading(true), 300);
		setError(null);
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos

			const res = await fetch(`/api/consultations/${consultationId}/private-notes`, {
				credentials: 'include',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			clearTimeout(loadingTimeout);
			setLoading(false);

			const data = await res.json();

			if (res.ok) {
				if (data.notes) {
					setNotes(data.notes.notes || '');
					setLastUpdated(data.notes.updated_at || data.notes.created_at || null);
				} else {
					setNotes('');
					setLastUpdated(null);
				}
			} else {
				// Si no hay notas o la tabla no existe, no es un error crítico
				if (res.status === 404 || (data.error && data.error.includes('table') && data.error.includes('not found'))) {
					// Tabla no existe o no hay notas - no mostrar error, solo dejar vacío
					setNotes('');
					setLastUpdated(null);
				} else if (res.status !== 404) {
					setError(data.error || 'Error al cargar las observaciones');
				}
			}
		} catch (err: any) {
			clearTimeout(loadingTimeout);
			setLoading(false);
			// Si es un error de tabla no encontrada, no mostrar error
			if (err.name === 'AbortError') {
				setError('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
			} else if (err.message && err.message.includes('table') && err.message.includes('not found')) {
				// Tabla no existe - no mostrar error
				setNotes('');
				setLastUpdated(null);
			} else {
				setError(err.message || 'Error al cargar las observaciones');
			}
		}
	}

	async function handleSave() {
		if (!consultationId || (!patientId && !unregisteredPatientId) || !doctorId) {
			setError('Faltan datos requeridos para guardar las observaciones');
			return;
		}

		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const res = await fetch(`/api/consultations/${consultationId}/private-notes`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					notes: notes.trim(),
					patient_id: patientId || null,
					unregistered_patient_id: unregisteredPatientId || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar las observaciones');
			}

			setSuccess('Observaciones guardadas exitosamente');
			setLastUpdated(data.notes?.updated_at || data.notes?.created_at || new Date().toISOString());
			
			// Limpiar mensaje de éxito después de 3 segundos
			setTimeout(() => {
				setSuccess(null);
			}, 3000);
		} catch (err: any) {
			setError(err.message || 'Error al guardar las observaciones');
		} finally {
			setSaving(false);
		}
	}

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
							<Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
								Observaciones Privadas
							</h2>
							<p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
								Información confidencial del médico
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
						aria-label="Cerrar modal">
						<X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
					</button>
				</div>

				{/* Advertencia de privacidad */}
				<div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
					<div className="flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
								Información Confidencial
							</p>
							<p className="text-sm text-amber-800 dark:text-amber-300">
								Estas observaciones son <strong>privadas y confidenciales</strong>. Solo usted, como médico tratante, puede visualizar y editar esta información. El paciente <strong>no tiene acceso</strong> a estas observaciones.
							</p>
						</div>
					</div>
				</div>

				{/* Contenido */}
				<div className="flex-1 overflow-y-auto p-6">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-slate-400" />
							<span className="ml-3 text-slate-600 dark:text-slate-400">Cargando observaciones...</span>
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
									Observaciones
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={12}
									className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent resize-none font-sans text-sm leading-relaxed"
									placeholder="Escriba sus observaciones privadas sobre esta consulta y paciente aquí. Esta información solo será visible para usted..."
								/>
								<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
									Puede incluir notas clínicas, impresiones diagnósticas, consideraciones especiales o cualquier otra información que considere relevante y confidencial.
								</p>
							</div>

							{lastUpdated && (
								<div className="text-xs text-slate-500 dark:text-slate-400 italic">
									Última actualización: {new Date(lastUpdated).toLocaleString('es-ES', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</div>
							)}

							{error && (
								<div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
									<p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
								</div>
							)}

							{success && (
								<div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
									<p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer con botones */}
				<div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
					<button
						type="button"
						onClick={onClose}
						className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
						Cerrar
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving || loading}
						className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
						{saving ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Guardando...
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Guardar Observaciones
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

