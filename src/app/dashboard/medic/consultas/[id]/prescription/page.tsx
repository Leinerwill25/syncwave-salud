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

	const supabase = await createSupabaseServerClient();

	const { data: consultation, error } = await supabase.from('consultation').select('id, appointment_id, patient_id, unregistered_patient_id, doctor_id, chief_complaint, diagnosis, created_at, patient:patient_id(firstName,lastName), doctor:doctor_id(id,name)').eq('id', id).single();

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

	// Obtener prescripciones existentes para esta consulta
	let existingPrescription: any = null;
	let prescriptionFiles: any[] = [];
	try {
		const { data: prescriptions, error: presError } = await supabase
			.from('prescription')
			.select(`
				id,
				notes,
				valid_until,
				status,
				issued_at,
				created_at,
				prescription_item:prescription_item!fk_prescriptionitem_prescription (
					id,
					name,
					dosage,
					form,
					frequency,
					duration,
					quantity,
					instructions
				)
			`)
			.eq('consultation_id', (consultation as any).id)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (!presError && prescriptions) {
			existingPrescription = prescriptions;
			
			// Cargar archivos de la prescripción desde prescription_files
			if (prescriptions.id) {
				const { data: files, error: filesError } = await supabase
					.from('prescription_files')
					.select('id, file_name, path, url, size, content_type')
					.eq('prescription_id', prescriptions.id);
				
				if (!filesError && files && files.length > 0) {
					// Generar URLs públicas si no existen
					for (const file of files) {
						let fileUrl = file.url;
						if (!fileUrl && file.path) {
							try {
								// Intentar con bucket prescriptions (donde están los archivos reales)
								const { data: urlData } = supabase.storage
									.from('prescriptions')
									.getPublicUrl(file.path);
								fileUrl = urlData?.publicUrl || null;
							} catch (err) {
								console.warn('Error generando URL para archivo:', err);
							}
						}
						if (fileUrl) {
							prescriptionFiles.push({
								id: file.id,
								name: file.file_name,
								url: fileUrl,
								type: file.content_type,
								size: file.size,
								path: file.path,
							});
						}
					}
				}
			}
		}
	} catch (err) {
		console.warn('Error obteniendo prescripción existente:', err);
	}

	// Agregar archivos a la prescripción existente
	if (existingPrescription && prescriptionFiles.length > 0) {
		existingPrescription.files = prescriptionFiles;
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-8">
			<div className="max-w-4xl mx-auto">
				{/* Client-side prescription form */}
				<PrescriptionForm 
					consultationId={(consultation as any).id} 
					patientId={(consultation as any).patient_id || null} 
					unregisteredPatientId={(consultation as any).unregistered_patient_id || null}
					doctorId={(consultation as any).doctor_id}
					existingPrescription={existingPrescription}
				/>
			</div>
		</main>
	);
}
