// app/api/consultations/[id]/generate-report-content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// Función para generar el contenido del informe desde la plantilla de texto
async function generateReportContentFromTemplate(consultation: any, templateText: string, supabase: any): Promise<string> {
	let content = templateText;

	// Función auxiliar para calcular edad desde fecha de nacimiento
	function calculateAge(dob: string | Date | null | undefined): string {
		if (!dob) {
			console.log('[Generate Report Content] No hay fecha de nacimiento (dob es null/undefined)');
			return '';
		}

		try {
			// Convertir a Date si es string
			const birthDate = dob instanceof Date ? dob : new Date(dob);

			// Verificar que la fecha sea válida
			if (isNaN(birthDate.getTime())) {
				console.warn('[Generate Report Content] Fecha de nacimiento inválida:', dob);
				return '';
			}

			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();

			// Ajustar si aún no ha cumplido años este año
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				age = age - 1;
			}

			// Asegurar que la edad no sea negativa
			if (age < 0) {
				console.warn('[Generate Report Content] Edad calculada negativa, fecha de nacimiento:', dob);
				return '';
			}

			console.log('[Generate Report Content] Edad calculada:', { dob, age });
			return String(age);
		} catch (error) {
			console.error('[Generate Report Content] Error calculando edad:', error, 'dob:', dob);
			return '';
		}
	}

	// Obtener datos del paciente
	let patientName = 'Paciente no registrado';
	let patientAge = '';
	let patientGender = '';

	// Obtener datos del paciente según si está registrado o no
	let patientIdentifier = 'N/A';
	let patientPhone = 'N/A';

	if (consultation.patient_id) {
		// Paciente registrado - obtener desde tabla Patient
		const { data: patientData, error: patientError } = await supabase.from('patient').select('firstName, lastName, dob, gender, identifier, phone').eq('id', consultation.patient_id).single();

		if (!patientError && patientData) {
			patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
			patientAge = calculateAge(patientData.dob);
			patientGender = patientData.gender || '';
			patientIdentifier = patientData.identifier || 'N/A';
			patientPhone = patientData.phone || 'N/A';
			console.log('[Generate Report Content] Paciente registrado:', {
				name: patientName,
				dob: patientData.dob,
				calculatedAge: patientAge,
				gender: patientGender,
				identifier: patientIdentifier,
				phone: patientPhone,
			});
		} else {
			console.warn('[Generate Report Content] No se pudo obtener paciente registrado:', patientError);
		}
	} else if (consultation.unregistered_patient_id) {
		// Paciente no registrado - obtener desde tabla unregisteredpatients
		// Nota: la tabla usa birth_date (no dob) y sex (no gender)
		const { data: unregisteredPatient, error: unregisteredError } = await supabase.from('unregisteredpatients').select('first_name, last_name, birth_date, sex, identification, phone').eq('id', consultation.unregistered_patient_id).single();

		if (!unregisteredError && unregisteredPatient) {
			patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
			patientAge = calculateAge(unregisteredPatient.birth_date);
			patientGender = unregisteredPatient.sex || '';
			patientIdentifier = unregisteredPatient.identification || 'N/A';
			patientPhone = unregisteredPatient.phone || 'N/A';
			console.log('[Generate Report Content] Paciente no registrado:', {
				name: patientName,
				birth_date: unregisteredPatient.birth_date,
				calculatedAge: patientAge,
				sex: patientGender,
				identification: patientIdentifier,
				phone: patientPhone,
			});
		} else {
			console.warn('[Generate Report Content] No se pudo obtener paciente no registrado:', unregisteredError);
		}
	} else {
		console.warn('[Generate Report Content] No se encontró patient_id ni unregistered_patient_id en la consulta');
	}

	// Obtener datos de vitals de ginecología
	const vitals = consultation.vitals || {};
	const gyn = vitals.gynecology || {};
	const colposcopy = gyn.colposcopy || {};

	// Mapeo de marcadores a valores (todos en español para mejor entendimiento)
	const replacements: Record<string, string> = {
		// Datos básicos del paciente
		paciente: patientName,
		edad: patientAge || 'N/A',
		genero: patientGender || 'N/A',
		cedula: patientIdentifier || 'N/A',
		identificacion: patientIdentifier || 'N/A',
		telefono: patientPhone || 'N/A',
		phone: patientPhone || 'N/A',

		// Antecedentes médicos
		alergicos: gyn.allergies || 'NIEGA',
		quirurgicos: gyn.surgical_history || 'NIEGA',

		// Antecedentes familiares
		antecedentes_madre: gyn.family_history_mother || 'VIVA SANA',
		antecedentes_padre: gyn.family_history_father || 'VIVO SANO',
		antecedentes_cancer_mama: gyn.family_history_breast_cancer || 'NIEGA',

		// Antecedentes ginecológicos
		motivo_consulta: gyn.evaluation_reason || consultation.chief_complaint || 'No especificado',
		motivo_evaluacion: gyn.evaluation_reason || consultation.chief_complaint || 'No especificado',
		historia_enfermedad_actual: gyn.current_illness_history || '',
		its: gyn.its || 'NIEGA',
		tipo_menstruacion: gyn.menstruation_type || 'REGULARES',
		patron_menstruacion: gyn.menstruation_pattern || '',
		dismenorrea: gyn.dysmenorrhea || 'NO',
		primera_relacion_sexual: gyn.first_sexual_relation || '',
		parejas_sexuales: gyn.sexual_partners || '',
		ultima_regla: gyn.last_menstrual_period || '',
		metodo_anticonceptivo: gyn.contraceptive || '',
		ho: gyn.ho || 'NIEGA',

		// Examen físico
		condiciones_generales: gyn.general_conditions || 'ESTABLES',
		tamano_mamas: gyn.breast_size || 'MEDIANO TAMAÑO',
		simetria_mamas: gyn.breast_symmetry || 'ASIMÉTRICAS',
		cap_mamas: gyn.breast_cap || 'SIN ALTERACIONES',
		secrecion_mamas: gyn.breast_secretion || 'NO SE EVIDENCIA SALIDA DE SECRECIÓN',
		fosas_axilares: gyn.axillary_fossae || 'LIBRES',
		abdomen: gyn.abdomen || 'BLANDO, DEPRIMIBLE NO DOLOROSO A LA PALPACIÓN',
		genitales_externos: gyn.external_genitals || 'NORMOCONFIGURADOS',
		flujo_vaginal: gyn.vaginal_discharge || 'sin secreciones',
		especuloscopia: gyn.speculum_cervix || 'CUELLO MACROSCÓPICAMENTE SANO',
		tacto_cervix: gyn.tact_cervix || 'CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN',
		fondo_sacos: gyn.fundus_sacs || 'LIBRES',
		anexos: gyn.adnexa || 'NO PALPABLES',

		// Colposcopia - Tests básicos
		test_hinselmann: gyn.hinselmann_test || 'NEGATIVO',
		test_schiller: gyn.schiller_test || 'NEGATIVO',

		// Colposcopia - Información General
		colposcopia_acetico_5: colposcopy.acetic_5 || '',
		colposcopia_ectocervix: colposcopy.ectocervix || '',
		colposcopia_tipo: colposcopy.type || '',
		colposcopia_extension: colposcopy.extension || '',
		colposcopia_descripcion: colposcopy.description || '',
		colposcopia_localizacion: colposcopy.location || '',

		// Colposcopia - Epitelio Acetoblanco
		colposcopia_acetowhite: colposcopy.acetowhite || '',
		colposcopia_acetowhite_detalles: colposcopy.acetowhite_details || '',

		// Colposcopia - Patrones de Vascularización
		colposcopia_mosaico: colposcopy.mosaic || '',
		colposcopia_punteado: colposcopy.punctation || '',
		colposcopia_vasos_atipicos: colposcopy.atypical_vessels || '',

		// Colposcopia - Características de la Lesión
		colposcopia_carcinoma_invasivo: colposcopy.invasive_carcinoma || '',
		colposcopia_bordes: colposcopy.borders || '',
		colposcopia_situacion: colposcopy.situation || '',
		colposcopia_elevacion: colposcopy.elevation || '',

		// Colposcopia - Pruebas Complementarias
		colposcopia_biopsia: colposcopy.biopsy || '',
		colposcopia_biopsia_localizacion: colposcopy.biopsy_location || '',
		colposcopia_lugol: colposcopy.lugol || '',

		// Ecografía transvaginal
		dimensiones_utero: gyn.uterus_dimensions || '',
		interfase_endometrial: gyn.endometrial_interface || '',
		tipo_interfase_endometrial: gyn.endometrial_interface_type || '',
		dimensiones_ovario_izquierdo: gyn.left_ovary_dimensions || '',
		dimensiones_ovario_derecho: gyn.right_ovary_dimensions || '',
		liquido_fondo_saco: gyn.fundus_fluid || 'NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO',

		// Examen cervical
		examen_cervical: gyn.cervical_exam || '',

		// Datos generales de la consulta
		diagnostico: consultation.diagnosis || 'No especificado',
		motivo: consultation.chief_complaint || 'No especificado',
		notas: consultation.notes || '',
		
		// Fecha de consulta
		fecha_consulta: consultation.started_at 
			? new Date(consultation.started_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
			: consultation.created_at 
				? new Date(consultation.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
				: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
	};

	// Reemplazar todos los marcadores {{variable}} en la plantilla
	content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = replacements[key.toLowerCase()] || replacements[key] || '';
		return value || match; // Si no hay valor, dejar el marcador original
	});

	return content;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener datos de la consulta (solo IDs, no los datos del paciente aún)
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(
				`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				chief_complaint,
				diagnosis,
				notes,
				vitals,
				started_at,
				created_at
			`
			)
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		console.log('[Generate Report Content API] Consulta obtenida:', {
			id: consultation.id,
			patient_id: consultation.patient_id,
			unregistered_patient_id: consultation.unregistered_patient_id,
		});

		// Obtener plantilla de texto del médico
		const { data: medicProfile, error: profileError } = await supabase.from('medic_profile').select('report_template_text').eq('doctor_id', doctorId).maybeSingle();

		if (profileError) {
			console.error('[Generate Report Content API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		if (!medicProfile?.report_template_text) {
			return NextResponse.json(
				{
					error: 'No se encontró plantilla de texto. Por favor, configura una plantilla de texto primero.',
				},
				{ status: 400 }
			);
		}

		// Generar contenido automáticamente
		const generatedContent = await generateReportContentFromTemplate(consultation, medicProfile.report_template_text, supabase);

		return NextResponse.json({
			content: generatedContent,
		});
	} catch (err) {
		console.error('[Generate Report Content API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al generar contenido',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}
