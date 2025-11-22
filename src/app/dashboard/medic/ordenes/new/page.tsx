// app/dashboard/medic/ordenes/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Upload, Clock, User, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Patient {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string;
	is_unregistered?: boolean;
}

interface ActivePatient {
	patient: Patient;
	appointment: {
		id: string;
		scheduled_at: string;
		duration_minutes: number;
	} | null;
	consultation: {
		id: string;
		started_at: string;
		chief_complaint?: string;
		diagnosis?: string;
	} | null;
}

export default function NewOrderPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [loadingPatients, setLoadingPatients] = useState(true);
	const [activePatients, setActivePatients] = useState<ActivePatient[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<ActivePatient | null>(null);
	const [patientConsultations, setPatientConsultations] = useState<any[]>([]);
	const [loadingConsultations, setLoadingConsultations] = useState(false);
	const [formData, setFormData] = useState({
		patient_id: '',
		consultation_id: '',
		result_type: '',
		notes: '',
		is_critical: false,
		attachments: [] as string[],
	});

	useEffect(() => {
		fetchActivePatients();
		// Refrescar cada minuto para mantener la lista actualizada
		const interval = setInterval(fetchActivePatients, 60000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (formData.patient_id) {
			const patient = activePatients.find(p => p.patient.id === formData.patient_id);
			setSelectedPatient(patient || null);
			
			// Cargar consultas del paciente
			fetchPatientConsultations(formData.patient_id);
			
			// Si hay una consulta activa, seleccionarla automáticamente
			if (patient?.consultation) {
				setFormData(prev => ({ ...prev, consultation_id: patient.consultation!.id }));
			} else {
				setFormData(prev => ({ ...prev, consultation_id: '' }));
			}
		} else {
			setSelectedPatient(null);
			setPatientConsultations([]);
			setFormData(prev => ({ ...prev, consultation_id: '' }));
		}
	}, [formData.patient_id, activePatients]);

	const fetchPatientConsultations = async (patientId: string) => {
		try {
			setLoadingConsultations(true);
			const res = await fetch(`/api/medic/orders/patient-consultations?patientId=${patientId}`, {
				credentials: 'include',
			});
			
			if (res.ok) {
				const data = await res.json();
				setPatientConsultations(data.consultations || []);
			} else {
				console.error('Error cargando consultas del paciente');
				setPatientConsultations([]);
			}
		} catch (err) {
			console.error('Error cargando consultas del paciente:', err);
			setPatientConsultations([]);
		} finally {
			setLoadingConsultations(false);
		}
	};

	const fetchActivePatients = async () => {
		try {
			setLoadingPatients(true);
			const res = await fetch('/api/medic/orders/active-patients', {
				credentials: 'include',
			});
			
			if (res.ok) {
				const data = await res.json();
				setActivePatients(data.patients || []);
			} else {
				const error = await res.json();
				console.error('Error cargando pacientes activos:', error);
			}
		} catch (err) {
			console.error('Error cargando pacientes activos:', err);
		} finally {
			setLoadingPatients(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.patient_id || !formData.result_type) {
			alert('Por favor completa todos los campos requeridos');
			return;
		}

		// Validar que el paciente siga activo
		const patient = activePatients.find(p => p.patient.id === formData.patient_id);
		if (!patient) {
			alert('El paciente seleccionado ya no tiene una cita o consulta activa. Por favor, recarga la página.');
			await fetchActivePatients();
			return;
		}

		// Para pacientes no registrados, necesitamos usar el patient_id de la consulta si existe
		// Si la consulta tiene unregistered_patient_id pero no patient_id, no podemos crear la orden
		// porque lab_result requiere patient_id de la tabla Patient
		if (patient.patient.is_unregistered && patient.consultation) {
			// Intentar obtener el patient_id de la consulta
			// Si la consulta no tiene patient_id, no podemos continuar
			// Esto se validará en el backend también
		}

		setLoading(true);
		try {
			// Usar la consulta activa si existe
			const consultationId = selectedPatient?.consultation?.id || formData.consultation_id || null;

			const res = await fetch('/api/medic/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					patient_id: formData.patient_id,
					consultation_id: consultationId,
					result_type: formData.result_type,
					attachments: formData.attachments,
					notes: formData.notes,
					is_critical: formData.is_critical,
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Error al crear orden');
			}

			const data = await res.json();
			router.push(`/dashboard/medic/ordenes/${data.order.id}`);
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al crear orden');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/medic/ordenes">
					<Button variant="ghost" className="text-slate-600">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Nueva Orden Médica</h1>
					<p className="text-slate-600 mt-1">Solicitar examen de laboratorio</p>
				</div>
			</div>

			{/* Información de seguridad */}
			<div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
				<div className="flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
					<div className="flex-1">
						<h3 className="text-sm font-semibold text-blue-900 mb-1">Seguridad y Confidencialidad</h3>
						<p className="text-sm text-blue-800">
							Solo se muestran pacientes con citas o consultas en progreso en este momento. 
							Esto garantiza que las órdenes médicas se creen únicamente durante la atención activa del paciente.
						</p>
					</div>
				</div>
			</div>

			<motion.form
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				onSubmit={handleSubmit}
				className="bg-white rounded-2xl border border-blue-100 p-6 space-y-6"
			>
				{/* Paciente */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="block text-sm font-medium text-slate-700">
							Paciente <span className="text-red-500">*</span>
						</label>
						<button
							type="button"
							onClick={fetchActivePatients}
							disabled={loadingPatients}
							className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 disabled:text-slate-400 disabled:cursor-not-allowed"
							title="Actualizar lista de pacientes activos"
						>
							<RefreshCw className={`w-3 h-3 ${loadingPatients ? 'animate-spin' : ''}`} />
							Actualizar
						</button>
					</div>
					{loadingPatients ? (
						<div className="w-full px-4 py-2 border border-blue-200 rounded-xl bg-slate-50 flex items-center gap-2">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
							<span className="text-sm text-slate-600">Cargando pacientes activos...</span>
						</div>
					) : activePatients.length === 0 ? (
						<div className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl bg-yellow-50 text-yellow-800 text-sm">
							<AlertCircle className="w-4 h-4 inline mr-2" />
							No hay pacientes con citas o consultas en progreso en este momento.
						</div>
					) : (
						<>
							<select
								required
								value={formData.patient_id}
								onChange={(e) => setFormData({ ...formData, patient_id: e.target.value, consultation_id: '' })}
								className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
							>
								<option value="">Seleccionar paciente</option>
								{activePatients.map((ap) => (
									<option key={ap.patient.id} value={ap.patient.id}>
										{ap.patient.firstName} {ap.patient.lastName} {ap.patient.identifier ? `(${ap.patient.identifier})` : ''} {ap.patient.is_unregistered ? '[No Registrado]' : ''}
									</option>
								))}
							</select>
							{selectedPatient && (
								<div className={`mt-3 p-3 border rounded-lg ${selectedPatient.patient.is_unregistered ? 'bg-orange-50 border-orange-200' : 'bg-teal-50 border-teal-200'}`}>
									<div className="flex items-start gap-2">
										<CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedPatient.patient.is_unregistered ? 'text-orange-600' : 'text-teal-600'}`} />
										<div className="flex-1 text-sm">
											<div className="mb-2 flex items-center gap-2">
												<span className={`font-medium ${selectedPatient.patient.is_unregistered ? 'text-orange-900' : 'text-teal-900'}`}>
													{selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
												</span>
												{selectedPatient.patient.is_unregistered && (
													<span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
														No Registrado
													</span>
												)}
												{selectedPatient.patient.identifier && (
													<span className="text-xs text-slate-600">({selectedPatient.patient.identifier})</span>
												)}
											</div>
											{selectedPatient.appointment && (
												<div className="mb-2">
													<span className={`font-medium ${selectedPatient.patient.is_unregistered ? 'text-orange-900' : 'text-teal-900'}`}>Cita en progreso:</span>
													<div className={`mt-1 flex items-center gap-2 ${selectedPatient.patient.is_unregistered ? 'text-orange-700' : 'text-teal-700'}`}>
														<Clock className="w-3 h-3" />
														{new Date(selectedPatient.appointment.scheduled_at).toLocaleString('es-ES', {
															day: '2-digit',
															month: '2-digit',
															year: 'numeric',
															hour: '2-digit',
															minute: '2-digit',
														})} ({selectedPatient.appointment.duration_minutes} min)
													</div>
												</div>
											)}
											{selectedPatient.consultation && (
												<div>
													<span className={`font-medium ${selectedPatient.patient.is_unregistered ? 'text-orange-900' : 'text-teal-900'}`}>Consulta activa:</span>
													<div className={`mt-1 ${selectedPatient.patient.is_unregistered ? 'text-orange-700' : 'text-teal-700'}`}>
														{selectedPatient.consultation.chief_complaint && (
															<div className="text-xs">Motivo: {selectedPatient.consultation.chief_complaint}</div>
														)}
														{selectedPatient.consultation.diagnosis && (
															<div className="text-xs">Diagnóstico: {selectedPatient.consultation.diagnosis}</div>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Consulta asociada */}
				{selectedPatient && (
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							Consulta Asociada {selectedPatient.consultation && <span className="text-xs text-slate-500">(Opcional)</span>}
						</label>
						{loadingConsultations ? (
							<div className="w-full px-4 py-2 border border-blue-200 rounded-xl bg-slate-50 flex items-center gap-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
								<span className="text-sm text-slate-600">Cargando consultas...</span>
							</div>
						) : patientConsultations.length === 0 ? (
							<div className="px-4 py-2 border border-yellow-200 rounded-xl bg-yellow-50 text-yellow-800 text-sm">
								<AlertCircle className="w-4 h-4 inline mr-2" />
								No se encontraron consultas para este paciente.
							</div>
						) : (
							<select
								value={formData.consultation_id}
								onChange={(e) => setFormData({ ...formData, consultation_id: e.target.value })}
								className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
							>
								<option value="">Seleccionar consulta (opcional)</option>
								{patientConsultations.map((consultation) => (
									<option key={consultation.id} value={consultation.id}>
										{new Date(consultation.created_at).toLocaleString('es-ES', {
											day: '2-digit',
											month: '2-digit',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})} - {consultation.chief_complaint || consultation.diagnosis || 'Sin motivo'}
									</option>
								))}
							</select>
						)}
						{selectedPatient.consultation && formData.consultation_id === selectedPatient.consultation.id && (
							<p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
								<CheckCircle2 className="w-3 h-3" />
								Consulta activa seleccionada
							</p>
						)}
						<p className="text-xs text-slate-500 mt-1">
							Selecciona una consulta para asociarla a esta orden médica. Esto ayudará a mantener un registro completo del historial del paciente.
						</p>
					</div>
				)}

				{/* Tipo de examen */}
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">
						Tipo de Examen <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						value={formData.result_type}
						onChange={(e) => setFormData({ ...formData, result_type: e.target.value })}
						placeholder="Ej: Hemograma completo, Glicemia, etc."
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				{/* Notas */}
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
					<textarea
						value={formData.notes}
						onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
						rows={4}
						placeholder="Instrucciones especiales o notas adicionales..."
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				{/* Resultado crítico */}
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="is_critical"
						checked={formData.is_critical}
						onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
						className="w-4 h-4 text-teal-600 border-blue-200 rounded focus:ring-teal-500"
					/>
					<label htmlFor="is_critical" className="text-sm font-medium text-slate-700">
						Marcar como resultado crítico
					</label>
				</div>

				{/* Botones */}
				<div className="flex gap-4 pt-4">
					<Button
						type="submit"
						disabled={loading}
						className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
					>
						<Save className="w-4 h-4 mr-2" />
						{loading ? 'Guardando...' : 'Crear Orden'}
					</Button>
					<Link href="/dashboard/medic/ordenes">
						<Button type="button" variant="outline" className="border-blue-200 text-slate-700">
							Cancelar
						</Button>
					</Link>
				</div>
			</motion.form>
		</div>
	);
}

