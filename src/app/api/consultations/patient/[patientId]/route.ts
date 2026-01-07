// app/api/consultations/patient/[patientId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: NextRequest, context: { params: Promise<{ patientId: string }> }) {
	try {
		// Autenticación
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { patientId } = await context.params;
		if (!patientId) {
			return NextResponse.json({ error: 'ID de paciente no proporcionado' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener el unregistered_patient_id del paciente (si existe)
		const { data: patientData, error: patientDataError } = await supabase.from('patient').select('id, unregistered_patient_id').eq('id', patientId).maybeSingle();

		if (patientDataError) {
			console.error('Error obteniendo datos del paciente:', patientDataError);
			// Continuar sin unregistered_patient_id si hay error
		}

		// Construir query que busque tanto por patient_id como por unregistered_patient_id
		// Si el paciente tiene unregistered_patient_id vinculado, buscar consultas con ambos IDs
		let consultations: any[] = [];
		let consultError: any = null;

		if (patientData?.unregistered_patient_id) {
			// Buscar consultas con patient_id O unregistered_patient_id
			const { data: consultations1, error: error1 } = await supabase
				.from('consultation')
				.select(
					`
					id,
					appointment_id,
					patient_id,
					unregistered_patient_id,
					doctor_id,
					organization_id,
					chief_complaint,
					diagnosis,
					icd11_code,
					icd11_title,
					notes,
					vitals,
					started_at,
					ended_at,
					created_at,
					updated_at,
					medical_record_id,
					report_url,
					doctor:doctor_id(id, name, email),
					appointment:appointment_id(
						id,
						status,
						location,
						scheduled_at
					)
				`
				)
				.eq('patient_id', patientId)
				.eq('doctor_id', user.userId)
				.order('started_at', { ascending: false, nullsFirst: false })
				.order('created_at', { ascending: false });

			const { data: consultations2, error: error2 } = await supabase
				.from('consultation')
				.select(
					`
					id,
					appointment_id,
					patient_id,
					unregistered_patient_id,
					doctor_id,
					organization_id,
					chief_complaint,
					diagnosis,
					icd11_code,
					icd11_title,
					notes,
					vitals,
					started_at,
					ended_at,
					created_at,
					updated_at,
					medical_record_id,
					report_url,
					doctor:doctor_id(id, name, email),
					appointment:appointment_id(
						id,
						status,
						location,
						scheduled_at
					)
				`
				)
				.eq('unregistered_patient_id', patientData.unregistered_patient_id)
				.eq('doctor_id', user.userId)
				.order('started_at', { ascending: false, nullsFirst: false })
				.order('created_at', { ascending: false });

			// Combinar resultados y eliminar duplicados
			const allConsultations = [...(consultations1 || []), ...(consultations2 || [])];
			const uniqueConsultations = Array.from(new Map(allConsultations.map((c) => [c.id, c])).values());
			consultations = uniqueConsultations.sort((a, b) => {
				const dateA = a.started_at ? new Date(a.started_at).getTime() : new Date(a.created_at).getTime();
				const dateB = b.started_at ? new Date(b.started_at).getTime() : new Date(b.created_at).getTime();
				return dateB - dateA;
			});

			consultError = error1 || error2;
		} else {
			// Solo buscar por patient_id
			const result = await supabase
				.from('consultation')
				.select(
					`
					id,
					appointment_id,
					patient_id,
					unregistered_patient_id,
					doctor_id,
					organization_id,
					chief_complaint,
					diagnosis,
					icd11_code,
					icd11_title,
					notes,
					vitals,
					started_at,
					ended_at,
					created_at,
					updated_at,
					medical_record_id,
					report_url,
					doctor:doctor_id(id, name, email),
					appointment:appointment_id(
						id,
						status,
						location,
						scheduled_at
					)
				`
				)
				.eq('patient_id', patientId)
				.eq('doctor_id', user.userId)
				.order('started_at', { ascending: false, nullsFirst: false })
				.order('created_at', { ascending: false });

			consultations = result.data || [];
			consultError = result.error;
		}

		if (consultError) {
			console.error('Error fetching consultations:', consultError);
			return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 });
		}

		// Obtener MedicalRecords relacionados si existen
		const consultationIds = consultations?.map((c) => c.id) || [];
		let medicalRecordsMap: Record<string, any> = {};

		if (consultationIds.length > 0) {
			const { data: medicalRecords, error: mrError } = await supabase
				.from('medicalrecord')
				.select('id, patientId, content, attachments, createdAt, consultation:consultation!consultation_medical_record_id_fkey(id)')
				.in('id', consultations?.filter((c) => c.medical_record_id).map((c) => c.medical_record_id) || []);

			if (!mrError && medicalRecords) {
				// Crear mapa de medical_record_id -> MedicalRecord
				medicalRecords.forEach((mr: any) => {
					if (mr.consultation && Array.isArray(mr.consultation)) {
						mr.consultation.forEach((c: any) => {
							if (c.id) medicalRecordsMap[c.id] = mr;
						});
					} else if (mr.consultation && mr.consultation.id) {
						medicalRecordsMap[mr.consultation.id] = mr;
					}
				});
			}
		}

		// Obtener facturación para cada appointment_id
		const appointmentIds = consultations?.filter((c) => c.appointment_id).map((c) => c.appointment_id) || [];
		let facturacionMap: Record<string, any[]> = {};

		if (appointmentIds.length > 0) {
			const { data: facturacion, error: factError } = await supabase.from('facturacion').select('id, appointment_id, numero_factura, subtotal, total, moneda, metodo_pago, estado_pago, created_at').in('appointment_id', appointmentIds);

			if (!factError && facturacion) {
				facturacion.forEach((fact: any) => {
					if (fact.appointment_id) {
						if (!facturacionMap[fact.appointment_id]) {
							facturacionMap[fact.appointment_id] = [];
						}
						facturacionMap[fact.appointment_id].push(fact);
					}
				});
			}
		}

		// Enriquecer consultas con MedicalRecord y Facturacion
		const enrichedConsultations = consultations?.map((consultation) => {
			const medicalRecord = consultation.medical_record_id ? medicalRecordsMap[consultation.medical_record_id] || null : null;

			const facturacion = consultation.appointment_id ? facturacionMap[consultation.appointment_id] || null : null;

			return {
				...consultation,
				medicalRecord: medicalRecord
					? {
							id: medicalRecord.id,
							content: medicalRecord.content,
							attachments: medicalRecord.attachments,
							createdAt: medicalRecord.createdAt,
					  }
					: null,
				facturacion: facturacion,
			};
		});

		return NextResponse.json({
			consultations: enrichedConsultations || [],
			total: enrichedConsultations?.length || 0,
		});
	} catch (error: any) {
		console.error('Error in consultations/patient/[patientId]:', error);
		return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
	}
}
