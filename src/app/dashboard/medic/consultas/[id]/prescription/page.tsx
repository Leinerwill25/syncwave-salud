// app/medic/consultas/[id]/prescription/page.tsx
import createSupabaseServerClient from '@/app/adapters/server';
import PrescriptionForm from '@/app/dashboard/medic/consultas/[id]/prescription/PrescriptionForm';
import Link from 'next/link';
import { format } from 'date-fns';

type Props = { params: Promise<{ id?: string }> };

export default async function Page({ params }: Props) {
	const { id } = await params;

	if (!id) {
		return (
			<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border border-blue-100">
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
			<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border border-blue-100">
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

	const { data: consultation, error } = await supabase.from('consultation').select('id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, created_at, patient:patient_id(firstName,lastName), doctor:doctor_id(id,name)').eq('id', id).single();

	if (error || !consultation) {
		return (
			<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white p-6 shadow border border-blue-100">
						<p className="text-rose-600 font-semibold">No se encontró la consulta o hubo un error: {error?.message ?? 'Consulta no encontrada'}</p>
						<Link href={`/dashboard/medic/consultas`} className="mt-4 inline-block text-teal-600 font-medium">
							← Volver a consultas
						</Link>
					</div>
				</div>
			</main>
		);
	}

	// Normalizar relaciones (Supabase devuelve arrays en select(...) para joins)

	return (
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-8">
			<div className="max-w-4xl mx-auto">
				{/* Client-side prescription form */}
				<PrescriptionForm consultationId={(consultation as any).id} patientId={(consultation as any).patient_id} doctorId={(consultation as any).doctor_id} />
			</div>
		</main>
	);
}
