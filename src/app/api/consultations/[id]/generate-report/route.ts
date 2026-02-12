// app/api/consultations/[id]/generate-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { apiRequireRole } from '@/lib/auth-guards';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

// Función para generar el contenido del informe desde la plantilla de texto
async function generateReportContentFromTemplate(
	consultation: any,
	templateText: string,
	supabase: any,
	reportType: string = 'gynecology',
	isSimpleConsulta: boolean = false,
	hasEcografiaTransvaginal: boolean = false,
	isOnlyVideoColposcopia: boolean = false
): Promise<string> {
	let content = templateText;

	// Función auxiliar para calcular edad desde fecha de nacimiento
	function calculateAge(dob: string | Date | null | undefined): string {
		if (!dob) {
			console.log('[Generate Report] No hay fecha de nacimiento (dob es null/undefined)');
			return '';
		}

		try {
			// Convertir a Date si es string
			const birthDate = dob instanceof Date ? dob : new Date(dob);

			// Verificar que la fecha sea válida
			if (isNaN(birthDate.getTime())) {
				console.warn('[Generate Report] Fecha de nacimiento inválida:', dob);
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
				console.warn('[Generate Report] Edad calculada negativa, fecha de nacimiento:', dob);
				return '';
			}

			console.log('[Generate Report] Edad calculada:', { dob, age });
			return String(age);
		} catch (error) {
			console.error('[Generate Report] Error calculando edad:', error, 'dob:', dob);
			return '';
		}
	}

	// Obtener datos del paciente
	let patientName = 'Paciente no registrado';
	let patientAge = '';
	let patientGender = '';
	let patientId = 'N/A';
	let patientPhone = 'N/A';

	// Obtener datos del paciente según si está registrado o no
	if (consultation.patient_id) {
		// Paciente registrado - obtener desde tabla Patient
		const { data: patientData, error: patientError } = await supabase.from('patient').select('firstName, lastName, dob, gender, identifier, phone').eq('id', consultation.patient_id).single();

		if (!patientError && patientData) {
			patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
			patientAge = calculateAge(patientData.dob);
			patientGender = patientData.gender || '';
			patientId = patientData.identifier || 'N/A';
			patientPhone = patientData.phone || 'N/A';
			console.log('[Generate Report] Paciente registrado:', {
				name: patientName,
				dob: patientData.dob,
				calculatedAge: patientAge,
				gender: patientGender,
			});
		} else {
			console.warn('[Generate Report] No se pudo obtener paciente registrado:', patientError);
		}
	} else if (consultation.unregistered_patient_id) {
		// Paciente no registrado - obtener desde tabla unregisteredpatients
		// Nota: la tabla usa birth_date (no dob) y sex (no gender)
		const { data: unregisteredPatient, error: unregisteredError } = await supabase.from('unregisteredpatients').select('first_name, last_name, birth_date, sex, identification, phone').eq('id', consultation.unregistered_patient_id).single();

		if (!unregisteredError && unregisteredPatient) {
			patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
			patientAge = calculateAge(unregisteredPatient.birth_date);
			patientGender = unregisteredPatient.sex || '';
			patientId = unregisteredPatient.identification || 'N/A';
			patientPhone = unregisteredPatient.phone || 'N/A';
			console.log('[Generate Report] Paciente no registrado:', {
				name: patientName,
				birth_date: unregisteredPatient.birth_date,
				calculatedAge: patientAge,
				sex: patientGender,
			});
		} else {
			console.warn('[Generate Report] No se pudo obtener paciente no registrado:', unregisteredError);
		}
	} else {
		console.warn('[Generate Report] No se encontró patient_id ni unregistered_patient_id en la consulta');
	}

	// Obtener datos de vitals
	const vitals = consultation.vitals || {};
	const gyn = vitals.gynecology || {};
	const colposcopy = gyn.colposcopy || {};
	const obst = vitals.obstetrics || {};
	const firstTrim = obst.first_trimester || {};
	const secondTrim = obst.second_third_trimester || {};

	// Variables básicas comunes a todos los informes
	const baseReplacements: Record<string, string> = {
		// Datos básicos del paciente
		paciente: patientName,
		edad: patientAge || 'N/A',
		genero: patientGender || 'N/A',
		cedula: patientId || 'N/A',
		identificacion: patientId || 'N/A',
		telefono: patientPhone || 'N/A',
		phone: patientPhone || 'N/A',
		
		// Datos generales de la consulta
		diagnostico: consultation.diagnosis || 'No especificado',
		motivo: consultation.chief_complaint || 'No especificado',
		notes: consultation.notes || '',
		notas: consultation.notes || '',
	};

	// Construir replacements según el tipo de informe
	let replacements: Record<string, string>;

	if (reportType === 'first_trimester') {
		// Variables SOLO del Primer Trimestre (sin ginecología)
		replacements = {
			...baseReplacements,
			// Datos de la Paciente
			edad_gestacional: firstTrim.edad_gestacional || '',
			fur: firstTrim.fur || '',
			fpp: firstTrim.fpp || '',
			gestas: firstTrim.gestas || '',
			paras: firstTrim.paras || '',
			cesareas: firstTrim.cesareas || '',
			abortos: firstTrim.abortors || firstTrim.abortos || '',
			otros: firstTrim.otros || '',
			motivo_consulta: firstTrim.motivo_consulta || consultation.chief_complaint || 'No especificado',
			referencia: firstTrim.referencia || '',
			
			// Datos Obstétricos del 1er Trimestre
			posicion: firstTrim.posicion || '',
			superficie: firstTrim.superficie || 'Regular',
			miometrio: firstTrim.miometrio || 'HOMOGENEO',
			endometrio: firstTrim.endometrio || 'Ocupado Por Saco Gestacional.',
			ovario_derecho: firstTrim.ovario_derecho || 'Normal',
			ovario_izquierdo: firstTrim.ovario_izquierdo || 'Normal',
			anexos_ecopatron: firstTrim.anexos_ecopatron || 'Normal',
			fondo_de_saco: firstTrim.fondo_de_saco || 'Libre',
			cuerpo_luteo: firstTrim.cuerpo_luteo || '',
			
			// Saco Gestacional
			gestacion: firstTrim.gestacion || '',
			localizacion: firstTrim.localizacion || '',
			vesicula: firstTrim.vesicula || '',
			cavidad_exocelomica: firstTrim.cavidad_exocelomica || '',
			
			// Embrión
			embrion_visto: firstTrim.embrion_visto || '',
			ecoanatomia: firstTrim.ecoanatomia || '',
			lcr: firstTrim.lcr || '',
			acorde_a: firstTrim.acorde_a || '',
			actividad_cardiaca: firstTrim.actividad_cardiaca || '',
			movimientos_embrionarios: firstTrim.movimientos_embrionarios || '',
			
			// Conclusiones
			conclusiones: firstTrim.conclusiones || '',
		};
	} else if (reportType === 'second_third_trimester') {
		// Variables SOLO del Segundo y Tercer Trimestre (sin ginecología)
		replacements = {
			...baseReplacements,
			// Datos de la Paciente
			edad_gestacional: secondTrim.edad_gestacional || '',
			fur: secondTrim.fur || '',
			fpp: secondTrim.fpp || '',
			gestas: secondTrim.gestas || '',
			paras: secondTrim.paras || '',
			cesareas: secondTrim.cesareas || '',
			abortos: secondTrim.abortos || '',
			otros: secondTrim.otros || '',
			motivo_consulta: secondTrim.motivo_consulta || consultation.chief_complaint || 'No especificado',
			referencia: secondTrim.referencia || '',
			
			// Datos Obstétricos
			num_fetos: secondTrim.num_fetos || '01',
			actividad_cardiaca: secondTrim.actividad_cardiaca || '',
			situacion: secondTrim.situacion || '',
			presentacion: secondTrim.presentacion || '',
			dorso: secondTrim.dorso || '',
			
			// Datos Biométricos
			dbp: secondTrim.dbp || '',
			cc: secondTrim.cc || '',
			ca: secondTrim.ca || '',
			lf: secondTrim.lf || '',
			peso_estimado_fetal: secondTrim.peso_estimado_fetal || '',
			para: secondTrim.para || '',
			
			// Datos Placenta Foliculares
			placenta: secondTrim.placenta || '',
			ubi: secondTrim.ubi || '',
			insercion: secondTrim.insercion || '',
			grado: secondTrim.grado || 'I/III',
			cordon_umbilical: secondTrim.cordon_umbilical || '',
			liqu_amniotico: secondTrim.liqu_amniotico || '',
			p: secondTrim.p || '',
			ila: secondTrim.ila || '',
			
			// Datos Anatomofuncionales
			craneo: secondTrim.craneo || '',
			corazon: secondTrim.corazon || '',
			fcf: secondTrim.fcf || '',
			pulmones: secondTrim.pulmones || '',
			situs_visceral: secondTrim.situs_visceral || '',
			intestino: secondTrim.intestino || '',
			vejiga: secondTrim.vejiga || '',
			vejiga_extra: secondTrim.vejiga_extra || '',
			estomago: secondTrim.estomago || '',
			estomago_extra: secondTrim.estomago_extra || '',
			rinones: secondTrim.rinones || '',
			rinones_extra: secondTrim.rinones_extra || '',
			genitales: secondTrim.genitales || '',
			miembros_superiores: secondTrim.miembros_superiores || '',
			manos: secondTrim.manos || '',
			miembros_inferiores: secondTrim.miembros_inferiores || '',
			pies: secondTrim.pies || '',
			
			// Conclusiones
			conclusiones: secondTrim.conclusiones || '',
		};
	} else {
		// Variables de Ginecología - Filtrar según el tipo de servicio
		// Si es solo Vídeo colposcopía, solo incluir datos de colposcopia
		if (isOnlyVideoColposcopia) {
			// Solo datos de colposcopia
			replacements = {
				...baseReplacements,
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
				test_hinselmann: gyn.hinselmann_test || 'NEGATIVO',
			};
		} else if (isSimpleConsulta) {
			// Si es solo Consulta, incluir solo datos de consulta (sin colposcopia ni ecografía)
			replacements = {
				...baseReplacements,
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
				método_anticonceptivo: gyn.contraceptive || '', // Con tilde para compatibilidad
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

				// Examen cervical
				examen_cervical: gyn.cervical_exam || '',
			};
		} else if (hasEcografiaTransvaginal) {
			// Si es Consulta + Ecografía Transvaginal, incluir datos de consulta + ecografía (sin colposcopia)
			replacements = {
				...baseReplacements,
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
				método_anticonceptivo: gyn.contraceptive || '', // Con tilde para compatibilidad
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

				// Ecografía transvaginal
				dimensiones_utero: gyn.uterus_dimensions || '',
				interfase_endometrial: gyn.endometrial_interface || '',
				tipo_interfase_endometrial: gyn.endometrial_interface_type || '',
				dimensiones_ovario_izquierdo: gyn.left_ovary_dimensions || '',
				dimensiones_ovario_derecho: gyn.right_ovary_dimensions || '',
				liquido_fondo_saco: gyn.fundus_fluid || 'NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO',

				// Examen cervical
				examen_cervical: gyn.cervical_exam || '',
			};
		} else {
			// Comportamiento original: incluir todo (para casos que no sean los específicos)
			replacements = {
				...baseReplacements,
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
				método_anticonceptivo: gyn.contraceptive || '', // Con tilde para compatibilidad
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
			};
		}
	}

	// Reemplazar todos los marcadores {{variable}} en la plantilla
	content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = replacements[key.toLowerCase()] || replacements[key] || '';
		return value || match; // Si no hay valor, dejar el marcador original
	});

	return content;
}

async function getCurrentDoctorId(supabase: any, request?: Request): Promise<string | null> {
	// Intento primario: obtener usuario por cookie (session)
	let { data: authData, error: authError } = await supabase.auth.getUser();

	// Si falla, intentar con token Bearer del header
	if (authError || !authData?.user) {
		if (request) {
			const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
			const maybeToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

			if (maybeToken) {
				const { data: authData2, error: authError2 } = await supabase.auth.getUser(maybeToken);
				if (!authError2 && authData2?.user) {
					authData = authData2;
					authError = null;
				}
			}
		}

		// Si aún falla, intentar restaurar desde cookies
		if (authError || !authData?.user) {
			try {
				const cookieStore = await cookies();
				const accessToken = cookieStore.get('sb-access-token')?.value ?? null;

				if (accessToken) {
					const { data: authData3, error: authError3 } = await supabase.auth.getUser(accessToken);
					if (!authError3 && authData3?.user) {
						authData = authData3;
						authError = null;
					}
				}
			} catch (cookieErr) {
				console.warn('[Generate Report API] Error leyendo cookies:', cookieErr);
			}
		}
	}

	if (authError || !authData?.user) {
		return null;
	}

	const { data: appUser, error: userError } = await supabase.from('users').select('id, role').eq('authId', authData.user.id).maybeSingle();

	if (userError || !appUser || appUser.role !== 'MEDICO') {
		return null;
	}

	return appUser.id;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

		// Obtener datos de la consulta (incluyendo appointment_id para determinar el tipo de servicio)
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(
				`
				id,
				appointment_id,
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

		console.log('[Generate Report API] Consulta obtenida:', {
			id: consultation.id,
			patient_id: consultation.patient_id,
			unregistered_patient_id: consultation.unregistered_patient_id,
		});

		// Obtener contenido del informe y fuente del body (puede venir del frontend o generarse automáticamente)
		const body = await request.json();
		let reportContent = body.content || '';
		const fontFamilyFromRequest: string | undefined = body.font_family;
		const reportTypeFromRequest: string | undefined = body.report_type; // 'gynecology', 'first_trimester', 'second_third_trimester'

		// Determinar el tipo de servicio desde el appointment
		let isSimpleConsulta = false;
		let hasEcografiaTransvaginal = false;
		let isOnlyVideoColposcopia = false;

		if (consultation.appointment_id) {
			const { data: appointment } = await supabase
				.from('appointment')
				.select('id, reason, selected_service')
				.eq('id', consultation.appointment_id)
				.maybeSingle();

			if (appointment) {
				const appointmentReason = appointment.reason || null;
				const selectedService = (appointment as any).selected_service;

				// Verificar si hay múltiples servicios
				let services: string[] = [];
				if (Array.isArray(selectedService)) {
					services = selectedService.map((s: any) =>
						typeof s === 'string' ? s : (s?.name || String(s))
					).map((s: string) => s.toLowerCase());
				} else if (selectedService) {
					const serviceName = selectedService?.name || selectedService || '';
					services = [String(serviceName).toLowerCase()];
				}

				// También verificar en el reason
				if (appointmentReason) {
					const reasonLower = appointmentReason.toLowerCase();
					if (reasonLower.includes('ecografía') || reasonLower.includes('ecografia') || reasonLower.includes('transvaginal')) {
						services.push('ecografía transvaginal');
					}
					if (reasonLower.includes('consulta') && !reasonLower.includes('colposcop')) {
						services.push('consulta');
					}
					if (reasonLower.includes('vídeo colposcopía') || reasonLower.includes('video colposcopia') ||
						reasonLower.includes('vídeo colposcopia') || reasonLower.includes('video colposcopía')) {
						services.push('vídeo colposcopía');
					}
				}

				const hasConsulta = services.some(s => s.includes('consulta') && !s.includes('colposcop'));
				hasEcografiaTransvaginal = services.some(s =>
					s.includes('ecografía') || s.includes('ecografia') || s.includes('transvaginal')
				);
				const hasVideoColposcopia = services.some(s =>
					s.includes('vídeo colposcopía') || s.includes('video colposcopia') ||
					s.includes('vídeo colposcopia') || s.includes('video colposcopía')
				);

				isOnlyVideoColposcopia = hasVideoColposcopia && !hasConsulta && !hasEcografiaTransvaginal;
				isSimpleConsulta = hasConsulta && !hasEcografiaTransvaginal &&
					!services.some(s => s.includes('colposcop')) && !isOnlyVideoColposcopia;
			}
		}

		// Verificar si la consulta tiene datos de obstetricia
		const vitals = consultation.vitals || {};
		const obstParams = vitals.obstetrics || {};
		const reportType = reportTypeFromRequest || obstParams.report_type || 'gynecology';
		const isObstetrics = reportType === 'first_trimester' || reportType === 'second_third_trimester';
		
		// Extraer datos de ginecología y obstetricia para uso en templateDataObj
		const gyn = vitals.gynecology || {};
		const colposcopy = gyn.colposcopy || {};
		const obst = vitals.obstetrics || {};
		const firstTrim = obst.first_trimester || {};
		const secondTrim = obst.second_third_trimester || {};

		// Obtener plantillas del médico (incluyendo plantillas por especialidad)
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_template_url, report_template_name, report_template_text, report_font_family, report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		// Si es obstetricia, buscar plantilla específica de Word
		let templateUrl: string | null = null;
		let templateName: string | null = null;
		let templateText: string | null = null;
		let templateFontFamily: string = 'Arial';

		if (isObstetrics) {
			// Parsear report_templates_by_specialty
			let templatesBySpecialty: any = null;
			if (medicProfile?.report_templates_by_specialty) {
				if (typeof medicProfile.report_templates_by_specialty === 'string') {
					try {
						templatesBySpecialty = JSON.parse(medicProfile.report_templates_by_specialty);
					} catch {
						templatesBySpecialty = null;
					}
				} else {
					templatesBySpecialty = medicProfile.report_templates_by_specialty;
				}
			}

			// Buscar plantilla de Obstetricia
			const obstetriciaKey = Object.keys(templatesBySpecialty || {}).find(
				key => key.toLowerCase().includes('obstetric') || key.toLowerCase().includes('obstétric')
			);

			if (obstetriciaKey && templatesBySpecialty[obstetriciaKey]) {
				const obstTemplate = templatesBySpecialty[obstetriciaKey];
				
				// Si tiene estructura de variantes
				if (obstTemplate.variants) {
					if (reportType === 'first_trimester' && obstTemplate.variants.trimestre1) {
						templateUrl = obstTemplate.variants.trimestre1.template_url || null;
						templateName = obstTemplate.variants.trimestre1.template_name || null;
						templateText = obstTemplate.variants.trimestre1.template_text || null;
						templateFontFamily = obstTemplate.variants.trimestre1.font_family || 'Arial';
					} else if (reportType === 'second_third_trimester' && obstTemplate.variants.trimestre2_3) {
						templateUrl = obstTemplate.variants.trimestre2_3.template_url || null;
						templateName = obstTemplate.variants.trimestre2_3.template_name || null;
						templateText = obstTemplate.variants.trimestre2_3.template_text || null;
						templateFontFamily = obstTemplate.variants.trimestre2_3.font_family || 'Arial';
					}
				} else if (obstTemplate.trimestre1 && reportType === 'first_trimester') {
					templateUrl = obstTemplate.trimestre1.template_url || null;
					templateName = obstTemplate.trimestre1.template_name || null;
					templateText = obstTemplate.trimestre1.template_text || null;
					templateFontFamily = obstTemplate.trimestre1.font_family || 'Arial';
				} else if (obstTemplate.trimestre2_3 && reportType === 'second_third_trimester') {
					templateUrl = obstTemplate.trimestre2_3.template_url || null;
					templateName = obstTemplate.trimestre2_3.template_name || null;
					templateText = obstTemplate.trimestre2_3.template_text || null;
					templateFontFamily = obstTemplate.trimestre2_3.font_family || 'Arial';
				}
			}

			// Si no se encontró plantilla específica, usar plantilla general
			if (!templateUrl) {
				templateUrl = medicProfile?.report_template_url || null;
				templateName = medicProfile?.report_template_name || null;
				templateText = medicProfile?.report_template_text || null;
				templateFontFamily = medicProfile?.report_font_family || 'Arial';
			}
		} else {
			// No es obstetricia (es ginecología u otra especialidad)
			// Primero intentar buscar en report_templates_by_specialty
			let templatesBySpecialty: any = null;
			if (medicProfile?.report_templates_by_specialty) {
				if (typeof medicProfile.report_templates_by_specialty === 'string') {
					try {
						templatesBySpecialty = JSON.parse(medicProfile.report_templates_by_specialty);
					} catch {
						templatesBySpecialty = null;
					}
				} else {
					templatesBySpecialty = medicProfile.report_templates_by_specialty;
				}
			}

			// Obtener especialidades del doctor para buscar la plantilla correcta
			const { data: medicProfileForSpecialties } = await supabase
				.from('medic_profile')
				.select('specialty, private_specialty')
				.eq('doctor_id', doctorId)
				.maybeSingle();

			// Función helper para parsear especialidades
			const parseSpecialtyField = (value: any): string[] => {
				if (!value) return [];
				if (Array.isArray(value)) {
					return value.map(String).filter(s => s.trim().length > 0);
				}
				if (typeof value === 'string') {
					const trimmed = value.trim();
					if (!trimmed) return [];
					try {
						const parsed = JSON.parse(trimmed);
						if (Array.isArray(parsed)) {
							return parsed.map(String).filter(s => s.trim().length > 0);
						}
						return [String(parsed)];
					} catch {
						return [trimmed];
					}
				}
				return [];
			};

			const privateSpecialties = parseSpecialtyField(medicProfileForSpecialties?.private_specialty);
			const clinicSpecialties = parseSpecialtyField(medicProfileForSpecialties?.specialty);
			const allDoctorSpecialties = Array.from(new Set([...privateSpecialties, ...clinicSpecialties]));
			const consultationSpecialty = allDoctorSpecialties[0] || null;

			// Normalizar nombre de especialidad para búsqueda
			const normalizeSpecialtyName = (name: string): string => {
				return name
					.toLowerCase()
					.trim()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '');
			};

			// Buscar plantilla en report_templates_by_specialty
			if (templatesBySpecialty && consultationSpecialty) {
				// Buscar por nombre exacto primero
				if (templatesBySpecialty[consultationSpecialty]?.template_url) {
					templateUrl = templatesBySpecialty[consultationSpecialty].template_url;
					templateName = templatesBySpecialty[consultationSpecialty].template_name || null;
					templateText = templatesBySpecialty[consultationSpecialty].template_text || null;
					templateFontFamily = templatesBySpecialty[consultationSpecialty].font_family || 'Arial';
				} else {
					// Buscar por nombre normalizado (sin acentos, minúsculas)
					const normalizedConsultationSpecialty = normalizeSpecialtyName(consultationSpecialty);
					const matchingKey = Object.keys(templatesBySpecialty).find(key => 
						normalizeSpecialtyName(key) === normalizedConsultationSpecialty
					);
					
					if (matchingKey && templatesBySpecialty[matchingKey]?.template_url) {
						templateUrl = templatesBySpecialty[matchingKey].template_url;
						templateName = templatesBySpecialty[matchingKey].template_name || null;
						templateText = templatesBySpecialty[matchingKey].template_text || null;
						templateFontFamily = templatesBySpecialty[matchingKey].font_family || 'Arial';
					}
				}
			}

			// Si no se encontró en report_templates_by_specialty, usar plantilla general (compatibilidad hacia atrás)
			if (!templateUrl) {
				templateUrl = medicProfile?.report_template_url || null;
				templateName = medicProfile?.report_template_name || null;
				templateText = medicProfile?.report_template_text || null;
				templateFontFamily = medicProfile?.report_font_family || 'Arial';
			}
		}

		if (!templateUrl) {
			const errorMessage = isObstetrics
				? `No se encontró plantilla de Word para el informe de ${reportType === 'first_trimester' ? 'Primer Trimestre' : 'Segundo y Tercer Trimestre'}. Por favor, carga una plantilla en "dashboard/medic/plantilla-informe" primero.`
				: 'No se encontró plantilla de informe. Por favor, carga una plantilla primero.';
			
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}

		// Si existe plantilla de texto y no se proporcionó contenido, generar automáticamente
		if (templateText && templateText.trim() && !reportContent.trim()) {
			console.log('[Generate Report API] Generando contenido automáticamente desde plantilla de texto');
			console.log('[Generate Report API] Template text length:', templateText?.length || 0);
			console.log('[Generate Report API] Report type:', reportType);
			try {
				const generatedContent = await generateReportContentFromTemplate(
					consultation,
					templateText,
					supabase,
					reportType,
					isSimpleConsulta,
					hasEcografiaTransvaginal,
					isOnlyVideoColposcopia
				);
				if (generatedContent && generatedContent.trim()) {
					reportContent = generatedContent;
					console.log('[Generate Report API] Contenido generado automáticamente, longitud:', reportContent.length);
					console.log('[Generate Report API] Contenido generado (primeros 200 chars):', reportContent.substring(0, 200) + '...');
				} else {
					console.warn('[Generate Report API] generateReportContentFromTemplate retornó contenido vacío');
				}
			} catch (error) {
				console.error('[Generate Report API] Error al generar contenido desde plantilla:', error);
			}
		}

		// Si después de intentar generar el contenido sigue vacío, crear un contenido mínimo
		if (!reportContent || !reportContent.trim()) {
			console.warn('[Generate Report API] No se pudo generar contenido automáticamente, creando contenido mínimo');
			
			// Generar contenido mínimo básico con información del paciente
			let patientName = 'Paciente no registrado';
			if (consultation.patient_id) {
				const { data: patientData } = await supabase.from('patient').select('firstName, lastName').eq('id', consultation.patient_id).single();
				if (patientData) {
					patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
				}
			} else if (consultation.unregistered_patient_id) {
				const { data: unregisteredPatient } = await supabase.from('unregisteredpatients').select('first_name, last_name').eq('id', consultation.unregistered_patient_id).single();
				if (unregisteredPatient) {
					patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				}
			}

			const consultationDate = consultation.started_at
				? new Date(consultation.started_at).toLocaleDateString('es-ES', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
				  })
				: consultation.created_at
				? new Date(consultation.created_at).toLocaleDateString('es-ES', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
				  })
				: new Date().toLocaleDateString('es-ES');

			reportContent = `Informe de Consulta

Paciente: ${patientName}
Fecha: ${consultationDate}
${consultation.diagnosis ? `Diagnóstico: ${consultation.diagnosis}` : ''}
${consultation.chief_complaint ? `Motivo de consulta: ${consultation.chief_complaint}` : ''}
${consultation.notes ? `Notas: ${consultation.notes}` : ''}

${isObstetrics ? `Tipo de informe: ${reportType === 'first_trimester' ? 'Primer Trimestre' : 'Segundo y Tercer Trimestre'}` : ''}
`;
			
			console.log('[Generate Report API] Contenido mínimo generado, longitud:', reportContent.length);
		}

		// Crear cliente admin para descargar plantilla (bypass RLS)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Generate Report API] SUPABASE_SERVICE_ROLE_KEY no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Descargar plantilla desde Supabase Storage
		const bucket = 'report-templates';

		console.log('[Generate Report API] URL de plantilla:', templateUrl);
		console.log('[Generate Report API] Es URL HTTP?', templateUrl.startsWith('http://') || templateUrl.startsWith('https://'));

		let templateBuffer: Buffer;

		// Si la URL es una URL HTTP completa (URL firmada), descargar directamente con fetch
		if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
			console.log('[Generate Report API] Descargando plantilla desde URL firmada...');
			try {
				const response = await fetch(templateUrl);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				templateBuffer = Buffer.from(arrayBuffer);
				console.log('[Generate Report API] Plantilla descargada exitosamente, tamaño:', templateBuffer.length, 'bytes');
			} catch (fetchError: any) {
				console.error('[Generate Report API] Error descargando desde URL firmada:', fetchError);
				return NextResponse.json(
					{
						error: 'Error al descargar plantilla. Verifica que la plantilla exista y que tengas permisos para acceder a ella.',
					},
					{ status: 500 }
				);
			}
		} else {
			// Si es un path, extraer el path correcto y usar el cliente admin
			let filePath = templateUrl;

			// Si es una URL firmada de Supabase Storage (path con /storage/v1/object/)
			if (templateUrl.includes('/storage/v1/object/')) {
				const urlParts = templateUrl.split('/storage/v1/object/');
				if (urlParts.length > 1) {
					const pathWithQuery = urlParts[1];
					const pathOnly = pathWithQuery.split('?')[0];

					// Remover "sign/" si existe
					let cleanPath = pathOnly;
					if (cleanPath.startsWith('sign/')) {
						cleanPath = cleanPath.substring(5);
					}

					// Remover el bucket del inicio
					if (cleanPath.startsWith(bucket + '/')) {
						filePath = cleanPath.substring(bucket.length + 1);
					} else {
						filePath = cleanPath;
					}
				}
			} else if (templateUrl.includes(bucket + '/')) {
				filePath = templateUrl.split(bucket + '/')[1].split('?')[0];
			} else if (templateUrl.startsWith('/')) {
				filePath = templateUrl.substring(1).split('?')[0];
			} else {
				filePath = templateUrl.split('?')[0];
			}

			// Decodificar URL encoding
			try {
				filePath = decodeURIComponent(filePath);
			} catch (e) {
				console.warn('[Generate Report API] Error decodificando path:', e);
			}

			console.log('[Generate Report API] Descargando plantilla desde path:', filePath);

			// Descargar archivo usando cliente admin
			const { data: templateData, error: downloadError } = await supabaseAdmin.storage.from(bucket).download(filePath);

			if (downloadError || !templateData) {
				console.error('[Generate Report API] Error descargando plantilla:', downloadError);
				console.error('[Generate Report API] Path intentado:', filePath);
				return NextResponse.json({ error: 'Error al descargar plantilla. Verifica que la plantilla exista.' }, { status: 500 });
			}

			// Convertir Blob a Buffer
			const arrayBuffer = await templateData.arrayBuffer();
			templateBuffer = Buffer.from(arrayBuffer);
		}

		// Procesar plantilla con docxtemplater
		const zip = new PizZip(templateBuffer);

		// Configurar delimitadores personalizados para soportar {{variable}} en lugar de {variable}
		// Esto permite usar {{contenido}} en la plantilla de Word
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			delimiters: {
				start: '{{',
				end: '}}',
			},
		});

		// Función auxiliar para calcular edad desde fecha de nacimiento
		function calculateAge(dob: string | Date | null | undefined): string {
			if (!dob) return 'N/A';

			try {
				const birthDate = dob instanceof Date ? dob : new Date(dob);
				if (isNaN(birthDate.getTime())) return 'N/A';

				const today = new Date();
				let age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();

				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age = age - 1;
				}

				return String(age);
			} catch (error) {
				console.error('[Generate Report API] Error calculando edad:', error);
				return 'N/A';
			}
		}

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		let patientPhone = 'N/A';
		let patientAge = 'N/A';
		if (consultation.patient_id) {
			// Obtener datos del paciente registrado desde la tabla Patient
			const { data: patientData, error: patientError } = await supabase.from('patient').select('firstName, lastName, identifier, phone, dob').eq('id', consultation.patient_id).single();

			if (!patientError && patientData) {
				patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
				patientId = patientData.identifier || 'N/A';
				patientPhone = patientData.phone || 'N/A';
				patientAge = calculateAge(patientData.dob);
			}
		} else if (consultation.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabase.from('unregisteredpatients').select('first_name, last_name, identification, phone, birth_date').eq('id', consultation.unregistered_patient_id).single();

			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
				patientPhone = unregisteredPatient.phone || 'N/A';
				patientAge = calculateAge(unregisteredPatient.birth_date);
			}
		}

		// Obtener datos del médico desde la tabla User usando doctor_id
		let doctorName = 'Médico';
		if (consultation.doctor_id) {
			const { data: doctorData } = await supabase.from('users').select('name, email').eq('id', consultation.doctor_id).single();

			if (doctorData) {
				doctorName = doctorData.name || doctorData.email || 'Médico';
			}
		}

		// Preparar datos para la plantilla
		const consultationDate = consultation.started_at
			? new Date(consultation.started_at).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: consultation.created_at
			? new Date(consultation.created_at).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: new Date().toLocaleDateString('es-ES');

		// Preparar datos para la plantilla
		// Nota: Los nombres de las claves deben coincidir EXACTAMENTE con los marcadores en la plantilla Word
		// Por ejemplo, si en Word tienes {{edad}}, aquí debe ser 'edad'
		
		// Variables básicas comunes a todos los informes
		const baseTemplateData: Record<string, string> = {
			contenido: reportContent,
			content: reportContent, // Variante en inglés por si acaso
			informe: reportContent, // Otra variante posible
			fecha: consultationDate,
			date: consultationDate, // Variante en inglés
			paciente: patientName,
			patient: patientName, // Variante en inglés
			edad: patientAge,
			age: patientAge, // Variante en inglés
			cedula: patientId,
			identificacion: patientId,
			telefono: patientPhone,
			phone: patientPhone,
			medico: doctorName,
			doctor: doctorName, // Variante en inglés
			diagnostico: consultation.diagnosis || 'No especificado',
			diagnosis: consultation.diagnosis || 'No especificado', // Variante en inglés
			motivo: consultation.chief_complaint || 'No especificado',
			complaint: consultation.chief_complaint || 'No especificado', // Variante en inglés
			notas: consultation.notes || '',
			notes: consultation.notes || '', // Variante en inglés
		};

		// Construir templateDataObj según el tipo de informe
		let templateDataObj: Record<string, string>;

		if (reportType === 'first_trimester') {
			// Variables SOLO del Primer Trimestre (sin ginecología)
			templateDataObj = {
				...baseTemplateData,
				// Datos de la Paciente
				edad_gestacional: firstTrim.edad_gestacional || '',
				fur: firstTrim.fur || '',
				fpp: firstTrim.fpp || '',
				gestas: firstTrim.gestas || '',
				paras: firstTrim.paras || '',
				cesareas: firstTrim.cesareas || '',
				abortos: firstTrim.abortors || firstTrim.abortos || '',
				otros: firstTrim.otros || '',
				motivo_consulta: firstTrim.motivo_consulta || consultation.chief_complaint || 'No especificado',
				referencia: firstTrim.referencia || '',
				
				// Datos Obstétricos del 1er Trimestre
				posicion: firstTrim.posicion || '',
				superficie: firstTrim.superficie || 'Regular',
				miometrio: firstTrim.miometrio || 'HOMOGENEO',
				endometrio: firstTrim.endometrio || 'Ocupado Por Saco Gestacional.',
				ovario_derecho: firstTrim.ovario_derecho || 'Normal',
				ovario_izquierdo: firstTrim.ovario_izquierdo || 'Normal',
				anexos_ecopatron: firstTrim.anexos_ecopatron || 'Normal',
				fondo_de_saco: firstTrim.fondo_de_saco || 'Libre',
				cuerpo_luteo: firstTrim.cuerpo_luteo || '',
				
				// Saco Gestacional
				gestacion: firstTrim.gestacion || '',
				localizacion: firstTrim.localizacion || '',
				vesicula: firstTrim.vesicula || '',
				cavidad_exocelomica: firstTrim.cavidad_exocelomica || '',
				
				// Embrión
				embrion_visto: firstTrim.embrion_visto || '',
				ecoanatomia: firstTrim.ecoanatomia || '',
				lcr: firstTrim.lcr || '',
				acorde_a: firstTrim.acorde_a || '',
				actividad_cardiaca: firstTrim.actividad_cardiaca || '',
				movimientos_embrionarios: firstTrim.movimientos_embrionarios || '',
				
				// Conclusiones
				conclusiones: firstTrim.conclusiones || '',
			};
		} else if (reportType === 'second_third_trimester') {
			// Variables SOLO del Segundo y Tercer Trimestre (sin ginecología)
			templateDataObj = {
				...baseTemplateData,
				// Datos de la Paciente
				edad_gestacional: secondTrim.edad_gestacional || '',
				fur: secondTrim.fur || '',
				fpp: secondTrim.fpp || '',
				gestas: secondTrim.gestas || '',
				paras: secondTrim.paras || '',
				cesareas: secondTrim.cesareas || '',
				abortos: secondTrim.abortos || '',
				otros: secondTrim.otros || '',
				motivo_consulta: secondTrim.motivo_consulta || consultation.chief_complaint || 'No especificado',
				referencia: secondTrim.referencia || '',
				
				// Datos Obstétricos
				num_fetos: secondTrim.num_fetos || '01',
				actividad_cardiaca: secondTrim.actividad_cardiaca || '',
				situacion: secondTrim.situacion || '',
				presentacion: secondTrim.presentacion || '',
				dorso: secondTrim.dorso || '',
				
				// Datos Biométricos
				dbp: secondTrim.dbp || '',
				cc: secondTrim.cc || '',
				ca: secondTrim.ca || '',
				lf: secondTrim.lf || '',
				peso_estimado_fetal: secondTrim.peso_estimado_fetal || '',
				para: secondTrim.para || '',
				
				// Datos Placenta Foliculares
				placenta: secondTrim.placenta || '',
				ubi: secondTrim.ubi || '',
				insercion: secondTrim.insercion || '',
				grado: secondTrim.grado || 'I/III',
				cordon_umbilical: secondTrim.cordon_umbilical || '',
				liqu_amniotico: secondTrim.liqu_amniotico || '',
				p: secondTrim.p || '',
				ila: secondTrim.ila || '',
				
				// Datos Anatomofuncionales
				craneo: secondTrim.craneo || '',
				corazon: secondTrim.corazon || '',
				fcf: secondTrim.fcf || '',
				pulmones: secondTrim.pulmones || '',
				situs_visceral: secondTrim.situs_visceral || '',
				intestino: secondTrim.intestino || '',
				vejiga: secondTrim.vejiga || '',
				vejiga_extra: secondTrim.vejiga_extra || '',
				estomago: secondTrim.estomago || '',
				estomago_extra: secondTrim.estomago_extra || '',
				rinones: secondTrim.rinones || '',
				rinones_extra: secondTrim.rinones_extra || '',
				genitales: secondTrim.genitales || '',
				miembros_superiores: secondTrim.miembros_superiores || '',
				manos: secondTrim.manos || '',
				miembros_inferiores: secondTrim.miembros_inferiores || '',
				pies: secondTrim.pies || '',
				
				// Conclusiones
				conclusiones: secondTrim.conclusiones || '',
			};
		} else {
			// Variables de Ginecología (comportamiento original)
			templateDataObj = {
				...baseTemplateData,
				// Datos de ginecología
				ultima_regla: gyn.last_menstrual_period || '',
				ho: gyn.ho || '',
				metodo_anticonceptivo: gyn.contraceptive || '',
				método_anticonceptivo: gyn.contraceptive || '', // Con tilde para compatibilidad

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
			};
		}

		console.log('[Generate Report API] Datos que se pasarán a la plantilla:', {
			contenido: reportContent.substring(0, 100) + (reportContent.length > 100 ? '...' : ''),
			contenido_completo_length: reportContent.length,
			fecha: consultationDate,
			paciente: patientName,
			medico: doctorName,
			diagnostico: consultation.diagnosis || 'No especificado',
			motivo: consultation.chief_complaint || 'No especificado',
			notas: consultation.notes || '',
		});
		console.log('[Generate Report API] Claves disponibles en templateDataObj:', Object.keys(templateDataObj));

		// Renderizar plantilla usando la nueva API de docxtemplater (v3.40+)
		try {
			doc.render(templateDataObj);
			console.log('[Generate Report API] Plantilla renderizada exitosamente');
		} catch (error: any) {
			console.error('[Generate Report API] Error renderizando plantilla:', error);
			console.error('[Generate Report API] Detalles del error:', {
				message: error.message,
				name: error.name,
				properties: error.properties,
			});
			return NextResponse.json(
				{
					error: 'Error al procesar plantilla. Verifica que los marcadores en la plantilla sean correctos.',
					detail: error.message,
				},
				{ status: 500 }
			);
		}

		// Modificar formato del documento: tamaño de fuente 9, títulos centrados, contenido justificado y fuente personalizada
		try {
			const zip = doc.getZip();
			const documentXml = zip.files['word/document.xml'];

			if (documentXml) {
				let xmlContent = documentXml.asText();

				// Obtener la fuente seleccionada (por defecto Arial)
				// La fuente del request tiene prioridad, si no, de la plantilla específica, si no, del perfil, si no, Arial por defecto
				const selectedFont = fontFamilyFromRequest || templateFontFamily || medicProfile?.report_font_family || 'Arial';

				// Cambiar tamaño de fuente a 9pt (en half-points: 9 * 2 = 18)
				// Reemplazar todos los valores de w:sz a 18
				xmlContent = xmlContent.replace(/<w:sz\s+w:val="\d+"/g, '<w:sz w:val="18"');

				// Si hay <w:rPr> sin <w:sz>, agregarlo
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:sz)/g, '$1<w:sz w:val="18"/>');

				// Aplicar la fuente seleccionada
				// Reemplazar todas las fuentes existentes con la fuente seleccionada
				xmlContent = xmlContent.replace(/<w:rFonts[^>]*>/g, `<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);

				// Si hay <w:rPr> sin <w:rFonts>, agregarlo con la fuente seleccionada
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:rFonts)/g, `$1<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);

				// NUEVA LÓGICA: Centrar títulos y justificar contenido
				// 1. Identificar y centrar títulos (párrafos con estilos de título)
				// Los títulos en Word suelen tener estilos como "Heading 1", "Heading 2", "Título", etc.
				// Buscar párrafos con estilos de título y centrarlos
				xmlContent = xmlContent.replace(
					/(<w:p[^>]*>[\s\S]*?<w:pPr[^>]*>[\s\S]*?<w:pStyle[^>]*w:val="(?:Heading|Título|Title|Encabezado)[^"]*"[\s\S]*?)(<\/w:pPr>)/g,
					(match, before, pPrEnd) => {
						// Si ya tiene w:jc, cambiarlo a center
						if (/<w:jc[^>]*>/.test(match)) {
							return match.replace(/<w:jc[^>]*w:val="[^"]*"/g, '<w:jc w:val="center"');
						}
						// Si no tiene w:jc, agregarlo con center
						return before + '<w:jc w:val="center"/>' + pPrEnd;
					}
				);

				// 2. Aplicar justificación (both) a todos los párrafos que NO sean títulos
				// Primero, identificar todos los párrafos que NO son títulos y aplicar justificación
				// Usar un enfoque más simple: buscar párrafos sin estilo de título y aplicar justificación
				xmlContent = xmlContent.replace(
					/(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/g,
					(match, pStart, pContent, pEnd) => {
						// Verificar si es un título
						const isTitle = /<w:pStyle[^>]*w:val="(?:Heading|Título|Title|Encabezado)[^"]*"/.test(pContent);
						
						if (!isTitle) {
							// No es un título, aplicar justificación
							// Si tiene w:pPr
							if (/<w:pPr[^>]*>/.test(pContent)) {
								// Si ya tiene w:jc, cambiarlo a both (justificado)
								if (/<w:jc[^>]*>/.test(pContent)) {
									pContent = pContent.replace(/<w:jc[^>]*w:val="[^"]*"/g, '<w:jc w:val="both"');
								} else {
									// No tiene w:jc, agregarlo con both antes del cierre de w:pPr
									pContent = pContent.replace(/(<\/w:pPr>)/, '<w:jc w:val="both"/>$1');
								}
							} else {
								// No tiene w:pPr, agregarlo con w:jc
								pContent = '<w:pPr><w:jc w:val="both"/></w:pPr>' + pContent;
							}
						}
						
						return pStart + pContent + pEnd;
					}
				);

				// Actualizar el XML en el ZIP
				zip.file('word/document.xml', xmlContent);
				console.log(`[Generate Report API] Formato aplicado: fuente ${selectedFont}, tamaño 9pt, títulos centrados, contenido justificado`);
			}
		} catch (formatError: any) {
			console.warn('[Generate Report API] Error aplicando formato (continuando sin formato):', formatError);
			// Continuar sin formato si hay error
		}

		// Generar documento final
		const generatedBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// Subir informe generado a Supabase Storage usando cliente admin
		const reportsBucket = 'consultation-reports';
		const reportFileName = `${id}/${Date.now()}-informe-${id}.docx`;

		// Subir informe usando cliente admin (bypass RLS)
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from(reportsBucket).upload(reportFileName, generatedBuffer, {
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			upsert: false,
		});

		if (uploadError) {
			console.error('[Generate Report API] Error subiendo informe:', uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			const errorMessage = uploadError.message || String(uploadError);

			// Si el error es porque el bucket no existe (404), informar al usuario
			if (statusCode === '404' || statusCode === 404 || errorMessage.includes('not found') || errorMessage.includes('Bucket not found')) {
				return NextResponse.json(
					{
						error: 'El bucket "consultation-reports" no está configurado. Por favor, crea el bucket en Supabase Storage Dashboard o contacta al administrador.',
					},
					{ status: 500 }
				);
			}
			return NextResponse.json({ error: 'Error al guardar informe' }, { status: 500 });
		}

		// Obtener URL del informe usando cliente admin
		const { data: urlData } = await supabaseAdmin.storage.from(reportsBucket).createSignedUrl(reportFileName, 31536000); // 1 año de validez

		const reportUrl = urlData?.signedUrl || `/${reportsBucket}/${reportFileName}`;

		// Actualizar consulta solo con URL del informe (sin guardar en MedicalRecord automáticamente)
		const { error: updateError } = await supabase.from('consultation').update({ report_url: reportUrl }).eq('id', id);

		if (updateError) {
			console.error('[Generate Report API] Error actualizando consulta:', updateError);
			// No fallar, el informe ya está generado
		}

		return NextResponse.json({
			success: true,
			report_url: reportUrl,
			message: 'Informe generado exitosamente. Usa el botón "Guardar Informe" para guardarlo en el historial del paciente.',
		});
	} catch (err) {
		console.error('[Generate Report API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al generar informe',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}
