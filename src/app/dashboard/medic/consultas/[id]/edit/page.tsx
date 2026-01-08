// app/dashboard/medic/consultas/[id]/edit/page.tsx
import React from 'react';
import createSupabaseServerClient from '@/app/adapters/server';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, ArrowLeft, Clock } from 'lucide-react';
import EditConsultationForm from '@/app/dashboard/medic/consultas/[id]/edit/EditConsultationForm'; // client component

type Props = { params: Promise<{ id?: string }> };

export default async function EditConsultationPage({ params }: Props) {
	const { id } = await params;

	if (!id) {
		return (
			<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
						<h3 className="text-rose-600 font-semibold mb-2">Atención</h3>
						<p className="text-slate-700 mb-4">No se proporcionó el ID de la consulta.</p>
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400">
							<ArrowLeft size={16} />
							Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return (
			<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
						<h3 className="text-rose-600 font-semibold mb-2">ID Inválido</h3>
						<p className="text-slate-700 mb-1">
							El ID proporcionado no tiene formato válido de UUID: <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{id}</span>
						</p>
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 mt-4">
							<ArrowLeft size={16} />
							Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	const supabase = await createSupabaseServerClient();

	const { data: consultationRaw, error } = await supabase
		.from('consultation')
		.select(
			`id, appointment_id, patient_id, unregistered_patient_id, doctor_id, chief_complaint, diagnosis, icd11_code, icd11_title, notes, vitals, started_at, ended_at, created_at,
       patient:patient_id(id,firstName,lastName,dob,identifier),
       doctor:doctor_id(id,name,email)`
		)
		.eq('id', id)
		.single();

	// Obtener las especialidades guardadas del doctor desde medic_profile
	// Para consultorios privados, usar private_specialty; si no existe, usar specialty
	// Parsear correctamente si viene como string JSON o array
	let doctorSpecialties: string[] = [];
	if (consultationRaw?.doctor_id) {
		const { data: medicProfile } = await supabase.from('medic_profile').select('specialty, private_specialty').eq('doctor_id', consultationRaw.doctor_id).maybeSingle();

		// Helper para parsear especialidades
		const parseSpecialties = (specialtyData: any): string[] => {
			if (!specialtyData) return [];
			
			// Si es un array, filtrar y retornar
			if (Array.isArray(specialtyData)) {
				return specialtyData.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
			}
			
			// Si es un string, intentar parsearlo como JSON primero
			if (typeof specialtyData === 'string' && specialtyData.trim().length > 0) {
				const trimmed = specialtyData.trim();
				// Intentar parsear como JSON si parece ser un array JSON
				if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
					try {
						const parsed = JSON.parse(trimmed);
						if (Array.isArray(parsed)) {
							return parsed.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
						}
					} catch {
						// Si falla el parseo, tratarlo como string simple
					}
				}
				// Si no es JSON, tratarlo como string simple
				return [trimmed];
			}
			
			return [];
		};

		// Priorizar private_specialty si existe, sino usar specialty
		const specialtiesRaw = medicProfile?.private_specialty || medicProfile?.specialty || null;
		doctorSpecialties = parseSpecialties(specialtiesRaw);
	}

	if (error || !consultationRaw) {
		return (
			<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
						<h3 className="text-rose-600 font-semibold mb-2">Error</h3>
						<p className="text-slate-700 mb-4">No se encontró la consulta o hubo un error: {error?.message ?? 'Consulta no encontrada'}</p>
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400">
							<ArrowLeft size={16} />
							Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	const consultation: any = consultationRaw;

	// Obtener datos del paciente (registrado o no registrado)
	let patient: any = null;
	let isUnregistered = false;

	if (consultation.patient_id) {
		// Paciente registrado - obtener datos directamente de la tabla Patient
		const { data: fullPatientData } = await supabase.from('patient').select('id, firstName, lastName, dob, identifier, phone, address, profession, blood_type, allergies, chronic_conditions, current_medication').eq('id', consultation.patient_id).maybeSingle();

		if (fullPatientData) {
			patient = {
				id: fullPatientData.id,
				firstName: fullPatientData.firstName,
				lastName: fullPatientData.lastName,
				dob: fullPatientData.dob,
				identifier: fullPatientData.identifier,
				phone: fullPatientData.phone || null,
				address: fullPatientData.address || null,
				profession: (fullPatientData as any).profession || null,
				bloodType: (fullPatientData as any).blood_type || null,
				allergies: fullPatientData.allergies || null,
				chronicConditions: (fullPatientData as any).chronic_conditions || null,
				currentMedications: (fullPatientData as any).current_medication || null,
			};
		} else {
			// Fallback: usar datos básicos de la relación
			const rawPatient = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
			patient = rawPatient;
		}
	} else if (consultation.unregistered_patient_id) {
		// Paciente no registrado
		isUnregistered = true;
		const { data: unregisteredPatientData } = await supabase.from('unregisteredpatients').select('id, first_name, last_name, identification, phone, email, birth_date, sex, address, profession, allergies, chronic_conditions, current_medication, family_history').eq('id', consultation.unregistered_patient_id).maybeSingle();

		if (unregisteredPatientData) {
			// Normalizar datos del paciente no registrado para que coincidan con la estructura esperada
			patient = {
				id: unregisteredPatientData.id,
				firstName: unregisteredPatientData.first_name,
				lastName: unregisteredPatientData.last_name,
				identifier: unregisteredPatientData.identification,
				dob: unregisteredPatientData.birth_date,
				phone: unregisteredPatientData.phone,
				email: unregisteredPatientData.email,
				sex: unregisteredPatientData.sex,
				address: unregisteredPatientData.address,
				profession: unregisteredPatientData.profession || null,
				allergies: unregisteredPatientData.allergies,
				chronicConditions: unregisteredPatientData.chronic_conditions,
				currentMedication: unregisteredPatientData.current_medication,
				familyHistory: unregisteredPatientData.family_history,
				isUnregistered: true,
			};
		}
	}

	const doctor = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;

	const initials = (name?: string, last?: string) => {
		if (!name && !last) return '??';
		const a = (name || '').trim().split(' ')[0] || '';
		const b = (last || '').trim().split(' ')[0] || '';
		return `${a[0] || ''}${b[0] || ''}`.toUpperCase();
	};

	const startedAt = consultation.started_at ? new Date(consultation.started_at) : consultation.created_at ? new Date(consultation.created_at) : null;

	return (
		<main className="min-h-screen bg-slate-50 dark:bg-slate-900">
			<div className="max-w-7xl mx-auto">
				{/* Header Section - Professional Design */}
				<header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
					<div className="px-6 py-4">
						{/* Breadcrumb */}
						<nav className="mb-4">
							<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
								<ArrowLeft size={16} />
								Volver a Consultas
							</Link>
						</nav>

						{/* Title and Info */}
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div className="flex-1">
								<h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3 mb-2">
									<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
										<FileText size={20} className="text-white" />
									</div>
									Editar Consulta Médica
								</h1>
								<p className="text-sm text-slate-600 dark:text-slate-400 ml-13">Modifica la información clínica, signos vitales y genera informes médicos</p>
							</div>

							{/* Quick Info Cards */}
							<div className="flex flex-wrap items-center gap-3">
								{startedAt && (
									<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
										<Clock size={16} className="text-slate-600 dark:text-slate-400" />
										<div className="flex flex-col">
											<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fecha Consulta</span>
											<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{format(startedAt, 'dd MMM yyyy • HH:mm')}</span>
										</div>
									</div>
								)}

								{consultation.created_at && (
									<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
										<Clock size={16} className="text-slate-600 dark:text-slate-400" />
										<div className="flex flex-col">
											<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Creada</span>
											<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{format(new Date(consultation.created_at), 'dd/MM/yyyy HH:mm')}</span>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Patient & Doctor Info Bar */}
					<div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
						<div className="flex flex-wrap items-center gap-4">
							{/* Patient Card */}
							{patient && (
								<div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-sm transition-all hover:shadow-md ${isUnregistered ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'}`}>
									<div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-sm ${isUnregistered ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' : 'bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200'}`}>{initials(patient.firstName, patient.lastName)}</div>
									<div className="flex flex-col min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
												{patient.firstName} {patient.lastName}
											</span>
											{isUnregistered && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 font-medium shrink-0">No Registrado</span>}
										</div>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-xs text-slate-600 dark:text-slate-400">Paciente</span>
											{patient.identifier && <span className="text-xs text-slate-500 dark:text-slate-500">• {patient.identifier}</span>}
										</div>
									</div>
								</div>
							)}

							{/* Doctor Card */}
							{doctor && (
								<div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm transition-all hover:shadow-md">
									<div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold text-base shadow-sm">
										{doctor.name
											? doctor.name
													.split(' ')
													.map((n: string) => n[0])
													.slice(0, 2)
													.join('')
													.toUpperCase()
											: 'DR'}
									</div>
									<div className="flex flex-col min-w-0">
										<span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">{doctor.name ?? '—'}</span>
										<span className="text-xs text-slate-600 dark:text-slate-400">Médico Asignado</span>
									</div>
								</div>
							)}

							{/* Consultation ID */}
							<div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
								<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ID:</span>
								<span className="text-xs font-mono text-slate-700 dark:text-slate-300">{consultation.id.slice(0, 8)}...</span>
							</div>
						</div>
					</div>
				</header>

				{/* Form Section - No wrapper needed, form handles its own styling */}
				<EditConsultationForm initial={consultation} patient={patient} doctor={doctor} doctorSpecialties={doctorSpecialties} />
			</div>
		</main>
	);
}
