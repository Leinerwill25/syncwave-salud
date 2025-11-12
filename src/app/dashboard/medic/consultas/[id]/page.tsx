// dashboard/medic/consultas/[id]/page.tsx
import { format } from 'date-fns';
import createSupabaseServerClient from '@/app/adapters/server';
import Link from 'next/link';
import { User, Stethoscope, Calendar, Clock, FileText, ClipboardList, DollarSign } from 'lucide-react';
import QuickFacts from '@/app/dashboard/medic/components/QuickFacts';

type Props = { params: Promise<{ id?: string }> };

export default async function ConsultationDetail({ params }: Props) {
	const { id } = await params;

	/* ---------------------------
     Layout / Small helpers
     --------------------------- */
	const PageShell = ({ children }: { children: React.ReactNode }) => (
		<main className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-[#071422] dark:to-[#021018] py-10 px-6">
			<div className="max-w-6xl mx-auto">{children}</div>
		</main>
	);

	const CardShell = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 shadow-sm p-5">{children}</div>;

	const ErrorCard = ({ message }: { message: string }) => (
		<PageShell>
			<div className="max-w-3xl mx-auto">
				<div className="rounded-2xl bg-white dark:bg-[#042634] border border-slate-200 dark:border-slate-800 shadow-md p-6">
					<h3 className="text-rose-600 font-semibold mb-2">Atención</h3>
					<p className="text-slate-700 dark:text-slate-200">{message}</p>
					<div className="mt-4">
						<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400">
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
				`id, appointment_id, patient_id, doctor_id, organization_id, chief_complaint, diagnosis, notes, vitals, started_at, ended_at, created_at,
         patient:patient_id(firstName,lastName,dob),
         doctor:doctor_id(id, name, email)`
			)
			.eq('id', id)
			.single();

		if (error || !data) {
			return <ErrorCard message={`No se encontró la consulta o hubo un error: ${error?.message ?? 'Consulta no encontrada.'}`} />;
		}

		const c: any = data;

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
						<div className="bg-linear-to-r from-[#0ea5e9] to-[#6366f1] p-6">
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
											{initials(c.patient?.firstName, c.patient?.lastName)}
										</div>
										<div className="text-white text-sm text-left">
											<div className="font-semibold truncate">{c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : 'Paciente —'}</div>
											<div className="text-xs opacity-90 truncate">{c.doctor?.name ? `Dr(a). ${c.doctor.name}` : '—'}</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Meta row */}
						<div className="bg-white dark:bg-[#031e26] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
							<div className="flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
								<span className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full px-3 py-1">
									<Calendar size={14} /> {c.appointment_id ? 'Cita vinculada' : 'Consulta libre'}
								</span>

								<span className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-3 py-1 text-slate-600 dark:text-slate-300">
									<Clock size={14} /> {c.started_at ? format(new Date(c.started_at), 'dd/MM/yyyy HH:mm') : '—'}
								</span>

								<span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-indigo-50 text-indigo-700">
									<ClipboardList size={14} /> <span className="font-mono ml-1">{c.id}</span>
								</span>
							</div>

							<div className="flex items-center gap-3">
								<Link href={`/dashboard/medic/consultas/${c.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400">
									Editar
								</Link>

								<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300">
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
								<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
									<Stethoscope size={18} /> Motivo de consulta
								</h2>
								<p className="text-slate-700 dark:text-slate-200 leading-relaxed">{c.chief_complaint || '—'}</p>
							</CardShell>

							<CardShell>
								<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
									<User size={18} /> Diagnóstico
								</h2>
								<p className="text-slate-700 dark:text-slate-200 leading-relaxed">{c.diagnosis || '—'}</p>
							</CardShell>

							<CardShell>
								<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
									<FileText size={18} /> Notas clínicas
								</h2>
								<div className="prose prose-sm dark:prose-invert max-w-none">
									<pre className="whitespace-pre-wrap bg-slate-50 dark:bg-transparent p-3 rounded text-sm text-slate-700 dark:text-slate-200">{c.notes || '—'}</pre>
								</div>
							</CardShell>

							{/* Signos / Vitals — tarjeta limpia, tipografía y layout por secciones */}
							<div className="rounded-2xl bg-white dark:bg-[#042434] border border-slate-100 dark:border-slate-800 shadow-sm p-4">
								<h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">Signos / Vitals</h3>

								{c.vitals ? (
									(() => {
										// helpers localizados dentro del JSX (no crear componente nuevo)
										const vitalsObj = typeof c.vitals === 'string' ? JSON.parse(c.vitals) : c.vitals || {};
										const prettyLabel = (key: string) =>
											key
												.replace(/_/g, ' ')
												.replace(/\b([a-z])/g, (m) => m.toUpperCase())
												.replace(/\bBpm\b/i, 'BPM');

										const formatValue = (val: any) => {
											if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return '—';
											if (typeof val === 'boolean') return val ? 'Sí' : 'No';
											// numeric-like strings: show as-is
											return String(val);
										};

										// custom order: ensure 'general' first, then cardiology, pulmonology, others alpha
										const orderPriority: Record<string, number> = { general: 0, cardiology: 1, pulmonology: 2 };
										const sections = Object.keys(vitalsObj).sort((a, b) => {
											const pa = orderPriority[a] ?? 99;
											const pb = orderPriority[b] ?? 99;
											if (pa !== pb) return pa - pb;
											return a.localeCompare(b);
										});

										return (
											<div className="space-y-4">
												{sections.map((section) => {
													const sectionData = vitalsObj[section] || {};
													const entries = Object.entries(sectionData);

													return (
														<div key={section} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white/60 dark:bg-[#042434]">
															<div className="flex items-center justify-between mb-3">
																<div className="flex items-center gap-3">
																	<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center text-teal-600 font-semibold">{String(section).charAt(0).toUpperCase()}</div>
																	<div>
																		<div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{prettyLabel(section)}</div>
																		<div className="text-xs text-slate-500 dark:text-slate-400">{entries.length} campo(s)</div>
																	</div>
																</div>
															</div>

															{entries.length === 0 ? (
																<div className="text-sm text-slate-500">No hay datos en esta sección.</div>
															) : (
																<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
																	{entries.map(([k, v]) => (
																		<div key={k} className="flex flex-col gap-1 p-3 rounded-lg bg-white dark:bg-[#022b34] border border-slate-100 dark:border-slate-800">
																			<div className="text-xs text-slate-500 dark:text-slate-400">{prettyLabel(k)}</div>
																			<div className="flex items-center justify-between gap-2">
																				<div className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{formatValue(v)}</div>
																				{/* pequeño chip para valores booleanos o numéricos destacables */}
																				{typeof v === 'boolean' ? <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${v ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>{v ? 'Sí' : 'No'}</div> : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{v}</div> : null}
																			</div>
																		</div>
																	))}
																</div>
															)}
														</div>
													);
												})}
											</div>
										);
									})()
								) : (
									<div className="text-sm text-slate-500">No hay signos registrados.</div>
								)}
							</div>
						</div>

						{/* Right: quick facts / actions — estilos mejorados, mismos subcomponentes */}
						<aside className="space-y-5">
							{/* QuickFacts — envuelto en tarjeta con estilo corporativo */}
							<div className="rounded-2xl bg-white dark:bg-[#041f25] border border-slate-100 dark:border-slate-800 shadow-sm p-4">
								<QuickFacts c={c} />
							</div>

							{/* Acciones — tarjeta con botones corporativos y accesibles */}
							<div className="rounded-2xl bg-white dark:bg-[#042434] border border-slate-100 dark:border-slate-800 shadow-sm p-4">
								<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Acciones</h3>

								<div className="flex flex-col gap-2">
									<Link href={`/dashboard/medic/pacientes/${c.patient_id}`} className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400" aria-label="Ver historial del paciente">
										Ver historial del paciente
									</Link>

									<Link href={`/dashboard/medic/consultas/${c.id}/prescription`} className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400" aria-label="Crear prescripción">
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
					<div className="text-center text-xs text-slate-500">Registro clínico — mantén la información precisa y evita compartir datos sensibles fuera de la plataforma.</div>
				</div>
			</PageShell>
		);
	} catch (err: any) {
		return (
			<PageShell>
				<div className="max-w-3xl mx-auto">
					<div className="rounded-2xl bg-white dark:bg-[#042634] border border-slate-200 dark:border-slate-800 shadow-md p-6">
						<h3 className="text-rose-600 font-semibold mb-2">Error</h3>
						<p className="text-slate-700 dark:text-slate-200">Ocurrió un error al cargar la consulta: {err?.message ?? String(err)}</p>
						<div className="mt-4">
							<Link href="/dashboard/medic/consultas" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white">
								← Volver a consultas
							</Link>
						</div>
					</div>
				</div>
			</PageShell>
		);
	}
}
