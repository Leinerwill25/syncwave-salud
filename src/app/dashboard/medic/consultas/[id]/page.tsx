// dashboard/medic/consultas/[id]/page.tsx
import { format } from 'date-fns';
import createSupabaseServerClient from '@/app/adapters/server';
import Link from 'next/link';
import { User, Stethoscope, Calendar, Clock, FileText, ClipboardList, DollarSign } from 'lucide-react';
import QuickFacts from '@/app/dashboard/medic/components/QuickFacts';
import ConsultationDataDisplay from '@/app/dashboard/medic/consultas/components/ConsultationDataDisplay';
import PatientSelector from '@/app/dashboard/medic/consultas/[id]/components/PatientSelector';
import PatientHistoryLink from '@/app/dashboard/medic/consultas/[id]/components/PatientHistoryLink';
import ApproveAttendanceButton from '@/app/dashboard/medic/consultas/[id]/components/ApproveAttendanceButton';

type Props = { params: Promise<{ id?: string }> };

export default async function ConsultationDetail({ params }: Props) {
	const { id } = await params;

	/* ---------------------------
     Layout / Small helpers
     --------------------------- */
	const PageShell = ({ children }: { children: React.ReactNode }) => (
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
			<div className="max-w-6xl mx-auto">{children}</div>
		</main>
	);

	const CardShell = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl bg-white border border-blue-100 shadow-sm p-5">{children}</div>;

	const ErrorCard = ({ message }: { message: string }) => (
		<PageShell>
			<div className="max-w-3xl mx-auto">
				<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
					<h3 className="text-rose-600 font-semibold mb-2">Atención</h3>
					<p className="text-slate-700">{message}</p>
					<div className="mt-4">
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400">
							← Volver a consultas
						</Link>
					</div>
				</div>
			</div>
		</PageShell>
	);

	/* ---------------------------
     Validaciones simples
     --------------------------- */
	if (!id) {
		return <ErrorCard message="No se proporcionó el ID de la consulta en la URL." />;
	}

	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return <ErrorCard message={`El ID proporcionado no tiene formato válido de UUID: ${id}`} />;
	}

	try {
		const { supabase } = createSupabaseServerClient();

		const { data, error } = await supabase
			.from('consultation')
			.select(
				`id, appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id, chief_complaint, diagnosis, notes, vitals, started_at, ended_at, created_at,
         patient:patient_id(firstName,lastName,dob,identifier),
         doctor:doctor_id(id, name, email)`
			)
			.eq('id', id)
			.single();

		// Obtener facturación asociada para verificar si hay pago pendiente
		let facturacionId: string | null = null;
		let hasPendingPayment = false;

		if (data) {
			// Buscar facturación por appointment_id si existe
			if (data.appointment_id) {
				const { data: facturacionByAppointment } = await supabase
					.from('facturacion')
					.select('id, estado_pago')
					.eq('appointment_id', data.appointment_id)
					.eq('doctor_id', data.doctor_id)
					.maybeSingle();

				if (facturacionByAppointment) {
					facturacionId = facturacionByAppointment.id;
					hasPendingPayment = facturacionByAppointment.estado_pago === 'pendiente' || facturacionByAppointment.estado_pago === 'pendiente_verificacion';
				}
			}

			// Si no hay facturación por appointment, buscar por patient_id o unregistered_patient_id
			if (!facturacionId) {
				const query = supabase
					.from('facturacion')
					.select('id, estado_pago')
					.eq('doctor_id', data.doctor_id)
					.order('fecha_emision', { ascending: false })
					.limit(1);

				if (data.patient_id) {
					query.eq('patient_id', data.patient_id);
				} else if (data.unregistered_patient_id) {
					query.eq('unregistered_patient_id', data.unregistered_patient_id);
				}

				const { data: facturacionByPatient } = await query.maybeSingle();
				if (facturacionByPatient) {
					facturacionId = facturacionByPatient.id;
					hasPendingPayment = facturacionByPatient.estado_pago === 'pendiente' || facturacionByPatient.estado_pago === 'pendiente_verificacion';
				}
			}
		}

		if (error || !data) {
			return <ErrorCard message={`No se encontró la consulta o hubo un error: ${error?.message ?? 'Consulta no encontrada.'}`} />;
		}

		const c: any = data;

		// Obtener datos del paciente no registrado si existe
		let unregisteredPatient: any = null;
		if (c.unregistered_patient_id) {
			const { data: unregisteredData } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification, phone, email, birth_date, sex, address')
				.eq('id', c.unregistered_patient_id)
				.maybeSingle();
			
			if (unregisteredData) {
				unregisteredPatient = {
					id: unregisteredData.id,
					firstName: unregisteredData.first_name,
					lastName: unregisteredData.last_name,
					identifier: unregisteredData.identification,
					phone: unregisteredData.phone,
					email: unregisteredData.email,
					birthDate: unregisteredData.birth_date,
					sex: unregisteredData.sex,
					address: unregisteredData.address,
					isUnregistered: true,
				};
			}
		}

		const currentPatient = c.patient || unregisteredPatient;
		const isUnregistered = !!c.unregistered_patient_id;

		const initials = (name?: string, last?: string) => {
			if (!name && !last) return '??';
			const a = (name || '').trim().split(' ')[0] || '';
			const b = (last || '').trim().split(' ')[0] || '';
			return `${a[0] || ''}${b[0] || ''}`.toUpperCase();
		};

		const startedAt = c.started_at ? new Date(c.started_at) : c.created_at ? new Date(c.created_at) : null;

		/* ---------------------------
       Render principal
       --------------------------- */
		return (
			<PageShell>
				<div className="space-y-6">
					{/* Header / Hero */}
					<header>
						<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
							<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
								<div className="min-w-0">
									<h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
										<FileText size={22} />
										Detalle de consulta
									</h1>
									<p className="mt-1 text-sm text-white/90">Resumen clínico, paciente y acciones</p>
								</div>

								<div className="flex items-center gap-4">
									<div className="hidden md:flex flex-col text-right text-white/90">
										<span className="text-xs uppercase tracking-wide">Fecha</span>
										<span className="text-sm font-medium">{startedAt ? format(startedAt, 'dd MMM yyyy • HH:mm') : '—'}</span>
									</div>

									<div className="flex items-center gap-3 bg-white/10 px-3 py-1.5 rounded-lg">
										<div aria-hidden className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-lg">
											{initials(currentPatient?.firstName, currentPatient?.lastName)}
										</div>
										<div className="text-white text-sm text-left">
											<div className="font-semibold truncate">{currentPatient ? `${currentPatient.firstName} ${currentPatient.lastName}` : 'Paciente —'}</div>
											<div className="text-xs opacity-90 truncate">
												{isUnregistered ? 'Paciente No Registrado' : c.doctor?.name ? `Dr(a). ${c.doctor.name}` : '—'}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Meta row */}
						<div className="bg-white p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-blue-100">
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<span className="inline-flex items-center gap-2 bg-blue-50 text-slate-800 rounded-full px-3 py-1">
									<Calendar size={14} /> {c.appointment_id ? 'Cita vinculada' : 'Consulta libre'}
								</span>

								<span className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1 text-slate-800">
									<Clock size={14} /> {c.started_at ? format(new Date(c.started_at), 'dd/MM/yyyy HH:mm') : '—'}
								</span>

								<span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-teal-50 text-teal-700">
									<ClipboardList size={14} /> <span className="font-mono ml-1">{c.id}</span>
								</span>
							</div>

							<div className="flex items-center gap-3 flex-wrap">
								{hasPendingPayment && (
									<ApproveAttendanceButton consultationId={c.id} facturacionId={facturacionId} hasPendingPayment={hasPendingPayment} />
								)}
								<Link href={`/dashboard/medic/consultas/${c.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400">
									Editar
								</Link>

								<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-white text-slate-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300">
									Volver
								</Link>
							</div>
						</div>
					</header>

					{/* Grid content */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Left: main clinical area */}
						<div className="lg:col-span-2 space-y-5">
							<CardShell>
								<h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<Stethoscope size={18} /> Motivo de consulta
								</h2>
								<p className="text-slate-800 leading-relaxed">{c.chief_complaint || '—'}</p>
							</CardShell>

							<CardShell>
								<h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<User size={18} /> Diagnóstico
								</h2>
								<p className="text-slate-800 leading-relaxed">{c.diagnosis || '—'}</p>
							</CardShell>

							<CardShell>
								<h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
									<FileText size={18} /> Notas clínicas
								</h2>
								<div className="prose prose-sm max-w-none">
									<pre className="whitespace-pre-wrap bg-blue-50 p-3 rounded text-sm text-slate-900">{c.notes || '—'}</pre>
								</div>
							</CardShell>

							{/* New Consultation Data Display */}
							{(() => {
								const vitalsObj = typeof c.vitals === 'string' ? JSON.parse(c.vitals) : c.vitals || {};
								const initialPatientData = vitalsObj.initial_patient_data;
								const specialtyData = vitalsObj.specialty_data;
								const privateNotes = vitalsObj.private_notes;
								const images = vitalsObj.images;

								if (initialPatientData || specialtyData || privateNotes || images) {
									return <ConsultationDataDisplay vitals={c.vitals} initialPatientData={initialPatientData} specialtyData={specialtyData} privateNotes={privateNotes} images={images} />;
								}
								return null;
							})()}

							{/* Signos / Vitals — tarjeta limpia, tipografía y layout por secciones */}
							<div className="rounded-2xl bg-white border border-blue-100 shadow-sm p-4">
								<h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">Signos Vitales</h3>

								{c.vitals ? (
									(() => {
										// helpers localizados dentro del JSX (no crear componente nuevo)
										const vitalsObj = typeof c.vitals === 'string' ? JSON.parse(c.vitals) : c.vitals || {};
										
										// Filtrar campos que no son signos vitales (scheduled_date, consultation_date, initial_patient_data, specialty_data, private_notes, images)
										const excludedKeys = ['scheduled_date', 'consultation_date', 'initial_patient_data', 'specialty_data', 'private_notes', 'images'];
										const filteredVitalsObj: Record<string, any> = {};
										Object.keys(vitalsObj).forEach(key => {
											if (!excludedKeys.includes(key)) {
												filteredVitalsObj[key] = vitalsObj[key];
											}
										});

										const prettyLabel = (key: string) =>
											key
												.replace(/_/g, ' ')
												.replace(/\b([a-z])/g, (m) => m.toUpperCase())
												.replace(/\bBpm\b/i, 'BPM')
												.replace(/\bBp\b/i, 'PA')
												.replace(/\bSpo2\b/i, 'SpO₂')
												.replace(/\bGcs\b/i, 'GCS')
												.replace(/\bFev1\b/i, 'FEV1')
												.replace(/\bFvc\b/i, 'FVC')
												.replace(/\bBnp\b/i, 'BNP')
												.replace(/\bPhq9\b/i, 'PHQ-9')
												.replace(/\bIop\b/i, 'PIO')
												.replace(/\bHba1c\b/i, 'HbA1c')
												.replace(/\bTsh\b/i, 'TSH');

										const formatValue = (val: any) => {
											if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return '—';
											if (typeof val === 'boolean') return val ? 'Sí' : 'No';
											// numeric-like strings: show as-is
											return String(val);
										};

										// custom order: ensure 'general' first, then cardiology, pulmonology, others alpha
										const orderPriority: Record<string, number> = { general: 0, cardiology: 1, pulmonology: 2 };
										const sections = Object.keys(filteredVitalsObj).sort((a, b) => {
											const pa = orderPriority[a] ?? 99;
											const pb = orderPriority[b] ?? 99;
											if (pa !== pb) return pa - pb;
											return a.localeCompare(b);
										});

										return (
											<div className="space-y-4">
												{sections.length === 0 ? (
													<div className="text-sm text-slate-700">No hay signos vitales registrados.</div>
												) : (
													sections.map((section) => {
														const sectionData = filteredVitalsObj[section] || {};
														const entries = Object.entries(sectionData);

													return (
														<div key={section} className="border border-blue-100 rounded-xl p-3 bg-blue-50/50">
															<div className="flex items-center justify-between mb-3">
																<div className="flex items-center gap-3">
																	<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center text-teal-600 font-semibold">{String(section).charAt(0).toUpperCase()}</div>
																	<div>
																		<div className="text-sm font-semibold text-slate-900">{prettyLabel(section)}</div>
																		<div className="text-xs text-slate-700">{entries.length} campo(s)</div>
																	</div>
																</div>
															</div>

															{entries.length === 0 ? (
																<div className="text-sm text-slate-700">No hay datos en esta sección.</div>
															) : (
																<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
																	{entries.map(([k, v]) => (
																		<div key={k} className="flex flex-col gap-1 p-3 rounded-lg bg-white border border-blue-100">
																			<div className="text-xs text-slate-800 font-medium">{prettyLabel(k)}</div>
																			<div className="flex items-center justify-between gap-2">
																				<div className="text-sm font-medium text-slate-900 break-words">{formatValue(v)}</div>
																				{/* pequeño chip para valores booleanos o numéricos destacables */}
																				{typeof v === 'boolean' ? <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${v ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>{v ? 'Sí' : 'No'}</div> : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{v}</div> : null}
																			</div>
																		</div>
																	))}
																</div>
															)}
														</div>
													);
													})
												)}
											</div>
										);
									})()
								) : (
									<div className="text-sm text-slate-700">No hay signos vitales registrados.</div>
								)}
							</div>
						</div>

						{/* Right: quick facts / actions — estilos mejorados, mismos subcomponentes */}
						<aside className="space-y-5">
							{/* Selector de Paciente */}
							<div className="rounded-2xl bg-white border border-blue-100 shadow-sm p-4">
								<PatientSelector
									consultationId={c.id}
									currentPatientId={c.patient_id}
									currentUnregisteredPatientId={c.unregistered_patient_id}
									currentPatientName={currentPatient ? `${currentPatient.firstName} ${currentPatient.lastName}` : 'Sin paciente'}
									isUnregistered={isUnregistered}
								/>
							</div>

							{/* QuickFacts — envuelto en tarjeta con estilo corporativo */}
							<div className="rounded-2xl bg-white border border-blue-100 shadow-sm p-4">
								<QuickFacts c={{ ...c, patient: currentPatient }} />
							</div>

							{/* Acciones — tarjeta con botones corporativos y accesibles */}
							<div className="rounded-2xl bg-white border border-blue-100 shadow-sm p-4">
								<h3 className="text-sm font-semibold text-slate-900 mb-3">Acciones</h3>

								<div className="flex flex-col gap-2">
									{currentPatient && (
										<PatientHistoryLink patientId={c.patient_id} isUnregistered={isUnregistered} />
									)}

									<Link href={`/dashboard/medic/consultas/${c.id}/prescription`} className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-400" aria-label="Crear prescripción">
										Crear Prescripción
									</Link>

									<Link href={`/dashboard/medic/consultas/${c.id}/pago`} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400" aria-label="Registrar pago de consulta">
										<DollarSign size={16} />
										Registrar pago de consulta
									</Link>
								</div>
							</div>
						</aside>
					</div>

					{/* Footer note */}
					<div className="text-center text-xs text-slate-700">Registro clínico — mantén la información precisa y evita compartir datos sensibles fuera de la plataforma.</div>
				</div>
			</PageShell>
		);
	} catch (err: any) {
		return (
			<PageShell>
				<div className="max-w-3xl mx-auto">
					<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
						<h3 className="text-rose-600 font-semibold mb-2">Error</h3>
						<p className="text-slate-700">Ocurrió un error al cargar la consulta: {err?.message ?? String(err)}</p>
						<div className="mt-4">
							<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700">
								← Volver a consultas
							</Link>
						</div>
					</div>
				</div>
			</PageShell>
		);
	}
}
