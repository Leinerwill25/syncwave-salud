import { createSupabaseServerClient } from '@/app/adapters/server';
import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { getCurrentOrganizationId } from '@/app/dashboard/clinic/invites/page';
import Link from 'next/link';
import { Users, Search, Activity, User, Plus } from 'lucide-react';

export default async function ClinicPatientsPage() {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return <div className="p-6">No se detectó la organización.</div>;
	}

	// Obtener citas de la clínica con datos de pacientes (registrados y no registrados)
	const { data: appointments, error } = await supabase
		.from('appointment')
		.select(`
			patient_id,
			unregistered_patient_id,
			patient (
				id,
				firstName,
				lastName,
				identifier,
				phone,
				dob,
				emergency_contact_name,
				emergency_contact_phone
			),
			unregisteredpatients (
				id,
				first_name,
				last_name,
				identification,
				phone,
				birth_date,
				emergency_contact_name,
				emergency_contact_phone
			)
		`)
		.eq('organization_id', organizationId);

	if (error) {
		console.error('Error fetching clinic patients:', error);
	}

	// Obtener pacientes no registrados creados manualmente por la clínica
	let manualPatients: any[] = [];
	const adminSupabase = createSupabaseAdminClient();
	
	const { data: orgUsers, error: orgUsersError } = await adminSupabase
		.from('users')
		.select('authId')
		.eq('organizationId', organizationId);

	if (orgUsersError) {
		console.error('Error fetching org users:', orgUsersError);
	}

	const orgUserIds = orgUsers?.map(u => u.authId).filter(Boolean) || [];

	if (orgUserIds.length > 0) {
		const { data: unregData, error: unregError } = await adminSupabase
			.from('unregisteredpatients')
			.select(`
				id,
				first_name,
				last_name,
				identification,
				phone,
				birth_date,
				emergency_contact_name,
				emergency_contact_phone
			`)
			.in('created_by', orgUserIds);

		if (unregError) {
			console.error('Error fetching unregistered patients:', unregError);
		} else {
			manualPatients = unregData || [];
		}
	}

	// Deduplicar y normalizar pacientes
	const patientMap = new Map<string, any>();
	
	appointments?.forEach(app => {
		// 1. Procesar pacientes registrados
		const pReg = Array.isArray(app.patient) ? app.patient[0] : app.patient;
		if (pReg && !patientMap.has(pReg.id)) {
			patientMap.set(pReg.id, {
				...pReg,
				type: 'REGISTRADO'
			});
		}

		// 2. Procesar pacientes NO registrados
		const pUnreg = Array.isArray(app.unregisteredpatients) ? app.unregisteredpatients[0] : app.unregisteredpatients;
		if (pUnreg && !patientMap.has(pUnreg.id)) {
			patientMap.set(pUnreg.id, {
				id: pUnreg.id,
				firstName: pUnreg.first_name,
				lastName: pUnreg.last_name,
				identifier: pUnreg.identification,
				phone: pUnreg.phone,
				dob: pUnreg.birth_date,
				emergency_contact_name: pUnreg.emergency_contact_name,
				emergency_contact_phone: pUnreg.emergency_contact_phone,
				type: 'NO_REGISTRADO'
			});
		}
	});

	// 3. Procesar pacientes NO registrados (manuales sin cita aún)
	manualPatients.forEach(pUnreg => {
		if (pUnreg && !patientMap.has(pUnreg.id)) {
			patientMap.set(pUnreg.id, {
				id: pUnreg.id,
				firstName: pUnreg.first_name,
				lastName: pUnreg.last_name,
				identifier: pUnreg.identification,
				phone: pUnreg.phone,
				dob: pUnreg.birth_date,
				emergency_contact_name: pUnreg.emergency_contact_name,
				emergency_contact_phone: pUnreg.emergency_contact_phone,
				type: 'NO_REGISTRADO'
			});
		}
	});

	const rawUniquePatients = Array.from(patientMap.values());

	// Deduplicar adicionalmente por documento de identidad normalizado
	const deduplicatedPatientsMap = new Map<string, any>();
	
	rawUniquePatients.forEach(patient => {
		if (!patient.identifier) {
			// Si no tiene cédula, se guarda por su ID único para no perderlo
			deduplicatedPatientsMap.set(patient.id, patient);
			return;
		}

		// Normalizar documento: quitar todos los espacios y pasar a mayúscula
		const normalizedId = patient.identifier.toUpperCase().replace(/\s+/g, '');
		const existing = deduplicatedPatientsMap.get(normalizedId);

		if (!existing) {
			deduplicatedPatientsMap.set(normalizedId, patient);
		} else {
			// Si ya existe uno, evaluar cuál tiene más información para quedarse con el mejor.
			// Damos puntos por tener información importante (contacto de emergencia, etc)
			const existingScore = (existing.emergency_contact_name ? 2 : 0) + (existing.phone ? 1 : 0);
			const currentScore = (patient.emergency_contact_name ? 2 : 0) + (patient.phone ? 1 : 0);

			if (currentScore > existingScore) {
				deduplicatedPatientsMap.set(normalizedId, patient);
			} else if (currentScore === existingScore) {
				// En caso de empate, la App Registrado tiene más fuerza
				if (patient.type === 'REGISTRADO' && existing.type === 'NO_REGISTRADO') {
					deduplicatedPatientsMap.set(normalizedId, patient);
				}
			}
		}
	});

	const uniquePatients = Array.from(deduplicatedPatientsMap.values());

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
				<div>
					<h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
						<Users className="w-8 h-8 text-sky-600" />
						Pacientes de la Clínica
					</h1>
					<p className="text-slate-500 mt-2 text-lg">Directorio general de pacientes atendidos en el centro médico.</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
						<p className="text-sm font-medium text-slate-500">Total de Pacientes</p>
						<p className="text-2xl font-bold text-slate-900">{uniquePatients.length}</p>
					</div>
					<Link 
						href="/dashboard/clinic/patients/new"
						className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-3 rounded-xl font-semibold transition-all shadow-sm"
					>
						<Plus className="w-5 h-5" />
						Nuevo Paciente Manual
					</Link>
				</div>
			</div>

			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
							<tr>
								<th className="px-6 py-4">Paciente</th>
								<th className="px-6 py-4">Identificación</th>
								<th className="px-6 py-4">Teléfono</th>
								<th className="px-6 py-4">Contacto de Emergencia</th>
								<th className="px-6 py-4 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{uniquePatients.length > 0 ? (
								uniquePatients.map((patient: any) => (
									<tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center text-sky-700 font-bold">
													{patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span className="font-semibold text-slate-900 block">{patient.firstName} {patient.lastName}</span>
														<span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
															patient.type === 'REGISTRADO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
														}`}>
															{patient.type === 'REGISTRADO' ? 'App' : 'No Reg'}
														</span>
													</div>
													{patient.dob && (
														<span className="text-xs text-slate-500">
															Nac: {new Date(patient.dob).toLocaleDateString()}
														</span>
													)}
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-slate-600 font-medium">
											{patient.identifier || 'No registrado'}
										</td>
										<td className="px-6 py-4 text-slate-600">
											{patient.phone || 'N/A'}
										</td>
										<td className="px-6 py-4">
											{patient.emergency_contact_name ? (
												<div>
													<p className="text-slate-900 font-medium">{patient.emergency_contact_name}</p>
													<p className="text-slate-500 text-xs">{patient.emergency_contact_phone}</p>
												</div>
											) : (
												<span className="text-slate-400 italic">No registrado</span>
											)}
										</td>
										<td className="px-6 py-4 text-right">
											<Link 
												href={patient.type === 'REGISTRADO' 
													? `/dashboard/clinic/patients/${patient.id}`
													: `/dashboard/clinic/patients/${patient.id}?type=unregistered`
												}
												className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sky-600 hover:bg-sky-50 hover:border-sky-200 transition-all font-medium text-xs shadow-sm"
											>
												<Activity className="w-4 h-4" />
												Ver Historial
											</Link>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={5} className="px-6 py-12 text-center text-slate-500">
										<User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
										No se han registrado pacientes en esta clínica aún.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
