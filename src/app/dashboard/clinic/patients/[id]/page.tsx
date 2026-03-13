import { createSupabaseServerClient } from '@/app/adapters/server';
import { getCurrentOrganizationId } from '@/app/dashboard/clinic/invites/page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Activity, Calendar, Stethoscope, FileText } from 'lucide-react';

export default async function ClinicPatientDetailPage({ 
	params, 
	searchParams 
}: { 
	params: { id: string },
	searchParams: { type?: string }
}) {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);
	const patientId = params.id;
	const isUnregistered = searchParams.type === 'unregistered';

	if (!organizationId) {
		return <div className="p-6">No se detectó la organización.</div>;
	}

	// Obtener datos del paciente (de la tabla correspondiente)
	let patientData: any = null;
	if (isUnregistered) {
		const { data, error } = await supabase
			.from('unregisteredpatients')
			.select('*')
			.eq('id', patientId)
			.single();
		
		if (data) {
			patientData = {
				...data,
				firstName: data.first_name,
				lastName: data.last_name,
				identifier: data.identification,
				dob: data.birth_date,
				phone: data.phone
			};
		}
	} else {
		const { data, error } = await supabase
			.from('patient')
			.select('*')
			.eq('id', patientId)
			.single();
		patientData = data;
	}

	if (!patientData) {
		return notFound();
	}

	const patient = patientData;

	// Obtener consultas (consultation) de la clínica para este paciente
	const consultationsQuery = supabase
		.from('consultation')
		.select(`
			id,
			started_at,
			ended_at,
			diagnosis,
			chief_complaint,
			notes,
			doctor:doctor_id (
				id,
				first_name,
				last_name,
				email
			)
		`)
		.eq('organization_id', organizationId)
		.order('started_at', { ascending: false });

	if (isUnregistered) {
		consultationsQuery.eq('unregistered_patient_id', patientId);
	} else {
		consultationsQuery.eq('patient_id', patientId);
	}

	const { data: consultations, error: consultationsError } = await consultationsQuery;

	if (consultationsError) console.error('Error loading consultations:', consultationsError);

	// Obtener facturación
	const billingQuery = supabase
		.from('facturacion')
		.select(`
			id,
			total,
			currency,
			estado_factura,
			estado_pago,
			fecha_emision,
			numero_factura
		`)
		.eq('organization_id', organizationId)
		.order('fecha_emision', { ascending: false });

	if (isUnregistered) {
		billingQuery.eq('unregistered_patient_id', patientId);
	} else {
		billingQuery.eq('patient_id', patientId);
	}

	const { data: facturacion, error: factError } = await billingQuery;

	if (factError) console.error('Error loading facturacion:', factError);

	// Obtener Notas de Enfermería (Kardex)
	const nursingNotesQuery = supabase
		.from('nurse_kardex_notes')
		.select(`
			id,
			note_type,
			content,
			created_at,
			nurse:nurse_id (
				user:user_id (
					first_name,
					last_name,
					email
				)
			)
		`)
		.order('created_at', { ascending: false });

	if (isUnregistered) {
		nursingNotesQuery.eq('unregistered_patient_id', patientId);
	} else {
		nursingNotesQuery.eq('patient_id', patientId);
	}

	const { data: nursingNotes, error: notesError } = await nursingNotesQuery;

	if (notesError) console.error('Error loading nursing notes:', notesError);

	// Obtener Procedimientos de Enfermería (Tratamientos/Atenciones)
	const proceduresQuery = supabase
		.from('nurse_procedures')
		.select(`
			procedure_id,
			procedure_name,
			description,
			status,
			started_at,
			completed_at,
			outcome,
			nurse:nurse_id (
				user:user_id (
					first_name,
					last_name
				)
			)
		`)
		.order('started_at', { ascending: false });

	if (isUnregistered) {
		proceduresQuery.eq('unregistered_patient_id', patientId);
	} else {
		proceduresQuery.eq('patient_id', patientId);
	}

	const { data: nurseProcedures, error: proceduresError } = await proceduresQuery;

	if (proceduresError) console.error('Error loading nurse procedures:', proceduresError);

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString();
	};

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
			{/* Breadcrumbs y header */}
			<div className="flex flex-col gap-4">
				<Link href="/dashboard/clinic/patients" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600 transition-colors w-max">
					<ArrowLeft className="w-4 h-4" />
					Volver a Pacientes
				</Link>
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
					<div>
						<h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md">
								{patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
							</div>
							Historial de Paciente
						</h1>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Columna Izquierda: Información del Paciente */}
				<div className="lg:col-span-1 space-y-6">
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
							<User className="w-5 h-5 text-indigo-500" />
							Datos Personales
						</h3>
						<div className="space-y-4 text-sm">
							<div>
								<span className="block text-slate-500 font-medium text-xs uppercase tracking-wider">Nombre Completo</span>
								<span className="font-semibold text-slate-900 text-base">{patient.firstName} {patient.lastName}</span>
							</div>
							<div>
								<span className="block text-slate-500 font-medium text-xs uppercase tracking-wider">Identificación</span>
								<span className="text-slate-700">{patient.identifier || 'No especificada'}</span>
							</div>
							<div>
								<span className="block text-slate-500 font-medium text-xs uppercase tracking-wider">Teléfono de Contacto</span>
								<span className="text-slate-700">{patient.phone || 'No especificado'}</span>
							</div>
							<div>
								<span className="block text-slate-500 font-medium text-xs uppercase tracking-wider">Fecha de Nacimiento</span>
								<span className="text-slate-700">{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'No especificada'}</span>
							</div>
							
							<div className="pt-4 border-t border-slate-100">
								<span className="block text-slate-500 font-medium text-xs uppercase tracking-wider mb-2">Contacto de Emergencia</span>
								{patient.emergency_contact_name ? (
									<div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
										<p className="font-medium text-rose-800">{patient.emergency_contact_name}</p>
										<p className="text-rose-600">{patient.emergency_contact_phone}</p>
										{patient.emergency_contact_relationship && <p className="text-xs text-rose-500 mt-1">({patient.emergency_contact_relationship})</p>}
									</div>
								) : (
									<span className="text-slate-400 italic">No registrado</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Columna Derecha: Consultas y Facturación */}
				<div className="lg:col-span-2 space-y-8">
					{/* Consultas (Historial de Atención) */}
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
							<Activity className="w-5 h-5 text-emerald-500" />
							Historial de Consultas Médicas
						</h3>
						{(!consultations || consultations.length === 0) ? (
							<p className="text-slate-500 italic text-sm py-4">Este paciente no tiene consultas registradas en la clínica.</p>
						) : (
							<div className="space-y-4">
								{consultations.map((c: any) => (
									<div key={c.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
										<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
											<div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
												<Calendar className="w-4 h-4 text-slate-400" />
												{formatDate(c.started_at)}
											</div>
											<div className="flex items-center gap-2 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md">
												<Stethoscope className="w-4 h-4" />
												Dr. {c.doctor?.first_name} {c.doctor?.last_name}
											</div>
										</div>
										<p className="text-sm font-semibold text-slate-800 mb-1">Motivo: <span className="font-normal text-slate-600">{c.chief_complaint || 'No especificado'}</span></p>
										{c.diagnosis && (
											<div className="bg-emerald-50 text-emerald-800 text-sm p-3 rounded-lg border border-emerald-100 mt-3">
												<span className="font-semibold block mb-1">Diagnóstico:</span>
												{c.diagnosis}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					{/* Facturación */}
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
							<FileText className="w-5 h-5 text-sky-500" />
							Historial de Cargos / Servicios
						</h3>
						{(!facturacion || facturacion.length === 0) ? (
							<p className="text-slate-500 italic text-sm py-4">No hay registros de cobros para este paciente en la clínica.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="bg-slate-50 text-slate-500">
										<tr>
											<th className="px-4 py-2 font-medium rounded-tl-lg">Fecha</th>
											<th className="px-4 py-2 font-medium">Factura #</th>
											<th className="px-4 py-2 font-medium">Total</th>
											<th className="px-4 py-2 font-medium">Estado</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{facturacion.map((f: any) => (
											<tr key={f.id} className="hover:bg-slate-50">
												<td className="px-4 py-3 text-slate-600">{new Date(f.fecha_emision).toLocaleDateString()}</td>
												<td className="px-4 py-3 font-medium text-slate-700">{f.numero_factura || 'Borrador'}</td>
												<td className="px-4 py-3 font-semibold text-slate-900">{f.currency} {f.total?.toFixed(2)}</td>
												<td className="px-4 py-3">
													<span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
														f.estado_pago === 'pagado' || f.estado_pago === 'completado' 
														? 'bg-emerald-100 text-emerald-800' 
														: 'bg-amber-100 text-amber-800'
													}`}>
														{f.estado_pago?.toUpperCase() || 'PENDIENTE'}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
					{/* Notas de Enfermería */}
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
							<FileText className="w-5 h-5 text-indigo-500" />
							Kardex de Notas de Enfermería
						</h3>
						{(!nursingNotes || nursingNotes.length === 0) ? (
							<p className="text-slate-500 italic text-sm py-4">No hay notas de enfermería registradas para este paciente.</p>
						) : (
							<div className="space-y-4">
								{nursingNotes.map((note: any) => {
									let typeBadgeVariant = 'bg-slate-100 text-slate-800';
									let typeLabel = 'General';
									
									if (note.note_type === 'private') {
										typeBadgeVariant = 'bg-rose-100 text-rose-800 border border-rose-200';
										typeLabel = 'Privada (Incidencias)';
									} else if (note.note_type === 'evolution') {
										typeBadgeVariant = 'bg-sky-100 text-sky-800 border border-sky-200';
										typeLabel = 'Evolutiva';
									} else if (note.note_type === 'public') {
										typeBadgeVariant = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
										typeLabel = 'Pública';
									}

									return (
										<div key={note.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
											<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
												<div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
													<Calendar className="w-4 h-4 text-slate-400" />
													{formatDate(note.created_at)}
												</div>
												<div className="flex items-center gap-2">
													<span className={`text-xs font-semibold px-2 py-1 rounded-md ${typeBadgeVariant}`}>
														{typeLabel}
													</span>
													<div className="flex items-center gap-1.5 text-sm font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-md">
														<User className="w-3.5 h-3.5" />
														Enf. {note.nurse?.user?.first_name} {note.nurse?.user?.last_name}
													</div>
												</div>
											</div>
											<div className="text-sm text-slate-700 whitespace-pre-wrap mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
												{note.content}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Procedimientos de Enfermería (Tratamientos y Atenciones) */}
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
							<Activity className="w-5 h-5 text-purple-500" />
							Tratamientos y Atención de Enfermería
						</h3>
						{(!nurseProcedures || nurseProcedures.length === 0) ? (
							<p className="text-slate-500 italic text-sm py-4">No hay atenciones o procedimientos registrados para este paciente.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="bg-slate-50 text-slate-500">
										<tr>
											<th className="px-4 py-2 font-medium rounded-tl-lg">Fecha</th>
											<th className="px-4 py-2 font-medium">Procedimiento</th>
											<th className="px-4 py-2 font-medium">Enfermero(a)</th>
											<th className="px-4 py-2 font-medium">Estado</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{nurseProcedures.map((proc: any) => (
											<tr key={proc.procedure_id} className="hover:bg-slate-50">
												<td className="px-4 py-3 text-slate-600">{formatDate(proc.started_at || proc.completed_at)}</td>
												<td className="px-4 py-3">
													<p className="font-medium text-slate-900">{proc.procedure_name}</p>
													{proc.description && <p className="text-xs text-slate-500 mt-1">{proc.description}</p>}
												</td>
												<td className="px-4 py-3 text-slate-700">
													{proc.nurse?.user?.first_name} {proc.nurse?.user?.last_name}
												</td>
												<td className="px-4 py-3">
													<span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
														proc.status === 'completed' 
														? 'bg-emerald-100 text-emerald-800' 
														: proc.status === 'in_progress'
														? 'bg-sky-100 text-sky-800'
														: 'bg-amber-100 text-amber-800'
													}`}>
														{proc.status?.replace('_', ' ').toUpperCase() || 'PENDIENTE'}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
