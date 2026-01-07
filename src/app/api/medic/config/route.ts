// app/api/medic/config/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { PRIVATE_SPECIALTIES, isValidPrivateSpecialty } from '@/lib/constants/specialties';

export async function GET(request: Request) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión y consulta de User)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener datos completos del usuario de la app usando authId (las políticas RLS funcionan con authId)
		// apiRequireRole ya validó que existe y es MEDICO, pero necesitamos más campos (name, etc.)
		const { data: appUser, error: userError } = await supabase
			.from('user')
			.select('id, name, email, organizationId, role')
			.eq('authId', user.authId)
			.maybeSingle();

		if (userError) {
			console.error('[Medic Config API] Error obteniendo usuario de la base de datos:', userError);
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (!appUser) {
			console.error('[Medic Config API] Usuario no encontrado en la tabla User. userId:', user.userId, 'authId:', user.authId, 'email:', user.email);
			return NextResponse.json({ error: 'Usuario no encontrado en el sistema' }, { status: 404 });
		}

		// Obtener perfil de clínica y tipo de organización
		// IMPORTANTE: No asumir que tener organizationId significa ser consultorio privado
		// Se debe validar el tipo de organización en la tabla Organization
		let clinicProfile: { legal_name: string | null; trade_name: string | null; specialties: unknown } | null = null;
		let clinicSpecialties: string[] = [];
		let organizationType: string | null = null;
		
		if (appUser.organizationId) {
			// Obtener tipo de organización desde la tabla organization
			// Esto es crítico para determinar si es consultorio privado (CONSULTORIO) o clínica (CLINICA/HOSPITAL)
			const { data: organization, error: orgError } = await supabase
				.from('organization')
				.select('type')
				.eq('id', appUser.organizationId)
				.maybeSingle();

			if (orgError) {
				console.error('[Medic Config API] Error obteniendo tipo de organización:', orgError);
			} else if (organization && organization.type) {
				organizationType = String(organization.type).toUpperCase();
			}

			// Solo obtener clinic_profile si es una CLINICA o HOSPITAL
			// Los consultorios privados (CONSULTORIO) no tienen clinic_profile
			if (organizationType === 'CLINICA' || organizationType === 'HOSPITAL') {
				const { data: clinic, error: clinicError } = await supabase
					.from('clinic_profile')
					.select('specialties, legal_name, trade_name')
					.eq('organization_id', appUser.organizationId)
					.maybeSingle();

				if (!clinicError && clinic) {
					clinicProfile = clinic;
					try {
						const parsed = Array.isArray(clinic.specialties) 
							? clinic.specialties 
							: typeof clinic.specialties === 'string' 
								? JSON.parse(clinic.specialties) 
								: [];
						clinicSpecialties = Array.isArray(parsed) 
							? parsed.map((s) => typeof s === 'string' ? s : String(s))
							: [];
					} catch {
						clinicSpecialties = [];
					}
				}
			}
		}

		// Obtener perfil del médico desde medic_profile
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('*')
			.eq('doctor_id', appUser.id)
			.maybeSingle();

		// Si no existe perfil, crear uno vacío
		let profile = medicProfile;
		if (!medicProfile && !profileError) {
			const { data: newProfile, error: createError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: appUser.id,
					services: [],
					credentials: {},
					credit_history: {},
					availability: {},
					notifications: { email: true, whatsapp: false, push: false },
					payment_methods: [],
				})
				.select()
				.single();

			if (!createError && newProfile) {
				profile = newProfile;
			}
		}

		// Parsear campos JSON con tipos seguros
		const parseJsonField = <T>(field: unknown, defaultValue: T): T => {
			if (!field) return defaultValue;
			if (typeof field === 'string') {
				try {
					return JSON.parse(field) as T;
				} catch {
					return defaultValue;
				}
			}
			return field as T;
		};

		const services = parseJsonField<Array<Record<string, unknown>>>(profile?.services, []);
		const serviceCombos = parseJsonField<Array<Record<string, unknown>>>(profile?.service_combos, []);
		
		// Tipar explícitamente credentials y creditHistory para validación
		type CredentialsType = {
			license?: string;
			licenseNumber?: string;
			issuedBy?: string;
			expirationDate?: string;
			credentialFiles?: string[];
		};
		type CreditHistoryType = {
			university?: string;
			degree?: string;
			graduationYear?: string;
			certifications?: unknown[];
		};
		
		const credentials = parseJsonField<CredentialsType>(profile?.credentials, {
			license: '',
			licenseNumber: '',
			issuedBy: '',
			expirationDate: '',
			credentialFiles: [],
		});
		const creditHistory = parseJsonField<CreditHistoryType>(profile?.credit_history, {
			university: '',
			degree: '',
			graduationYear: '',
			certifications: [],
		});
		const availability = parseJsonField<Record<string, unknown>>(profile?.availability, {});
		const notifications = parseJsonField<{ email: boolean; whatsapp: boolean; push: boolean }>(
			profile?.notifications,
			{ email: true, whatsapp: false, push: false }
		);
		const paymentMethods = parseJsonField<Array<Record<string, unknown>>>(profile?.payment_methods, []);

		// Un médico está "afiliado" si tiene una organización de tipo CLINICA o HOSPITAL
		// Los consultorios privados (CONSULTORIO) NO se consideran afiliados
		// IMPORTANTE: No asumir que tener organizationId significa ser consultorio privado
		// Se debe validar explícitamente el tipo de organización
		const isAffiliated = organizationType === 'CLINICA' || organizationType === 'HOSPITAL';
		
		// Si tiene organizationId pero el tipo no es CLINICA ni HOSPITAL, es consultorio privado o tipo desconocido
		// En ambos casos, isAffiliated será false

		// Verificar si el perfil está completo
		// Un perfil se considera completo si tiene:
		// 1. Nombre completo
		// 2. Especialidad (specialty para afiliados o privateSpecialty para consultorios privados)
		// 3. Licencia médica completa (license, licenseNumber, issuedBy, expirationDate válida)
		// 4. Al menos un documento de credenciales subido
		// 5. Historial crediticio básico (universidad, título, año de graduación)
		const hasName = !!appUser.name && appUser.name.trim().length > 0;
		const hasSpecialty = isAffiliated 
			? !!(profile?.specialty && profile.specialty.trim().length > 0)
			: !!(profile?.private_specialty && profile.private_specialty.trim().length > 0);
		
		// Validar credenciales de licencia médica (usando credentials ya parseado)
		const hasLicense = !!(credentials.license && String(credentials.license).trim().length > 0);
		const hasLicenseNumber = !!(credentials.licenseNumber && String(credentials.licenseNumber).trim().length > 0);
		const hasIssuedBy = !!(credentials.issuedBy && String(credentials.issuedBy).trim().length > 0);
		const hasExpirationDate = !!(credentials.expirationDate && String(credentials.expirationDate).trim().length > 0);
		
		// Verificar que la fecha de expiración no esté vencida
		let isExpirationDateValid = false;
		if (hasExpirationDate) {
			try {
				const expirationDate = new Date(String(credentials.expirationDate));
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				isExpirationDateValid = expirationDate >= today;
			} catch {
				isExpirationDateValid = false;
			}
		}
		
		// Verificar que tenga al menos un documento de credenciales
		const credentialFiles = Array.isArray(credentials.credentialFiles) ? credentials.credentialFiles : [];
		const hasCredentialFiles = credentialFiles.length > 0;
		
		// Validar historial crediticio básico (usando creditHistory ya parseado)
		const hasUniversity = !!(creditHistory.university && String(creditHistory.university).trim().length > 0);
		const hasDegree = !!(creditHistory.degree && String(creditHistory.degree).trim().length > 0);
		const hasGraduationYear = !!(creditHistory.graduationYear && String(creditHistory.graduationYear).trim().length > 0);
		
		const hasCompleteCredentials = hasLicense && hasLicenseNumber && hasIssuedBy && hasExpirationDate && isExpirationDateValid && hasCredentialFiles;
		const hasCompleteCreditHistory = hasUniversity && hasDegree && hasGraduationYear;
		
		const isProfileComplete = hasName && hasSpecialty && hasCompleteCredentials && hasCompleteCreditHistory;

		return NextResponse.json({
			user: {
				id: appUser.id,
				name: appUser.name,
				email: appUser.email,
				organizationId: appUser.organizationId,
			},
			isAffiliated: isAffiliated,
			organizationType: organizationType,
			isProfileComplete: isProfileComplete,
			clinicProfile: clinicProfile ? {
				name: clinicProfile.trade_name || clinicProfile.legal_name,
				specialties: clinicSpecialties,
			} : null,
			config: {
				specialty: profile?.specialty || null,
				privateSpecialty: profile?.private_specialty || null,
				signature: profile?.signature_url || null,
				photo: profile?.photo_url || null,
				credentials: credentials,
				creditHistory: creditHistory,
				availability: availability,
				notifications: notifications,
				services: services,
				serviceCombos: serviceCombos,
				whatsappNumber: (profile as any)?.whatsapp_number || null,
				whatsappMessageTemplate: (profile as any)?.whatsapp_message_template || null,
				privateSpecialties: Array.isArray(profile?.private_specialty) 
					? profile.private_specialty 
					: profile?.private_specialty 
						? [profile.private_specialty] 
						: [],
				paymentMethods: paymentMethods,
				liteMode: (profile as any)?.lite_mode ?? false,
			},
		});
	} catch (err) {
		console.error('[Medic Config API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión y consulta de User)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener datos del usuario de la app usando authId (las políticas RLS funcionan con authId)
		// apiRequireRole ya validó que existe y es MEDICO
		const { data: appUser, error: userError } = await supabase
			.from('user')
			.select('id, organizationId, role')
			.eq('authId', user.authId)
			.maybeSingle();

		if (userError) {
			console.error('[Medic Config API PATCH] Error obteniendo usuario de la base de datos:', userError);
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (!appUser) {
			console.error('[Medic Config API PATCH] Usuario no encontrado en la tabla User. userId:', user.userId, 'authId:', user.authId, 'email:', user.email);
			return NextResponse.json({ error: 'Usuario no encontrado en el sistema' }, { status: 404 });
		}

		const body = await request.json();

		// Validar que si está afiliado, la especialidad sea de la clínica
		if (appUser.organizationId && body.specialty) {
			const { data: clinic } = await supabase
				.from('clinic_profile')
				.select('specialties')
				.eq('organization_id', appUser.organizationId)
				.maybeSingle();

			if (clinic) {
				let clinicSpecialties: string[] = [];
				try {
					const parsed = Array.isArray(clinic.specialties) 
						? clinic.specialties 
						: typeof clinic.specialties === 'string' 
							? JSON.parse(clinic.specialties) 
							: [];
					clinicSpecialties = Array.isArray(parsed) 
						? parsed.map((s) => typeof s === 'string' ? s : String(s))
						: [];
				} catch {
					clinicSpecialties = [];
				}

				const specialtyNames = clinicSpecialties;

				if (!specialtyNames.includes(body.specialty)) {
					return NextResponse.json({ 
						error: 'La especialidad seleccionada no está disponible en esta clínica' 
					}, { status: 400 });
				}
			}
		}

		// Actualizar nombre si se proporciona
		if (body.name !== undefined) {
			const { error: updateError } = await supabase
				.from('user')
				.update({ name: body.name })
				.eq('id', appUser.id);

			if (updateError) {
				console.error('[Medic Config API PATCH] Error actualizando nombre:', updateError);
			}
		}

		// Preparar datos para medic_profile
		const profileData: Record<string, unknown> = {};

		if (body.specialty !== undefined) {
			profileData.specialty = body.specialty;
		}

		if (body.privateSpecialty !== undefined) {
			// Validar que la especialidad sea una de las permitidas
			if (body.privateSpecialty && !isValidPrivateSpecialty(body.privateSpecialty)) {
				return NextResponse.json({ 
					error: `Especialidad inválida. Debe ser una de: ${PRIVATE_SPECIALTIES.join(', ')}` 
				}, { status: 400 });
			}
			profileData.private_specialty = body.privateSpecialty || null;
		}

		if (body.photo !== undefined) {
			profileData.photo_url = body.photo;
		}

		if (body.signature !== undefined) {
			profileData.signature_url = body.signature;
		}

		if (body.services !== undefined) {
			profileData.services = body.services;
		}

		if (body.serviceCombos !== undefined) {
			profileData.service_combos = body.serviceCombos;
		}

		if (body.credentials !== undefined) {
			profileData.credentials = body.credentials;
		}

		if (body.creditHistory !== undefined) {
			profileData.credit_history = body.creditHistory;
		}

		if (body.availability !== undefined) {
			profileData.availability = body.availability;
		}

		if (body.notifications !== undefined) {
			profileData.notifications = body.notifications;
		}

		if (body.whatsappNumber !== undefined) {
			profileData.whatsapp_number =
				body.whatsappNumber && String(body.whatsappNumber).trim().length > 0
					? String(body.whatsappNumber).trim()
					: null;
		}

		if (body.whatsappMessageTemplate !== undefined) {
			profileData.whatsapp_message_template =
				body.whatsappMessageTemplate && String(body.whatsappMessageTemplate).trim().length > 0
					? String(body.whatsappMessageTemplate)
					: null;
		}

		if (body.paymentMethods !== undefined) {
			profileData.payment_methods = body.paymentMethods;
		}

		if (body.liteMode !== undefined) {
			profileData.lite_mode = body.liteMode;
		}

		// Verificar si existe perfil
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', appUser.id)
			.maybeSingle();

		if (existingProfile) {
			// Actualizar perfil existente
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update(profileData)
				.eq('doctor_id', appUser.id);

			if (updateError) {
				console.error('[Medic Config API PATCH] Error actualizando perfil:', updateError);
				return NextResponse.json({ 
					error: 'Error al actualizar perfil',
					detail: updateError.message 
				}, { status: 500 });
			}
		} else {
			// Crear nuevo perfil
			const { error: insertError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: appUser.id,
					...profileData,
				});

			if (insertError) {
				console.error('[Medic Config API PATCH] Error creando perfil:', insertError);
				return NextResponse.json({ 
					error: 'Error al crear perfil',
					detail: insertError.message 
				}, { status: 500 });
			}
		}

		return NextResponse.json({ 
			success: true,
			message: 'Configuración actualizada correctamente'
		});
	} catch (err) {
		console.error('[Medic Config API PATCH] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

