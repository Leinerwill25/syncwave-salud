import { createSupabaseServerClient } from '@/app/adapters/server';
import { getCurrentOrganizationId } from '@/app/dashboard/clinic/invites/page';
import Link from 'next/link';
import { Users, Search, Activity, User, Plus } from 'lucide-react';

export default async function ClinicPatientsPage() {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return <div className="p-6">No se detectó la organización.</div>;
	}

	// Obtener citas de la clínica con datos del paciente
	const { data: appointments, error } = await supabase
		.from('appointment')
		.select(`
			patient_id,
			patient (
				id,
				firstName,
				lastName,
				identifier,
				phone,
				dob,
				emergency_contact_name,
				emergency_contact_phone
			)
		`)
		.eq('organization_id', organizationId)
		.not('patient_id', 'is', null);

	if (error) {
		console.error('Error fetching clinic patients:', error);
	}

	// Deduplicar pacientes por ID
	const patientMap = new Map<string, any>();
	appointments?.forEach(app => {
        const p = Array.isArray(app.patient) ? app.patient[0] : app.patient;
		if (p && !patientMap.has(p.id)) {
			patientMap.set(p.id, p);
		}
	});

	const uniquePatients = Array.from(patientMap.values());

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
													<span className="font-semibold text-slate-900 block">{patient.firstName} {patient.lastName}</span>
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
												href={`/dashboard/clinic/patients/${patient.id}`}
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
