// app/medic/consultas/[id]/pago/page.tsx
import createSupabaseServerClient from '@/app/adapters/server';
import PaymentForm from '@/app/dashboard/medic/consultas/[id]/pago/PaymentForm';
import Link from 'next/link';

type Props = { params: Promise<{ id?: string }> };

export default async function Page({ params }: Props) {
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

	const { data: consultation, error } = await supabase
		.from('consultation')
		.select('id, appointment_id, patient_id, doctor_id, organization_id, chief_complaint, diagnosis, created_at, patient:patient_id(firstName,lastName), doctor:doctor_id(id,name)')
		.eq('id', id)
		.single();

	if (error || !consultation) {
		return (
			<main className="min-h-screen p-8 bg-slate-50 dark:bg-[#041027]">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border">
						<p className="text-rose-600 font-semibold">No se encontró la consulta o hubo un error: {error?.message ?? 'Consulta no encontrada'}</p>
						<Link href={`/dashboard/medic/consultas`} className="mt-4 inline-block text-teal-600 font-medium">
							← Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	// Verificar si ya existe una facturación para esta consulta
	let existingFacturacion = null;
	if (consultation.appointment_id) {
		const { data: facturacion, error: facturacionError } = await supabase
			.from('facturacion')
			.select('id, appointment_id, patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency, tipo_cambio, billing_series, numero_factura, estado_factura, estado_pago, metodo_pago, fecha_emision, fecha_pago, notas, created_at, updated_at')
			.eq('appointment_id', consultation.appointment_id)
			.maybeSingle();
		if (!facturacionError && facturacion) {
			existingFacturacion = facturacion;
		}
	}

	return (
		<main className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-[#031225] dark:to-[#021018] p-8">
			<div className="max-w-4xl mx-auto">
				{/* Mostrar información si ya existe facturación */}
				{existingFacturacion && (
					<div className="mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
						<h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Facturación existente encontrada</h3>
						<p className="text-sm text-blue-700 dark:text-blue-300">
							Ya existe una facturación para esta consulta. Puedes editar los datos o cambiar el estado del pago. Número de factura: <span className="font-mono">{existingFacturacion.numero_factura || 'N/A'}</span>, Estado actual: <span className="font-semibold">{existingFacturacion.estado_pago}</span>, Total: <span className="font-semibold">{existingFacturacion.total}</span>
						</p>
						<p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Los datos existentes han sido cargados en el formulario. Puedes editarlos y guardar los cambios.</p>
					</div>
				)}

				{/* Client-side payment form */}
				<PaymentForm
					consultationId={(consultation as any).id}
					appointmentId={(consultation as any).appointment_id}
					patientId={(consultation as any).patient_id}
					doctorId={(consultation as any).doctor_id}
					organizationId={(consultation as any).organization_id}
					initialData={existingFacturacion ? {
						id: existingFacturacion.id,
						subtotal: existingFacturacion.subtotal?.toString() || '0',
						impuestos: existingFacturacion.impuestos?.toString() || '0',
						total: existingFacturacion.total?.toString() || '0',
						currency: existingFacturacion.currency || 'USD',
						tipoCambio: existingFacturacion.tipo_cambio?.toString() || '1',
						billingSeries: existingFacturacion.billing_series || '',
						numeroFactura: existingFacturacion.numero_factura || '',
						estadoFactura: existingFacturacion.estado_factura || 'emitida',
						estadoPago: existingFacturacion.estado_pago || 'pendiente',
						metodoPago: existingFacturacion.metodo_pago || '',
						fechaPago: existingFacturacion.fecha_pago ? new Date(existingFacturacion.fecha_pago).toISOString().split('T')[0] : '',
						notas: existingFacturacion.notas || '',
					} : undefined}
				/>
			</div>
		</main>
	);
}

