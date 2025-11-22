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

	const { supabase } = createSupabaseServerClient();

	const { data: consultationRaw, error } = await supabase
		.from('consultation')
		.select(
			`id, appointment_id, patient_id, unregistered_patient_id, doctor_id, chief_complaint, diagnosis, notes, vitals, started_at, ended_at, created_at,
       patient:patient_id(firstName,lastName,dob,identifier),
       doctor:doctor_id(id,name,email)`
		)
		.eq('id', id)
		.single();

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

	if (consultation.patient_id && consultation.patient) {
		// Paciente registrado
		patient = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
	} else if (consultation.unregistered_patient_id) {
		// Paciente no registrado
		isUnregistered = true;
		const { data: unregisteredPatientData } = await supabase
			.from('unregisteredpatients')
			.select('id, first_name, last_name, identification, phone, email, birth_date, sex, address, allergies, chronic_conditions, current_medication, family_history')
			.eq('id', consultation.unregistered_patient_id)
			.maybeSingle();
		
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
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Header Section - Mejorado con gradiente */}
				<header>
					<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-2xl shadow-lg">
						<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
							<div className="min-w-0 flex-1">
								{/* Breadcrumb */}
								<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition mb-3">
									<ArrowLeft size={16} />
									Volver a Consultas
								</Link>
								
								{/* Title */}
								<h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
									<FileText size={24} />
									Editar Consulta Médica
								</h1>
								<p className="mt-1 text-sm text-white/90">Modifica la información clínica y signos vitales</p>
							</div>

							{/* Date Badge */}
							{startedAt && (
								<div className="flex flex-col items-end text-right">
									<span className="text-xs text-white/80 uppercase tracking-wide mb-1">Fecha de Consulta</span>
									<span className="text-sm font-medium text-white">{format(startedAt, 'dd MMM yyyy • HH:mm')}</span>
								</div>
							)}
						</div>
					</div>

					{/* Meta Information Row */}
					<div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
						{/* Patient & Doctor Info */}
						<div className="flex flex-wrap items-center gap-4">
							{/* Patient Card */}
							{patient && (
								<div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${isUnregistered ? 'bg-orange-50 border-orange-200' : 'bg-teal-50 border-teal-200'}`}>
									<div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${isUnregistered ? 'bg-orange-200 text-orange-800' : 'bg-teal-200 text-teal-800'}`}>
										{initials(patient.firstName, patient.lastName)}
									</div>
									<div className="flex flex-col min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-slate-900 truncate">
												{patient.firstName} {patient.lastName}
											</span>
											{isUnregistered && (
												<span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">
													No Registrado
												</span>
											)}
										</div>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-xs text-slate-600">Paciente</span>
											{patient.identifier && (
												<span className="text-xs text-slate-500">• {patient.identifier}</span>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Doctor Card */}
							{doctor && (
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 shadow-sm">
									<div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-200 text-indigo-800 font-semibold text-lg">
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
										<span className="font-semibold text-slate-900 truncate">{doctor.name ?? '—'}</span>
										<span className="text-xs text-slate-600">Médico Asignado</span>
									</div>
								</div>
							)}

							{/* Created Date Badge */}
							{consultation.created_at && (
								<div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50">
									<Clock size={14} className="text-blue-600" />
									<div className="flex flex-col">
										<span className="text-xs text-blue-600 font-medium">Creada</span>
										<span className="text-xs font-mono text-slate-700">{format(new Date(consultation.created_at), 'dd/MM/yyyy HH:mm')}</span>
									</div>
								</div>
							)}
						</div>

						{/* Consultation ID Badge */}
						<div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
							<span className="text-xs text-slate-500">ID Consulta:</span>
							<span className="text-xs font-mono text-slate-700">{consultation.id.slice(0, 8)}...</span>
						</div>
					</div>
				</header>

				{/* Form Section */}
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden">
					<EditConsultationForm initial={consultation} patient={patient} doctor={doctor} />
				</div>
			</div>
		</main>
	);
}
