import { createSupabaseServerClient } from '@/app/adapters/server';
import { getCurrentOrganizationId } from '@/app/dashboard/clinic/invites/page';
import { TrendingUp, DollarSign, FileText, Calendar, Activity } from 'lucide-react';

export default async function ClinicIncomesPage() {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return <div className="p-6">No se detectó la organización.</div>;
	}

	// Obtener facturas de la clínica
	const { data: bills, error } = await supabase
		.from('facturacion')
		.select(`
			id,
			total,
			currency,
			estado_factura,
			estado_pago,
			fecha_emision,
			numero_factura,
			patient (
				firstName,
				lastName
			),
			doctor:doctor_id (
				first_name,
				last_name
			)
		`)
		.eq('organization_id', organizationId)
		.order('fecha_emision', { ascending: false });

	if (error) {
		console.error('Error fetching incomes:', error);
	}

	// Cálculos de ingresos
	const currentMonth = new Date().getMonth();
	const currentYear = new Date().getFullYear();

	let totalIncome = 0;
	let monthlyIncome = 0;
	let pendingIncome = 0;

	const facturacion = bills || [];

	facturacion.forEach((b: any) => {
		const isPaid = b.estado_pago === 'pagado' || b.estado_pago === 'completado';
		const date = new Date(b.fecha_emision);
		
		if (isPaid) {
			totalIncome += Number(b.total || 0);
			if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
				monthlyIncome += Number(b.total || 0);
			}
		} else {
			pendingIncome += Number(b.total || 0);
		}
	});

	const formatMoney = (amount: number) => {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	};

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
				<div>
					<h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
						<TrendingUp className="w-8 h-8 text-emerald-600" />
						Ingresos de la Clínica
					</h1>
					<p className="text-slate-500 mt-2 text-lg">Resumen financiero y facturación de pacientes.</p>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
					<div className="flex items-center gap-4 mb-4">
						<div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
							<DollarSign className="w-6 h-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ingresos del Mes</p>
							<p className="text-2xl font-bold text-slate-900">{formatMoney(monthlyIncome)}</p>
						</div>
					</div>
					<div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded inline-block">
						Mes actual
					</div>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
					<div className="flex items-center gap-4 mb-4">
						<div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
							<Activity className="w-6 h-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ingresos Totales (Histórico)</p>
							<p className="text-2xl font-bold text-slate-900">{formatMoney(totalIncome)}</p>
						</div>
					</div>
					<div className="text-xs text-sky-600 font-medium bg-sky-50 px-2 py-1 rounded inline-block">
						Acumulado
					</div>
				</div>

				<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
					<div className="flex items-center gap-4 mb-4">
						<div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
							<FileText className="w-6 h-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Cuentas por Cobrar</p>
							<p className="text-2xl font-bold text-slate-900">{formatMoney(pendingIncome)}</p>
						</div>
					</div>
					<div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded inline-block">
						Facturas pendientes
					</div>
				</div>
			</div>

			{/* Tabla de Facturas */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				<div className="p-5 border-b border-slate-100 flex items-center justify-between">
					<h3 className="font-semibold text-slate-800 text-lg">Historial de Facturación</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-slate-50 text-slate-500 font-medium">
							<tr>
								<th className="px-6 py-4">Fecha</th>
								<th className="px-6 py-4">Factura</th>
								<th className="px-6 py-4">Paciente</th>
								<th className="px-6 py-4">Cobrado por</th>
								<th className="px-6 py-4">Monto</th>
								<th className="px-6 py-4">Estado</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{facturacion.length > 0 ? (
								facturacion.map((f: any) => {
									const isPaid = f.estado_pago === 'pagado' || f.estado_pago === 'completado';
									return (
										<tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
											<td className="px-6 py-4 text-slate-500 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<Calendar className="w-4 h-4" />
													{new Date(f.fecha_emision).toLocaleDateString()}
												</div>
											</td>
											<td className="px-6 py-4 font-medium text-slate-900">
												{f.numero_factura || <span className="text-slate-400 italic">Borrador</span>}
											</td>
											<td className="px-6 py-4 font-medium text-slate-700">
												{f.patient ? `${f.patient.firstName} ${f.patient.lastName}` : 'N/A'}
											</td>
											<td className="px-6 py-4 text-slate-600">
												{f.doctor ? `Dr. ${f.doctor.first_name}` : 'N/A'}
											</td>
											<td className="px-6 py-4 font-bold text-slate-900">
												{f.currency} {f.total?.toFixed(2)}
											</td>
											<td className="px-6 py-4">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
												}`}>
													{f.estado_pago?.toUpperCase() || 'PENDIENTE'}
												</span>
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center text-slate-500">
										<FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
										No hay registros de ingresos ni facturación.
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
