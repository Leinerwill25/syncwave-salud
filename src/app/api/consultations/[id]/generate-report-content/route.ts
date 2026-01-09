// app/api/consultations/[id]/generate-report-content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// Helper para parsear el campo de especialidad (puede venir como array, string JSON, o string simple)
function parseSpecialtyField(value: any): string[] {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value.map(String).filter(s => s.trim().length > 0);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];
		// Intentar parsear como JSON
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map(String).filter(s => s.trim().length > 0);
			}
			return [String(parsed)];
		} catch {
			// Si no es JSON válido, tratarlo como string simple
			return [trimmed];
		}
	}
	return [String(value)];
}

// Obtener especialidades del doctor
async function getDoctorSpecialties(doctorId: string, supabase: any): Promise<{ specialty1: string | null; specialty2: string | null }> {
	const { data: medicProfile } = await supabase
		.from('medic_profile')
		.select('specialty, private_specialty')
		.eq('doctor_id', doctorId)
		.maybeSingle();

	// Parsear especialidades (pueden venir como arrays)
	const privateSpecialties = parseSpecialtyField(medicProfile?.private_specialty);
	const clinicSpecialties = parseSpecialtyField(medicProfile?.specialty);

	// Combinar todas las especialidades únicas
	const allSpecialties = Array.from(new Set([...privateSpecialties, ...clinicSpecialties]));

	// specialty1 es la primera especialidad
	const specialty1 = allSpecialties[0] || null;
	
	// specialty2 es la segunda especialidad si existe
	const specialty2 = allSpecialties.length > 1 ? allSpecialties[1] : null;

	return { specialty1, specialty2 };
}

// Función para generar contenido por defecto para obstetricia cuando no hay plantilla
function generateDefaultObstetricsContent(consultation: any, reportType: string): string {
	const vitals = consultation.vitals || {};
	const obst = vitals.obstetrics || {};
	const firstTrim = obst.first_trimester || {};
	const secondTrim = obst.second_third_trimester || {};
	
	const data = reportType === 'first_trimester' ? firstTrim : secondTrim;
	
	// Generar contenido estructurado básico desde los datos
	let content = '';
	
	if (reportType === 'first_trimester') {
		content = `INFORME DE ECOGRAFÍA OBSTÉTRICA - PRIMER TRIMESTRE

DATOS DE LA PACIENTE:
Edad gestacional: ${data.edad_gestacional || 'No especificada'}
FUR: ${data.fur || 'No especificada'}
FPP: ${data.fpp || 'No especificada'}
Gestas: ${data.gestas || 'No especificada'}
Paras: ${data.paras || 'No especificada'}
Cesáreas: ${data.cesareas || 'No especificada'}
Abortos: ${data.abortos || data.abortors || 'No especificada'}

HALLAZGOS ECOGRÁFICOS:
Posición: ${data.posicion || 'No especificada'}
Superficie: ${data.superficie || 'Regular'}
Miometrio: ${data.miometrio || 'HOMOGENEO'}
Endometrio: ${data.endometrio || 'Ocupado Por Saco Gestacional.'}
Ovario derecho: ${data.ovario_derecho || 'Normal'}
Ovario izquierdo: ${data.ovario_izquierdo || 'Normal'}
Anexos: ${data.anexos_ecopatron || 'Normal'}
Fondo de saco: ${data.fondo_de_saco || 'Libre'}
${data.cuerpo_luteo ? `Cuerpo lúteo: ${data.cuerpo_luteo}` : ''}

SACO GESTACIONAL:
Gestación: ${data.gestacion || 'No especificada'}
Localización: ${data.localizacion || 'No especificada'}
Vesícula: ${data.vesicula || 'No especificada'}
Cavidad exocelómica: ${data.cavidad_exocelomica || 'No especificada'}

EMBRIÓN:
Embrión visto: ${data.embrion_visto || 'No especificada'}
Ecoanatomía: ${data.ecoanatomia || 'No especificada'}
LCR: ${data.lcr || 'No especificada'}
Acorde a: ${data.acorde_a || 'No especificada'}
Actividad cardíaca: ${data.actividad_cardiaca || 'No especificada'}
Movimientos embrionarios: ${data.movimientos_embrionarios || 'No especificada'}

CONCLUSIONES:
${data.conclusiones || 'No especificadas'}`;
	} else {
		content = `INFORME DE ECOGRAFÍA OBSTÉTRICA - SEGUNDO Y TERCER TRIMESTRE

DATOS DE LA PACIENTE:
Edad gestacional: ${data.edad_gestacional || 'No especificada'}
FUR: ${data.fur || 'No especificada'}
FPP: ${data.fpp || 'No especificada'}
Gestas: ${data.gestas || 'No especificada'}
Paras: ${data.paras || 'No especificada'}
Cesáreas: ${data.cesareas || 'No especificada'}
Abortos: ${data.abortos || 'No especificada'}

HALLAZGOS ECOGRÁFICOS:
Posición fetal: ${data.posicion_fetal || 'No especificada'}
Presentación: ${data.presentacion || 'No especificada'}
Actitud fetal: ${data.actitud_fetal || 'No especificada'}
Líquido amniótico: ${data.liquido_amniotico || 'Normal'}
Placenta: ${data.placenta || 'No especificada'}
Localización placentaria: ${data.localizacion_placentaria || 'No especificada'}
Grado placentario: ${data.grado_placentario || 'No especificado'}

BIOMETRÍA FETAL:
BPD: ${data.bpd || 'No especificada'}
HC: ${data.hc || 'No especificada'}
AC: ${data.ac || 'No especificada'}
FL: ${data.fl || 'No especificada'}
Peso estimado: ${data.peso_estimado || 'No especificado'}

ANATOMÍA FETAL:
Cabeza: ${data.cabeza || 'Normal'}
Tórax: ${data.torax || 'Normal'}
Corazón: ${data.corazon || 'Normal'}
Abdomen: ${data.abdomen || 'Normal'}
Extremidades: ${data.extremidades || 'Normal'}
Columna: ${data.columna || 'Normal'}

CONCLUSIONES:
${data.conclusiones || 'No especificadas'}`;
	}
	
	return content;
}

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
	// Si la plantilla está vacía y es obstetricia, generar contenido por defecto
	const isObstetrics = reportType === 'first_trimester' || reportType === 'second_third_trimester';
	let content = templateText;
	
	// Si no hay plantilla y es obstetricia, generar contenido estructurado desde los datos
	if (!templateText || templateText.trim() === '') {
		if (isObstetrics) {
			// Generar contenido por defecto para obstetricia basado en los datos
			content = generateDefaultObstetricsContent(consultation, reportType);
			// No hacer reemplazos de variables ya que el contenido ya está generado
			return content;
		} else {
			// Para otras especialidades, mantener plantilla vacía (se validará antes de llamar a esta función)
			content = templateText || '';
		}
	}

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
		cedula: patientIdentifier || 'N/A',
		identificacion: patientIdentifier || 'N/A',
		telefono: patientPhone || 'N/A',
		phone: patientPhone || 'N/A',
		
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
		replacements = {
			...baseReplacements,
		};

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const reportTypeFromQuery = searchParams.get('report_type') || null;

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

		console.log('[Generate Report Content API] Consulta obtenida:', {
			id: consultation.id,
			patient_id: consultation.patient_id,
			unregistered_patient_id: consultation.unregistered_patient_id,
		});

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
		const obst = vitals.obstetrics || {};
		const reportType = reportTypeFromQuery || obst.report_type || 'gynecology'; // 'gynecology', 'first_trimester', 'second_third_trimester'
		const isObstetrics = reportType === 'first_trimester' || reportType === 'second_third_trimester';

		// Obtener plantillas del médico (incluyendo plantillas por especialidad)
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_template_text, report_templates_by_specialty, report_font_family')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Generate Report Content API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		// Si es obstetricia, buscar plantilla específica
		let templateText: string | null = null;
		let templateFontFamily: string = medicProfile?.report_font_family || 'Arial';

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
						templateText = obstTemplate.variants.trimestre1.template_text || null;
						templateFontFamily = obstTemplate.variants.trimestre1.font_family || templateFontFamily;
					} else if (reportType === 'second_third_trimester' && obstTemplate.variants.trimestre2_3) {
						templateText = obstTemplate.variants.trimestre2_3.template_text || null;
						templateFontFamily = obstTemplate.variants.trimestre2_3.font_family || templateFontFamily;
					}
				} else if (obstTemplate.trimestre1 && reportType === 'first_trimester') {
					templateText = obstTemplate.trimestre1.template_text || null;
					templateFontFamily = obstTemplate.trimestre1.font_family || templateFontFamily;
				} else if (obstTemplate.trimestre2_3 && reportType === 'second_third_trimester') {
					templateText = obstTemplate.trimestre2_3.template_text || null;
					templateFontFamily = obstTemplate.trimestre2_3.font_family || templateFontFamily;
				}
			}

			// Si no se encontró plantilla específica, usar plantilla general
			if (!templateText) {
				templateText = medicProfile?.report_template_text || null;
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

			// Determinar la especialidad de la consulta para buscar la plantilla correcta
			// Normalizar el nombre de la especialidad para buscar en templatesBySpecialty
			const normalizeSpecialtyName = (name: string): string => {
				return name
					.toLowerCase()
					.trim()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '');
			};

			// Obtener la especialidad del doctor (puede ser specialty1 o specialty2)
			const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);
			const consultationSpecialty = specialty1 || specialty2; // Usar la primera especialidad disponible

			// Buscar plantilla en report_templates_by_specialty
			if (templatesBySpecialty && consultationSpecialty) {
				// Buscar por nombre exacto primero
				if (templatesBySpecialty[consultationSpecialty]?.template_text) {
					templateText = templatesBySpecialty[consultationSpecialty].template_text;
					templateFontFamily = templatesBySpecialty[consultationSpecialty].font_family || templateFontFamily;
				} else {
					// Buscar por nombre normalizado (sin acentos, minúsculas)
					const normalizedConsultationSpecialty = normalizeSpecialtyName(consultationSpecialty);
					const matchingKey = Object.keys(templatesBySpecialty).find(key => 
						normalizeSpecialtyName(key) === normalizedConsultationSpecialty
					);
					
					if (matchingKey && templatesBySpecialty[matchingKey]?.template_text) {
						templateText = templatesBySpecialty[matchingKey].template_text;
						templateFontFamily = templatesBySpecialty[matchingKey].font_family || templateFontFamily;
					}
				}
			}

			// Si no se encontró en report_templates_by_specialty, usar plantilla general (compatibilidad hacia atrás)
			if (!templateText) {
				templateText = medicProfile?.report_template_text || null;
			}
		}

		// Para obstetricia, las plantillas de texto no son obligatorias
		// Si no hay plantilla, se generará un contenido por defecto basado en los datos
		if (!templateText) {
			if (isObstetrics) {
				// Para obstetricia, no es necesario tener plantilla de texto
				// Se generará contenido automáticamente desde los datos de la consulta
				console.log('[Generate Report Content API] No hay plantilla de texto para obstetricia, generando contenido desde datos de la consulta');
				templateText = ''; // Plantilla vacía, se generará contenido desde los datos
			} else {
				// Para otras especialidades (ginecología), sí se requiere plantilla
				const errorMessage = 'No se encontró plantilla de texto. Por favor, configura una plantilla de texto primero.';
				
				console.error('[Generate Report Content API] No se encontró plantilla de texto:', {
					isObstetrics,
					reportType,
					hasReportTemplatesBySpecialty: !!medicProfile?.report_templates_by_specialty,
					hasReportTemplateText: !!medicProfile?.report_template_text,
					doctorId
				});
				
				return NextResponse.json(
					{
						error: errorMessage,
					},
					{ status: 400 }
				);
			}
		}

		// Generar contenido automáticamente
		const generatedContent = await generateReportContentFromTemplate(
			consultation,
			templateText,
			supabase,
			reportType,
			isSimpleConsulta,
			hasEcografiaTransvaginal,
			isOnlyVideoColposcopia
		);

		return NextResponse.json({
			content: generatedContent,
			font_family: templateFontFamily,
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
