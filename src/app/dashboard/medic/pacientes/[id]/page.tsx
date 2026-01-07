// app/dashboard/medic/patients/[id]/page.tsx
import { format } from 'date-fns';
import createSupabaseServerClient from '@/app/adapters/server';
import Link from 'next/link';
import { FileText, User, ArrowLeft, Plus } from 'lucide-react';
import { apiRequireRole } from '@/lib/auth-guards';
import { cookies } from 'next/headers';
import PatientHistoryClient from './PatientHistoryClient';

type Props = { params: Promise<{ id?: string }> };

export default async function PatientHistory({ params }: Props) {
	const { id } = await params;

	const PageShell = ({ children }: { children: React.ReactNode }) => (
		<main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#071422] dark:to-[#021018] py-10 px-6">
			<div className="max-w-6xl mx-auto">{children}</div>
		</main>
	);

	const ErrorBox = ({ title, message }: { title?: string; message: string }) => (
		<PageShell>
			<div className="max-w-3xl mx-auto">
				<div className="rounded-2xl bg-white dark:bg-[#042634] border border-slate-200 dark:border-slate-800 shadow-md p-6">
					{title && <h3 className="text-rose-600 font-semibold mb-2">{title}</h3>}
					<p className="text-slate-700 dark:text-slate-200">{message}</p>
					<div className="mt-4">
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400">
							<ArrowLeft size={16} /> Volver a consultas
						</Link>
					</div>
				</div>
			</div>
		</PageShell>
	);

	// validación UUID mínima
	if (!id) {
		return <ErrorBox message="No se proporcionó el ID del paciente en la URL." />;
	}
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return <ErrorBox message={`El ID proporcionado no tiene formato válido de UUID: ${id}`} />;
	}

	try {
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Verificar autenticación y rol
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) {
			return <ErrorBox message="No autorizado" />;
		}
		const doctor = authResult.user;
		if (!doctor) {
			return <ErrorBox message="No autorizado" />;
		}

		// Verificar acceso médico
		const accessCheckRes = await fetch(
			`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/medical-access/check?patient_id=${id}`,
			{
				headers: {
					Cookie: cookieStore.toString(),
				},
			}
		);
		let hasFullAccess = false;
		let hasConsultation = false;
		if (accessCheckRes.ok) {
			const accessData = await accessCheckRes.json();
			hasFullAccess = accessData.hasFullAccess || false;
			hasConsultation = accessData.hasConsultation || false;
		}

		// Obtener paciente (campos del schema: firstName, lastName, dob, phone, gender, id)
		const { data: patient, error: patientError } = await supabase.from('patient').select('id, firstName, lastName, dob, phone, gender, createdAt').eq('id', id).maybeSingle();

		if (patientError || !patient) {
			return <ErrorBox message={`No se encontró el paciente: ${patientError?.message ?? 'Paciente no encontrado.'}`} />;
		}

		// Obtener consultas del paciente
		// Si no tiene acceso completo, solo mostrar las consultas del médico actual
		let consultationsQuery = supabase
			.from('consultation')
			.select('id, chief_complaint, diagnosis, started_at, created_at, doctor:doctor_id(id,name,email)')
			.eq('patient_id', id);

		if (!hasFullAccess) {
			// Solo consultas del médico actual
			consultationsQuery = consultationsQuery.eq('doctor_id', doctor.userId);
		}

		const { data: consultations, error: consultError } = await consultationsQuery.order('started_at', { ascending: false });

		// normalizar a array seguro para evitar "possibly null"
		const consultationsArray: any[] = Array.isArray(consultations) ? consultations : [];

		// Estadísticas simples
		const totalConsults = consultationsArray.length;
		const lastConsult = totalConsults > 0 ? consultationsArray[0] : null;
		const lastVisitDate = lastConsult ? lastConsult.started_at ?? lastConsult.created_at : null;

		// Si hay error cargando consultas, mostramos ficha paciente + mensaje
		if (consultError) {
			return (
				<PageShell>
					<div className="space-y-6">
						{/* Header */}
						<div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
							<div className="bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] p-6">
								<div className="flex items-center justify-between gap-4">
									<div className="text-white">
										<h2 className="text-2xl font-semibold flex items-center gap-3">
											<User size={20} /> Historial del paciente
										</h2>
										<p className="mt-1 text-sm opacity-90">Ficha del paciente</p>
									</div>

									<div className="text-right text-white/90">
										<div className="text-xs uppercase tracking-wide">Paciente</div>
										<div className="text-sm font-medium">{`${patient.firstName} ${patient.lastName}`}</div>
									</div>
								</div>
							</div>
						</div>

						{/* Ficha paciente + error de consultas */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div className="lg:col-span-2">
								<div className="rounded-2xl bg-white dark:bg-[#04202b] border p-5 shadow-sm">
									<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Información</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
										<div>
											<span className="text-xs text-slate-500">ID</span>
											<div className="font-mono break-all">{patient.id}</div>
										</div>
										<div>
											<span className="text-xs text-slate-500">Fecha de nacimiento</span>
											<div>{patient.dob ? format(new Date(patient.dob), 'dd/MM/yyyy') : '—'}</div>
										</div>
										<div>
											<span className="text-xs text-slate-500">Teléfono</span>
											<div>{patient.phone ?? '—'}</div>
										</div>
										<div>
											<span className="text-xs text-slate-500">Género</span>
											<div>{patient.gender ?? '—'}</div>
										</div>
									</div>

									<div className="mt-4 flex gap-2">
										<Link href={`/dashboard/medic/patients/${patient.id}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400">
											Editar paciente
										</Link>

										<Link href={`/dashboard/medic/patients/${patient.id}?tab=notes`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-slate-700 text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300">
											Notas
										</Link>
									</div>

									<div className="mt-4 text-sm text-rose-600">Ocurrió un error cargando las consultas: {consultError.message}</div>
								</div>
							</div>

							<aside className="space-y-4">
								<div className="rounded-2xl bg-white dark:bg-[#042434] border p-4 shadow-sm">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-700 text-teal-700 dark:text-white flex items-center justify-center font-semibold">{patient.firstName?.[0] ?? 'P'}</div>
										<div>
											<div className="text-xs text-slate-500">Paciente</div>
											<div className="font-medium">{`${patient.firstName} ${patient.lastName}`}</div>
										</div>
									</div>

									<div className="mt-4 text-sm text-slate-700 dark:text-slate-200">
										<div>
											<span className="text-xs text-slate-500">Consultas</span>
											<div className="font-medium">{totalConsults}</div>
										</div>

										<div className="mt-3">
											<span className="text-xs text-slate-500">Última visita</span>
											<div>{lastVisitDate ? format(new Date(lastVisitDate), 'dd/MM/yyyy HH:mm') : '—'}</div>
										</div>
									</div>
								</div>
							</aside>
						</div>
					</div>
				</PageShell>
			);
		}

		// Render normal con consultas
		return (
			<PageShell>
				<PatientHistoryClient
					patientId={id}
					patientName={`${patient.firstName} ${patient.lastName}`}
					hasFullAccess={hasFullAccess}
					hasConsultation={hasConsultation}
				/>
				<div className="space-y-6">
					{/* Header */}
					<div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
						<div className="bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] p-6">
							<div className="flex items-start justify-between gap-4">
								<div className="text-white">
									<h2 className="text-2xl md:text-3xl font-semibold flex items-center gap-3">
										<User size={22} />
										Historial del paciente
									</h2>
									<p className="mt-1 text-sm text-white/90">Registros clínicos y consultas asociadas</p>
								</div>

								<div className="text-right text-white/90">
									<div className="text-xs uppercase tracking-wide">Paciente</div>
									<div className="text-sm font-medium">{`${patient.firstName} ${patient.lastName}`}</div>
								</div>
							</div>
						</div>
					</div>

					{/* Contenido principal */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Consultas (principal) */}
						<section className="lg:col-span-2 space-y-4">
							<div className="rounded-2xl bg-white dark:bg-[#04202b] border p-5 shadow-sm">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
										<FileText size={18} /> Consultas <span className="text-sm text-slate-500 ml-2">({totalConsults})</span>
									</h3>

									<div className="flex items-center gap-2">
										<Link href={`/dashboard/medic/consultas/new?patientId=${patient.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-teal-600 to-cyan-500 text-white text-sm shadow">
											<Plus size={14} /> Nueva consulta
										</Link>
										<div className="text-sm text-slate-500">{totalConsults > 0 ? `${totalConsults} registros` : 'Sin registros'}</div>
									</div>
								</div>

								<div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
									{consultationsArray.length === 0 && (
										<div className="py-12 text-center">
											<div className="text-sm text-slate-500">No hay consultas registradas para este paciente.</div>
										</div>
									)}

									{consultationsArray.map((row: unknown) => {
										interface ConsultationRow {
											id: string;
											chief_complaint?: string | null;
											diagnosis?: string | null;
											started_at?: string | null;
											created_at?: string | null;
											doctor?: Array<{ id: string; name: string; email: string }> | { id: string; name: string; email: string };
										}
										const consultation = row as ConsultationRow;
										// normalizar doctor si viene como arreglo
										const doctor = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;
										const when = consultation.started_at ? new Date(consultation.started_at) : consultation.created_at ? new Date(consultation.created_at) : null;
										return (
											<Link key={consultation.id} href={`/dashboard/medic/consultas/${consultation.id}`} className="block hover:bg-slate-50 dark:hover:bg-[#031e26] p-4 flex items-start justify-between gap-4" aria-label={`Ver consulta ${consultation.id}`}>
												<div className="min-w-0">
													<div className="text-sm text-slate-500">{doctor?.name ? `Dr(a). ${doctor.name}` : 'Médico —'}</div>
													<div className="text-base font-medium text-slate-800 dark:text-slate-100 truncate">{consultation.chief_complaint || consultation.diagnosis || 'Consulta sin título'}</div>
													<div className="text-xs text-slate-500 mt-1 truncate">{consultation.diagnosis ?? ''}</div>
												</div>

												<div className="text-right text-sm text-slate-500">
													<div>{when ? format(when, 'dd/MM/yyyy') : '—'}</div>
													<div className="text-xs mt-1">{when ? format(when, 'HH:mm') : ''}</div>
												</div>
											</Link>
										);
									})}
								</div>
							</div>

							{/* Nota / recomendaciones */}
							<div className="rounded-2xl bg-white dark:bg-[#04202b] border p-4 shadow-sm">
								<h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">Recomendaciones</h4>
								<p className="text-sm text-slate-600 dark:text-slate-300">Mantén la información del paciente actualizada. Usa la sección de notas para detalles clínicos relevantes y evita compartir datos sensibles fuera de la plataforma.</p>
							</div>
						</section>

						{/* Ficha rápida paciente (aside) */}
						<aside className="space-y-4">
							<div className="rounded-2xl bg-white dark:bg-[#042434] border p-4 shadow-sm">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-700 text-teal-700 dark:text-white flex items-center justify-center font-semibold text-lg">{patient.firstName?.[0] ?? 'P'}</div>

									<div>
										<div className="text-xs text-slate-500">Paciente</div>
										<div className="font-medium">{`${patient.firstName} ${patient.lastName}`}</div>
									</div>
								</div>

								<div className="mt-4 text-sm text-slate-700 dark:text-slate-200 space-y-3">
									<div>
										<div className="text-xs text-slate-500">ID</div>
										<div className="font-mono break-all text-sm">{patient.id}</div>
									</div>

									<div>
										<div className="text-xs text-slate-500">Fecha de nacimiento</div>
										<div>{patient.dob ? format(new Date(patient.dob), 'dd/MM/yyyy') : '—'}</div>
									</div>

									<div>
										<div className="text-xs text-slate-500">Teléfono</div>
										<div>{patient.phone ?? '—'}</div>
									</div>

									<div>
										<div className="text-xs text-slate-500">Género</div>
										<div>{patient.gender ?? '—'}</div>
									</div>
								</div>

								<div className="mt-4 flex gap-2">
									<Link href={`/dashboard/medic/patients/${patient.id}/edit`} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400">
										Editar paciente
									</Link>

									<Link href={`/dashboard/medic/consultas/new?patientId=${patient.id}`} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-white text-slate-700 text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300">
										Nueva consulta
									</Link>
								</div>
							</div>
						</aside>
					</div>

					<div className="text-center text-xs text-slate-500">Registro clínico — mantén la información precisa y evita compartir datos sensibles fuera de la plataforma.</div>
				</div>
			</PageShell>
		);
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		return <ErrorBox title="Error" message={`Ocurrió un error al cargar la página: ${errorMessage}`} />;
	}
}
