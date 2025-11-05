// app/dashboard/medic/consultas/[id]/edit/page.tsx
import React from 'react';
import createSupabaseServerClient from '@/app/adapters/server';
import Link from 'next/link';
import { format } from 'date-fns';
import EditConsultationForm from '@/app/dashboard/medic/consultas/[id]/edit/EditConsultationForm'; // client component

type Props = { params: Promise<{ id?: string }> };

export default async function EditConsultationPage({ params }: Props) {
	const { id } = await params;

	if (!id) {
		return (
			<main className="min-h-screen p-8 bg-slate-50 dark:bg-[#041027]">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border">
						<p className="text-rose-600 font-semibold">No se proporcionó el ID de la consulta.</p>
						<Link href="/dashboard/medic/consultas" className="mt-4 inline-block text-teal-600 font-medium">
							← Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return (
			<main className="min-h-screen p-8 bg-slate-50 dark:bg-[#041027]">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border">
						<p className="text-rose-600 font-semibold">
							ID inválido: <span className="font-mono">{id}</span>
						</p>
						<Link href="/dashboard/medic/consultas" className="mt-4 inline-block text-teal-600 font-medium">
							← Volver a consultas
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
			`id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, vitals, started_at, ended_at, created_at,
       patient:patient_id(firstName,lastName,dob),
       doctor:doctor_id(id,name,email)`
		)
		.eq('id', id)
		.single();

	if (error || !consultationRaw) {
		return (
			<main className="min-h-screen p-8 bg-slate-50 dark:bg-[#041027]">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border">
						<p className="text-rose-600 font-semibold">No se encontró la consulta o hubo un error: {error?.message ?? 'Consulta no encontrada'}</p>
						<Link href="/dashboard/medic/consultas" className="mt-4 inline-block text-teal-600 font-medium">
							← Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	const consultation: any = consultationRaw;
	const patient = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
	const doctor = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;

	return (
		<main className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-[#031225] dark:to-[#021018] p-8">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
					{/* Left: Breadcrumb + Title + Patient Info */}
					<div className="flex flex-col w-full lg:w-auto gap-3">
						{/* Breadcrumb */}
						<Link href="/dashboard/medic/consultas" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition">
							← Volver a Consultas
						</Link>

						{/* Title */}
						<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Editar Consulta</h1>

						{/* Patient + Date */}
						<div className="flex flex-wrap items-center gap-4 mt-2">
							{/* Patient */}
							<div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-700 border border-teal-200 dark:border-teal-600 px-3 py-2 rounded-full shadow-sm">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-white font-semibold text-base">{patient ? patient.firstName?.[0] ?? 'P' : 'P'}</div>
								<div className="flex flex-col">
									<span className="font-medium text-slate-800 dark:text-slate-100">{patient ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() : '—'}</span>
									<span className="text-xs text-slate-500 dark:text-slate-300">Paciente</span>
								</div>
							</div>

							{/* Created Date */}
							<div className="flex items-center gap-2 bg-slate-100 dark:bg-[#06353a] px-3 py-1 rounded-full border border-slate-200 dark:border-[#0a4a4f] text-xs font-mono text-slate-700 dark:text-slate-100 shadow-sm">
								<span>Creada:</span>
								<span>{consultation.created_at ? format(new Date(consultation.created_at), 'dd/MM/yyyy HH:mm') : '—'}</span>
							</div>
						</div>
					</div>

					{/* Right: Doctor Card */}
					<div className="w-full lg:w-auto mt-4 lg:mt-0">
						<div className="flex items-center gap-3 bg-white dark:bg-[#042b2f] border border-slate-200 dark:border-[#07363a] rounded-xl px-4 py-3 shadow-md">
							<div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-white font-semibold text-base">
								{doctor?.name
									? doctor.name
											.split(' ')
											.map((n: string) => n[0])
											.slice(0, 2)
											.join('')
									: 'D'}
							</div>
							{/* Info */}
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full">
								<div className="flex flex-col gap-1">
									<span className="text-xs text-slate-400 dark:text-slate-300 uppercase tracking-wide">Doctor asignado</span>
									<span className="text-base font-semibold text-slate-800 dark:text-slate-100">{doctor?.name ?? '—'}</span>
									{doctor?.email && <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{doctor.email}</span>}
								</div>

								{/* Badge opcional de rol o especialidad si quieres */}
								{/* <div className="mt-2 sm:mt-0 inline-flex items-center px-3 py-1 bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white text-xs font-medium rounded-full shadow-sm">
        Especialidad
      </div> */}
							</div>
						</div>
					</div>
				</div>

				<EditConsultationForm initial={consultation} patient={patient} doctor={doctor} />
			</div>
		</main>
	);
}
