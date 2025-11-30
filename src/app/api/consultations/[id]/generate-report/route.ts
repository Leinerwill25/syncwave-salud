// app/api/consultations/[id]/generate-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async function getCurrentDoctorId(supabase: ReturnType<typeof createSupabaseServerClient>['supabase']): Promise<string | null> {
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	
	if (authError || !user) {
		return null;
	}

	const { data: appUser, error: userError } = await supabase
		.from('User')
		.select('id, role')
		.eq('authId', user.id)
		.maybeSingle();

	if (userError || !appUser || appUser.role !== 'MEDICO') {
		return null;
	}

	return appUser.id;
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const doctorId = await getCurrentDoctorId(supabase);
		if (!doctorId) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		// Obtener datos de la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				chief_complaint,
				diagnosis,
				notes,
				started_at,
				created_at,
				patient:patient_id(firstName, lastName, identifier, dob),
				doctor:doctor_id(name, email)
			`)
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Obtener contenido del informe del body
		const body = await request.json();
		const reportContent = body.content || '';

		if (!reportContent.trim()) {
			return NextResponse.json({ error: 'El contenido del informe no puede estar vacío' }, { status: 400 });
		}

		// Obtener plantilla del médico
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_template_url, report_template_name')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !medicProfile?.report_template_url) {
			return NextResponse.json({ error: 'No se encontró plantilla de informe. Por favor, carga una plantilla primero.' }, { status: 400 });
		}

		// Descargar plantilla desde Supabase Storage
		const templateUrl = medicProfile.report_template_url;
		const bucket = 'report-templates';
		
		// Extraer path del archivo desde la URL
		let filePath = templateUrl;
		if (templateUrl.includes(bucket + '/')) {
			filePath = templateUrl.split(bucket + '/')[1];
		} else if (templateUrl.startsWith('/')) {
			filePath = templateUrl.substring(1);
		}

		// Descargar archivo
		const { data: templateData, error: downloadError } = await supabase.storage
			.from(bucket)
			.download(filePath);

		if (downloadError || !templateData) {
			console.error('[Generate Report API] Error descargando plantilla:', downloadError);
			return NextResponse.json({ error: 'Error al descargar plantilla' }, { status: 500 });
		}

		// Convertir Blob a Buffer
		const arrayBuffer = await templateData.arrayBuffer();
		const templateBuffer = Buffer.from(arrayBuffer);

		// Procesar plantilla con docxtemplater
		const zip = new PizZip(templateBuffer);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
		});

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		if (consultation.patient_id && consultation.patient) {
			const patient = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
			patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Paciente';
			patientId = patient.identifier || 'N/A';
		} else if (consultation.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('first_name, last_name, identification')
				.eq('id', consultation.unregistered_patient_id)
				.single();
			
			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
			}
		}

		// Obtener datos del médico
		const doctor = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;
		const doctorName = doctor?.name || doctor?.email || 'Médico';

		// Preparar datos para la plantilla
		const consultationDate = consultation.started_at 
			? new Date(consultation.started_at).toLocaleDateString('es-ES', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			})
			: consultation.created_at 
				? new Date(consultation.created_at).toLocaleDateString('es-ES', { 
					year: 'numeric', 
					month: 'long', 
					day: 'numeric' 
				})
				: new Date().toLocaleDateString('es-ES');

		const templateDataObj = {
			contenido: reportContent,
			fecha: consultationDate,
			paciente: patientName,
			medico: doctorName,
			diagnostico: consultation.diagnosis || 'No especificado',
			motivo: consultation.chief_complaint || 'No especificado',
			notas: consultation.notes || '',
		};

		// Renderizar plantilla
		doc.setData(templateDataObj);
		
		try {
			doc.render();
		} catch (error: any) {
			console.error('[Generate Report API] Error renderizando plantilla:', error);
			return NextResponse.json({ 
				error: 'Error al procesar plantilla. Verifica que los marcadores en la plantilla sean correctos.',
				detail: error.message 
			}, { status: 500 });
		}

		// Generar documento final
		const generatedBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// Subir informe generado a Supabase Storage
		const reportsBucket = 'consultation-reports';
		const reportFileName = `${id}/${Date.now()}-informe-${id}.docx`;

		// Verificar si el bucket existe
		try {
			const { data: buckets } = await supabase.storage.listBuckets();
			const bucketExists = buckets?.some((b) => b.name === reportsBucket);
			if (!bucketExists) {
				await supabase.storage.createBucket(reportsBucket, {
					public: false,
					fileSizeLimit: 10485760, // 10MB
				});
			}
		} catch (bucketErr) {
			console.error('Error verificando/creando bucket de reportes:', bucketErr);
		}

		// Subir informe
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from(reportsBucket)
			.upload(reportFileName, generatedBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				upsert: false,
			});

		if (uploadError) {
			console.error('[Generate Report API] Error subiendo informe:', uploadError);
			return NextResponse.json({ error: 'Error al guardar informe' }, { status: 500 });
		}

		// Obtener URL del informe
		const { data: urlData } = await supabase.storage
			.from(reportsBucket)
			.createSignedUrl(reportFileName, 31536000); // 1 año de validez

		const reportUrl = urlData?.signedUrl || `/${reportsBucket}/${reportFileName}`;

		// Actualizar consulta con URL del informe
		const { error: updateError } = await supabase
			.from('consultation')
			.update({ report_url: reportUrl })
			.eq('id', id);

		if (updateError) {
			console.error('[Generate Report API] Error actualizando consulta:', updateError);
			// No fallar, el informe ya está generado
		}

		return NextResponse.json({
			success: true,
			report_url: reportUrl,
			message: 'Informe generado exitosamente',
		});
	} catch (err) {
		console.error('[Generate Report API] Error:', err);
		return NextResponse.json({ 
			error: 'Error interno al generar informe',
			detail: err instanceof Error ? err.message : String(err)
		}, { status: 500 });
	}
}

