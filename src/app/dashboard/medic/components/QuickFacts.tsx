import { format } from 'date-fns';
import { User, UserCheck, Calendar, Clock, Hash } from 'lucide-react';
import CopyButton from './CopyButton';

type Consultation = any; // ajusta al tipo real si lo tienes

export default function QuickFacts({ c }: { c: Consultation }) {
	const paciente = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : '—';
	const doctor = c.doctor?.name ?? '—';
	const appointment = c.appointment_id ?? null;
	const created = c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy') : '—';

	return (
		<aside>
			<h4 className="text-sm font-medium text-slate-900 mb-4">Datos rápidos</h4>

			<dl className="grid grid-cols-1 gap-3 text-sm">
				{/* Paciente */}
				<div className="flex items-start gap-3">
					<div className="shrink-0 w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center text-teal-700">
						<User size={16} />
					</div>

					<div className="flex-1">
						<dt className="text-slate-700 font-medium">Paciente</dt>
						<dd className="mt-1 font-semibold text-slate-900">{paciente}</dd>
					</div>
				</div>

				{/* Doctor */}
				<div className="flex items-start gap-3">
					<div className="shrink-0 w-10 h-10 rounded-md bg-cyan-50 flex items-center justify-center text-cyan-700">
						<UserCheck size={16} />
					</div>

					<div className="flex-1">
						<dt className="text-slate-700 font-medium">Doctor</dt>
						<dd className="mt-1 font-semibold text-slate-900">{doctor}</dd>
					</div>
				</div>

				{/* Appointment */}
				<div className="flex items-start gap-3">
					<div className="shrink-0 w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center text-teal-700">
						<Calendar size={16} />
					</div>

					<div className="flex-1">
						<dt className="text-slate-700 font-medium">Cita</dt>
						<dd className="mt-1 flex items-center gap-3">
							{appointment ? (
								<>
									<span className="font-mono text-xs md:text-sm break-all text-slate-900">{appointment}</span>
									{/* CopyButton es client-side; está bien importarlo en componente server */}
								</>
							) : (
								<span className="font-semibold text-slate-900">—</span>
							)}
						</dd>
					</div>
				</div>

				{/* Creado */}
				<div className="flex items-start gap-3">
					<div className="shrink-0 w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-700">
						<Clock size={16} />
					</div>

					<div className="flex-1">
						<dt className="text-slate-700 font-medium">Creado</dt>
						<dd className="mt-1 font-semibold text-slate-900">{created}</dd>
					</div>
				</div>
			</dl>
		</aside>
	);
}
