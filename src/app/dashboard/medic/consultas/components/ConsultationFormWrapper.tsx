'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InitialPatientForm, { InitialPatientData } from './InitialPatientForm';
import GeneralForm, { GeneralFormData } from './SpecialtyForms/GeneralForm';
import EndocrinoForm, { EndocrinoFormData } from './SpecialtyForms/EndocrinoForm';
import CardioForm, { CardioFormData } from './SpecialtyForms/CardioForm';
import GineForm, { GineFormData } from './SpecialtyForms/GineForm';
import OftalmoForm, { OftalmoFormData } from './SpecialtyForms/OftalmoForm';
import OdontoForm, { OdontoFormData } from './SpecialtyForms/OdontoForm';
import NeuroForm, { NeuroFormData } from './SpecialtyForms/NeuroForm';
import PediaForm, { PediaFormData } from './SpecialtyForms/PediaForm';
import PsiquiatriaForm, { PsiquiatriaFormData } from './SpecialtyForms/PsiquiatriaForm';
import { Loader2 } from 'lucide-react';

type Specialty = 'MEDICINA_GENERAL' | 'ENDOCRINOLOGIA' | 'CARDIOLOGIA' | 'GINECOLOGIA' | 'OFTALMOLOGIA' | 'ODONTOLOGIA' | 'NEUROLOGIA' | 'PEDIATRIA' | 'PSIQUIATRIA';

interface ConsultationFormWrapperProps {
	patientId?: string;
	doctorId: string | null;
	organizationId: string | null;
}

export default function ConsultationFormWrapper({ patientId: initialPatientId, doctorId, organizationId }: ConsultationFormWrapperProps) {
	const router = useRouter();
	const [step, setStep] = useState<'initial' | 'specialty' | 'complete'>('initial');
	const [patientId, setPatientId] = useState(initialPatientId || '');
	const [doctorSpecialty, setDoctorSpecialty] = useState<Specialty | null>(null);
	const [patientExistsForSpecialist, setPatientExistsForSpecialist] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(false);
	const [fetchingData, setFetchingData] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Form data
	const [initialPatientData, setInitialPatientData] = useState<InitialPatientData | null>(null);
	const [specialtyData, setSpecialtyData] = useState<any>(null);
	const [privateNotes, setPrivateNotes] = useState<string>('');
	const [chiefComplaint, setChiefComplaint] = useState('');
	const [diagnosis, setDiagnosis] = useState('');
	const [notes, setNotes] = useState('');

	// Fetch doctor specialty and check patient
	useEffect(() => {
		async function fetchDoctorData() {
			if (!doctorId) {
				setFetchingData(false);
				return;
			}

			try {
				setFetchingData(true);
				// Get medic profile to find specialty
				const medicRes = await fetch(`/api/medic/profile?doctor_id=${doctorId}`, { credentials: 'include' });
				if (medicRes.ok) {
					const medicData = await medicRes.json();
					const specialty = medicData?.specialty || medicData?.data?.specialty;
					if (specialty) {
						setDoctorSpecialty(specialty as Specialty);
					}
				}

				// Check if patient exists for this specialist
				if (patientId) {
					const checkRes = await fetch(`/api/consultations/check-patient?patient_id=${patientId}&doctor_id=${doctorId}`, { credentials: 'include' });
					if (checkRes.ok) {
						const checkData = await checkRes.json();
						setPatientExistsForSpecialist(checkData.exists || false);
					}
				} else {
					setPatientExistsForSpecialist(false);
				}
			} catch (err) {
				console.error('Error fetching doctor data:', err);
			} finally {
				setFetchingData(false);
			}
		}

		fetchDoctorData();
	}, [doctorId, patientId]);

	// Determine which step to show
	useEffect(() => {
		if (fetchingData) return;

		// If no patient selected, show initial form
		if (!patientId) {
			setStep('initial');
			return;
		}

		// If patient doesn't exist for this specialist, show initial form
		if (patientExistsForSpecialist === false) {
			setStep('initial');
			return;
		}

		// Otherwise show specialty form
		if (doctorSpecialty) {
			setStep('specialty');
		}
	}, [patientId, patientExistsForSpecialist, doctorSpecialty, fetchingData]);

	const handleInitialFormSubmit = async (data: InitialPatientData) => {
		setInitialPatientData(data);
		setChiefComplaint(data.chiefComplaint || '');
		
		// Create patient or unregistered patient if needed
		if (!patientId) {
			setLoading(true);
			try {
				// Try to create unregistered patient first (for patients not in system)
				const unregisteredRes = await fetch('/api/unregistered-patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						first_name: data.firstName,
						last_name: data.lastName,
						identification: data.identifier,
						birth_date: data.dob,
						sex: data.sex,
						phone: data.phone || '',
						email: data.email,
						address: data.address,
						height_cm: data.vitals?.height,
						weight_kg: data.vitals?.weight,
						bmi: data.vitals?.bmi,
						allergies: data.allergies,
						chronic_conditions: data.chronicConditions,
						current_medication: data.currentMedication,
						family_history: JSON.stringify(data.familyHistory),
						motive: data.chiefComplaint,
						vital_bp_systolic: data.vitals?.bpSystolic,
						vital_bp_diastolic: data.vitals?.bpDiastolic,
						vital_heart_rate: data.vitals?.heartRate,
						vital_respiratory_rate: data.vitals?.respiratoryRate,
						vital_temperature: data.vitals?.temperature,
						vital_spo2: data.vitals?.spo2,
						vital_glucose: data.vitals?.capillaryGlucose,
					}),
				});

				if (unregisteredRes.ok) {
					const unregisteredData = await unregisteredRes.json();
					// Store the unregistered patient ID
					setPatientId(unregisteredData.id || unregisteredData.data?.id);
					// Mark that this is an unregistered patient
					setInitialPatientData({ ...data, isUnregistered: true, unregisteredPatientId: unregisteredData.id || unregisteredData.data?.id });
				} else {
					// Fallback: create regular patient
					const patientRes = await fetch('/api/patients', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							firstName: data.firstName,
							lastName: data.lastName,
							identifier: data.identifier,
							dob: data.dob,
							gender: data.sex,
							phone: data.phone,
							address: data.address,
						}),
					});

					if (patientRes.ok) {
						const patientData = await patientRes.json();
						setPatientId(patientData.id || patientData.data?.id);
					}
				}
			} catch (err) {
				console.error('Error creating patient:', err);
				setError('Error al crear paciente. Intente de nuevo.');
			} finally {
				setLoading(false);
			}
		}

		if (doctorSpecialty) {
			setStep('specialty');
		} else {
			// If no specialty, go directly to complete
			setStep('complete');
		}
	};

	const handleSpecialtyFormChange = (data: any) => {
		setSpecialtyData(data);
		// Extract private notes if it's psychiatry
		if (doctorSpecialty === 'PSIQUIATRIA' && data.privateNotes) {
			setPrivateNotes(data.privateNotes);
		}
	};

	const handleSubmit = async () => {
		if (!doctorId) return setError('No se detectó la sesión del médico.');
		if (!patientId) return setError('Debe seleccionar un paciente.');
		if (!chiefComplaint) return setError('El motivo de consulta es obligatorio.');

		setLoading(true);
		setError(null);

		try {
			// Build vitals from initial patient data
			const vitals = initialPatientData?.vitals ? { general: initialPatientData.vitals } : {};

			// Build the consultation payload
			// Check if this is an unregistered patient
			const isUnregistered = initialPatientData?.isUnregistered || initialPatientData?.unregisteredPatientId;
			const unregisteredPatientId = initialPatientData?.unregisteredPatientId;
			const payload: any = {
				patient_id: isUnregistered ? null : patientId,
				unregistered_patient_id: isUnregistered ? (unregisteredPatientId || patientId) : null,
				doctor_id: doctorId,
				organization_id: organizationId,
				chief_complaint: chiefComplaint,
				diagnosis: diagnosis || null,
				notes: notes || null,
				vitals: Object.keys(vitals).length > 0 ? vitals : null,
			};

			// Add new JSON fields
			if (initialPatientData) {
				payload.initial_patient_data = initialPatientData;
			}
			if (specialtyData) {
				payload.specialty_data = specialtyData;
			}
			if (privateNotes && doctorSpecialty === 'PSIQUIATRIA') {
				payload.private_notes = privateNotes;
			}

			const res = await fetch('/api/consultations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json().catch(() => ({}));
			setLoading(false);

			if (!res.ok) {
				console.error('Error creando consulta', res.status, data);
				return setError(data.error || 'Error al crear consulta.');
			}

			// Redirect to consultation detail
			router.push(`/dashboard/medic/consultas/${data?.data?.id || data?.id}`);
		} catch (err: any) {
			console.error(err);
			setError(err?.message ?? 'Error al crear consulta.');
			setLoading(false);
		}
	};

	if (fetchingData) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="animate-spin text-teal-600" size={24} />
				<span className="ml-3 text-slate-700">Cargando información del médico...</span>
			</div>
		);
	}

	// Show initial patient form if needed
	if (step === 'initial') {
		return (
			<div>
				<InitialPatientForm
					initialData={initialPatientData || undefined}
					onSubmit={handleInitialFormSubmit}
					onCancel={() => router.push('/dashboard/medic/consultas')}
					loading={loading}
				/>
			</div>
		);
	}

	// Show specialty form
	if (step === 'specialty' && doctorSpecialty) {
		return (
			<div className="space-y-6">
				{/* Render appropriate specialty form */}
				{doctorSpecialty === 'MEDICINA_GENERAL' && <GeneralForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'ENDOCRINOLOGIA' && <EndocrinoForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'CARDIOLOGIA' && <CardioForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'GINECOLOGIA' && <GineForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'OFTALMOLOGIA' && <OftalmoForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'ODONTOLOGIA' && <OdontoForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'NEUROLOGIA' && <NeuroForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'PEDIATRIA' && <PediaForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}
				{doctorSpecialty === 'PSIQUIATRIA' && <PsiquiatriaForm initialData={specialtyData} onChange={handleSpecialtyFormChange} />}

				{/* Additional fields */}
				<div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4">
					<h3 className="text-lg font-semibold text-slate-900">Información Adicional</h3>
					<div>
						<label className="block text-sm font-medium text-slate-800 mb-2">Diagnóstico</label>
						<textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnóstico (opcional)" rows={4} className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition" />
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-800 mb-2">Notas Clínicas</label>
						<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones, recomendaciones, plan de tratamiento" rows={4} className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition" />
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-end gap-3">
					<button type="button" onClick={() => setStep('initial')} className="px-5 py-3 border border-blue-200 rounded-2xl text-slate-800 bg-white hover:bg-blue-50 transition">
						Volver
					</button>
					<button type="button" onClick={handleSubmit} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed">
						{loading ? 'Guardando...' : 'Guardar Consulta'}
					</button>
				</div>

				{error && <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}
			</div>
		);
	}

	return null;
}

