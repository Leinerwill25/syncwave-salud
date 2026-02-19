// app/api/consultations/patient/[patientId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: NextRequest, context: { params: Promise<{ patientId: string }> }) {
	try {
		// Autenticación
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
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

		// 1. Identificar al paciente (Registrado vs No Registrado)
		const { data: registeredPatient } = await supabase
			.from('patient')
			.select('id, unregistered_patient_id, identifier, organizationId')
			.eq('id', patientId)
			.maybeSingle();

		let finalPatientId = null;
		let finalUnregisteredId = null;
		let targetIdentifier = null;

		if (registeredPatient) {
			finalPatientId = registeredPatient.id;
			finalUnregisteredId = registeredPatient.unregistered_patient_id;
			targetIdentifier = registeredPatient.identifier;
		} else {
			// Podría ser un ID de paciente no registrado
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('id, identification')
				.eq('id', patientId)
				.maybeSingle();
			
			if (unregisteredPatient) {
				finalUnregisteredId = unregisteredPatient.id;
				targetIdentifier = unregisteredPatient.identification;
			}
		}

		if (!finalPatientId && !finalUnregisteredId) {
			return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
		}

		// Fallback: Si es un paciente registrado pero no tiene unregistered_patient_id vinculado,
		// intentar encontrarlo por cédula (identifier)
		if (finalPatientId && !finalUnregisteredId && targetIdentifier) {
			const { data: unregByIndentifier } = await supabase
				.from('unregisteredpatients')
				.select('id')
				.eq('identification', targetIdentifier)
				.maybeSingle();
			
			if (unregByIndentifier) {
				finalUnregisteredId = unregByIndentifier.id;
				console.log(`[API Historial] Fallback por cédula: Paciente ${finalPatientId} vinculado a Unregistered ${finalUnregisteredId}`);
			}
		}

		// 2. Determinar Nivel de Acceso
		let hasFullAccess = false;

		// Si es ADMIN, tiene acceso total a su organización
		if (user.role === 'ADMIN') {
			hasFullAccess = true;
		} else if (user.role === 'MEDICO') {
			// Si es médico, verificar si tiene un MedicalAccessGrant ACTIVO para este paciente
			// BUSCAMOS POR finalPatientId (el ID registrado)
			if (finalPatientId) {
				const { data: grant } = await supabase
					.from('MedicalAccessGrant')
					.select('id, expires_at')
					.eq('patient_id', finalPatientId)
					.eq('doctor_id', user.userId)
					.eq('is_active', true)
					.maybeSingle();
				
				if (grant) {
					const expiresAt = grant.expires_at ? new Date(grant.expires_at).getTime() : null;
					hasFullAccess = !expiresAt || expiresAt > Date.now();
					if (hasFullAccess) console.log(`[API Historial] Acceso Completo detectado vía Grant para médico ${user.userId}`);
				}
			}
		}

		// 3. Ejecutar Consultas
		let consultations: any[] = [];
		let consultError: any = null;

		// Construir filtros de paciente
		const patientFilters = [];
		if (finalPatientId) patientFilters.push(`patient_id.eq.${finalPatientId}`);
		if (finalUnregisteredId) patientFilters.push(`unregistered_patient_id.eq.${finalUnregisteredId}`);
		const combinedPatientFilter = patientFilters.join(',');

		let query = supabase
			.from('consultation')
			.select(
				`
				id, appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id,
				chief_complaint, diagnosis, icd11_code, icd11_title, notes, vitals,
				started_at, ended_at, created_at, updated_at, medical_record_id, report_url,
				doctor:doctor_id(id, name, email),
				appointment:appointment_id(id, status, location, scheduled_at)
				`
			)
			.or(combinedPatientFilter);

		// Aplicar filtrado por organización (siempre)
		// Si el usuario tiene organizationId, restringir a esa org
		if (user.organizationId) {
			query = query.eq('organization_id', user.organizationId);
		}

		// Aplicar filtrado por doctor si NO TIENE ACCESO COMPLETO
		if (!hasFullAccess) {
			query = query.eq('doctor_id', user.userId);
			console.log(`[API Historial] Aplicando filtro de Médico Estricto para ${user.userId}`);
		} else {
			console.log(`[API Historial] Saltando filtro de Médico (Acceso Completo activado)`);
		}

		const { data, error } = await query
			.order('started_at', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false });

		consultations = data || [];
		consultError = error;

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

		// Obtener recetas (prescriptions) relacionadas
		let prescriptionsMap: Record<string, any[]> = {};

		if (consultationIds.length > 0) {
			const { data: prescriptions, error: prescError } = await supabase
				.from('prescription')
				.select(`
					id, 
					consultation_id, 
					prescription_url, 
					recipe_text, 
					created_at,
					prescription_item(id, name, dosage, instructions),
					prescription_files(id, url, file_name)
				`)
				.in('consultation_id', consultationIds);

			if (!prescError && prescriptions) {
				prescriptions.forEach((presc: any) => {
					if (presc.consultation_id) {
						if (!prescriptionsMap[presc.consultation_id]) {
							prescriptionsMap[presc.consultation_id] = [];
						}
						
						// Map prescription_item to items for frontend compatibility
						presc.items = presc.prescription_item || [];
						
						// Map prescription_files to files
						presc.files = presc.prescription_files || [];
						
						// Si prescription_url está vacío, intentar usar el primero de files
						if (!presc.prescription_url && presc.files && presc.files.length > 0) {
							presc.prescription_url = presc.files[0].url;
						}
						
						prescriptionsMap[presc.consultation_id].push(presc);
					}
				});
			}
		}

		// Enriquecer consultas con MedicalRecord, Facturacion y Prescriptions
		const enrichedConsultations = consultations?.map((consultation) => {
			const medicalRecord = consultation.medical_record_id ? medicalRecordsMap[consultation.medical_record_id] || null : null;

			const facturacion = consultation.appointment_id ? facturacionMap[consultation.appointment_id] || null : null;
			
			const prescriptions = prescriptionsMap[consultation.id] || [];

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
				prescriptions: prescriptions,
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
