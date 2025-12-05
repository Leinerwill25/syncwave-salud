// app/share/consultation/[token]/page.tsx
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import ConsultationShareView from '@/components/share/ConsultationShareView';

type Props = {
	params: Promise<{ token: string }>;
};

export default async function ConsultationSharePage({ params }: Props) {
	const { token } = await params;

	const cookieStore = await cookies();
	const supabase = await createSupabaseServerClient();

	// Obtener el enlace compartido
	const { data: shareLink, error: linkError } = await supabase
		.from('consultation_share_link')
		.select('id, consultation_id, patient_id, expires_at, is_active, access_count')
		.eq('token', token)
		.eq('is_active', true)
		.single();

	if (linkError || !shareLink) {
		notFound();
	}

	// Verificar si el enlace ha expirado
	if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
		notFound();
	}

	// Actualizar contador de accesos
	await supabase
		.from('consultation_share_link')
		.update({
			access_count: (shareLink.access_count || 0) + 1,
			last_accessed_at: new Date().toISOString(),
		})
		.eq('id', shareLink.id);

	// Obtener datos completos de la consulta
	const { data: consultation, error: consultationError } = await supabase
		.from('consultation')
		.select(`
			id,
			patient_id,
			doctor_id,
			appointment_id,
			started_at,
			ended_at,
			chief_complaint,
			diagnosis,
			notes,
			vitals,
			medical_record_id,
			created_at,
			updated_at,
			doctor:User!fk_consultation_doctor (
				id,
				name,
				email
			),
			appointment:appointment!fk_consultation_appointment (
				id,
				reason,
				scheduled_at
			)
		`)
		.eq('id', shareLink.consultation_id)
		.single();

	if (consultationError || !consultation) {
		notFound();
	}

	// Obtener datos del paciente
	const { data: patient, error: patientError } = await supabase
		.from('Patient')
		.select('*')
		.eq('id', shareLink.patient_id)
		.single();

	if (patientError || !patient) {
		notFound();
	}

	// Verificar si hay información médica adicional en unregisteredpatients
	// (por si el paciente fue registrado como no registrado primero)
	let additionalMedicalInfo: any = null;
	const { data: unregisteredPatient } = await supabase
		.from('unregisteredpatients')
		.select('allergies, chronic_conditions, current_medication, family_history')
		.eq('identification', patient.identifier)
		.maybeSingle();

	if (unregisteredPatient) {
		additionalMedicalInfo = {
			allergies: unregisteredPatient.allergies,
			chronicConditions: unregisteredPatient.chronic_conditions,
			currentMedications: unregisteredPatient.current_medication,
			familyHistory: unregisteredPatient.family_history,
		};
	}

	// Obtener prescripciones de la consulta
	const { data: prescriptions } = await supabase
		.from('prescription')
		.select(`
			id,
			consultation_id,
			issued_at,
			valid_until,
			status,
			notes,
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
		.eq('consultation_id', shareLink.consultation_id);

	// Obtener órdenes médicas relacionadas (resultados de laboratorio)
	const { data: orders } = await supabase
		.from('lab_result')
		.select(`
			id,
			patient_id,
			consultation_id,
			result_type,
			result,
			attachments,
			is_critical,
			reported_at,
			created_at
		`)
		.eq('consultation_id', shareLink.consultation_id)
		.eq('patient_id', shareLink.patient_id);

	// Obtener archivos adjuntos de la consulta desde múltiples fuentes
	let consultationAttachments: Array<{ url: string; name: string; type?: string; size?: number }> = [];
	
	// 1. Obtener archivos desde la tabla consultation_files (fuente principal)
	try {
		const { data: consultationFiles, error: filesError } = await supabase
			.from('consultation_files')
			.select('url, file_name, content_type, size, path')
			.eq('consultation_id', shareLink.consultation_id)
			.order('created_at', { ascending: false });

		if (!filesError && consultationFiles && consultationFiles.length > 0) {
			// Procesar cada archivo y generar URL pública si no existe
			for (const file of consultationFiles) {
				let fileUrl = file.url;
				let storagePath = file.path;
				
				// Si el path es organizado (consultations/...), buscar el path real en prescription_files
				if (storagePath && storagePath.startsWith('consultations/')) {
					try {
						// Buscar el path real en prescription_files
						const { data: prescriptionFiles } = await supabase
							.from('prescription_files')
							.select('path, url, prescription_id')
							.eq('file_name', file.file_name)
							.limit(1);
						
						// También buscar por consultation_id si tenemos acceso a prescription
						if (!prescriptionFiles || prescriptionFiles.length === 0) {
							const { data: prescriptions } = await supabase
								.from('prescription')
								.select('id')
								.eq('consultation_id', shareLink.consultation_id)
								.limit(1);
							
							if (prescriptions && prescriptions.length > 0) {
								const { data: presFiles } = await supabase
									.from('prescription_files')
									.select('path, url')
									.eq('prescription_id', prescriptions[0].id)
									.eq('file_name', file.file_name)
									.limit(1);
								
								if (presFiles && presFiles.length > 0) {
									storagePath = presFiles[0].path || storagePath;
									if (!fileUrl && presFiles[0].url) {
										fileUrl = presFiles[0].url;
									}
								}
							}
						} else {
							storagePath = prescriptionFiles[0].path || storagePath;
							if (!fileUrl && prescriptionFiles[0].url) {
								fileUrl = prescriptionFiles[0].url;
							}
						}
					} catch (err) {
						console.warn('[Share Consultation] Error buscando path real en prescription_files:', err);
					}
				}
				
				// Si no hay URL pero sí hay path, generar URL pública desde Supabase Storage
				if (!fileUrl && storagePath) {
					try {
						// Los archivos están en el bucket 'prescriptions'
						const { data: urlData } = supabase.storage
							.from('prescriptions')
							.getPublicUrl(storagePath);
						fileUrl = urlData?.publicUrl || null;
						
						console.log(`[Share Consultation] Generando URL desde path: ${storagePath}`);
						console.log(`[Share Consultation] URL generada: ${fileUrl ? fileUrl.substring(0, 100) + '...' : 'FAILED'}`);
					} catch (storageErr) {
						console.warn('[Share Consultation] Error generando URL pública desde path:', storageErr);
					}
				} else if (fileUrl) {
					// Verificar que la URL guardada sea válida (empiece con http/https)
					if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
						console.warn(`[Share Consultation] URL guardada no válida, intentando generar desde path: ${fileUrl}`);
						fileUrl = null;
						// Intentar generar desde path
						if (storagePath) {
							try {
								const { data: urlData } = supabase.storage
									.from('prescriptions')
									.getPublicUrl(storagePath);
								fileUrl = urlData?.publicUrl || null;
							} catch (err) {
								console.warn('[Share Consultation] Error generando URL desde path como fallback:', err);
							}
						}
					} else {
						// Corregir encoding doble en la URL (ej: %252C -> %2C)
						if (fileUrl.includes('%252')) {
							fileUrl = fileUrl.replace(/%25([0-9A-F]{2})/gi, '%$1');
							console.log(`[Share Consultation] URL corregida (encoding doble): ${fileUrl.substring(0, 100)}...`);
						} else {
							console.log(`[Share Consultation] Usando URL guardada: ${fileUrl.substring(0, 100)}...`);
						}
					}
				}

				if (fileUrl) {
					consultationAttachments.push({
						url: fileUrl,
						name: file.file_name || storagePath?.split('/').pop() || 'Archivo adjunto',
						type: file.content_type || undefined,
						size: file.size || undefined,
					});
				} else {
					console.warn(`[Share Consultation] No se pudo obtener URL para archivo: ${file.file_name} (path: ${storagePath}, url guardada: ${file.url || 'null'})`);
				}
			}
		}
	} catch (err) {
		console.warn('Error obteniendo archivos desde consultation_files:', err);
	}

	// 2. Obtener archivos desde MedicalRecord.attachments (compatibilidad con sistema anterior)
	if (consultation.medical_record_id) {
		try {
			const { data: medicalRecord } = await supabase
				.from('MedicalRecord')
				.select('attachments')
				.eq('id', consultation.medical_record_id)
				.single();
			
			if (medicalRecord && medicalRecord.attachments) {
				const attachments = Array.isArray(medicalRecord.attachments) 
					? medicalRecord.attachments 
					: [];
				
				// Agregar solo los que no estén ya en consultationAttachments
				attachments.forEach((url: string) => {
					if (url && !consultationAttachments.some((att) => att.url === url)) {
						consultationAttachments.push({
							url,
							name: url.split('/').pop() || 'Archivo adjunto',
						});
					}
				});
			}
		} catch (err) {
			console.warn('Error obteniendo archivos desde MedicalRecord:', err);
		}
	}

	// 3. Obtener archivos desde vitals.images (compatibilidad con sistema anterior)
	if (consultation.vitals && typeof consultation.vitals === 'object') {
		try {
			const vitals = consultation.vitals as any;
			if (vitals.images && Array.isArray(vitals.images)) {
				vitals.images.forEach((img: any) => {
					const imgUrl = img.url || img.id;
					if (imgUrl && !consultationAttachments.some((att) => att.url === imgUrl)) {
						consultationAttachments.push({
							url: imgUrl,
							name: img.name || (typeof imgUrl === 'string' ? imgUrl.split('/').pop() : 'Archivo adjunto') || 'Archivo adjunto',
							type: img.type || undefined,
							size: img.size || undefined,
						});
					}
				});
			}
		} catch (err) {
			console.warn('Error obteniendo archivos desde vitals.images:', err);
		}
	}

	// Obtener archivos de prescripciones
	const prescriptionIds = (prescriptions || []).map((p: any) => p.id);
	let prescriptionFiles: Array<{ prescription_id: string; url: string; file_name: string; type?: string; size?: number }> = [];
	if (prescriptionIds.length > 0) {
		try {
			// Buscar en prescription_files si existe
			const { data: files, error: presFilesError } = await supabase
				.from('prescription_files')
				.select('prescription_id, url, file_name, path, content_type, size')
				.in('prescription_id', prescriptionIds)
				.order('created_at', { ascending: false });

			if (!presFilesError && files && files.length > 0) {
				// Procesar cada archivo y generar URL pública si no existe
				for (const file of files) {
					let fileUrl = file.url;
					
					// Si no hay URL pero sí hay path, generar URL pública desde Supabase Storage
					if (!fileUrl && file.path) {
						try {
							const { data: urlData } = supabase.storage
								.from('prescriptions')
								.getPublicUrl(file.path);
							fileUrl = urlData?.publicUrl || null;
						} catch (storageErr) {
							console.warn('Error generando URL pública desde path para archivo de prescripción:', storageErr);
						}
					}

					if (fileUrl) {
						prescriptionFiles.push({
							prescription_id: file.prescription_id,
							url: fileUrl,
							file_name: file.file_name || file.path?.split('/').pop() || 'Archivo adjunto',
							type: file.content_type || undefined,
							size: file.size || undefined,
						});
					}
				}
			}
		} catch (err) {
			console.warn('Error obteniendo archivos de prescripciones:', err);
		}
	}

	// Normalizar datos que pueden venir como arrays desde Supabase
	const normalizedDoctor = Array.isArray(consultation.doctor) 
		? (consultation.doctor[0] || null)
		: consultation.doctor;
	const normalizedAppointment = Array.isArray(consultation.appointment)
		? (consultation.appointment[0] || null)
		: consultation.appointment;

	return (
		<ConsultationShareView
			consultation={{
				...consultation,
				doctor: normalizedDoctor,
				appointment: normalizedAppointment,
				attachments: consultationAttachments.map((att) => att.url), // Para compatibilidad con el tipo esperado
				attachmentsDetailed: consultationAttachments, // Información detallada de archivos
			}}
			patient={{
				...patient,
				...additionalMedicalInfo,
			}}
			prescriptions={prescriptions || []}
			orders={orders || []}
			prescriptionFiles={prescriptionFiles}
		/>
	);
}

