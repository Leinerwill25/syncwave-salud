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
		const { data: appUser, error: userError } = await supabase.from('user').select('id, name, email, organizationId, role').eq('authId', user.authId).maybeSingle();

		if (userError) {
			console.error('[Medic Config API] Error obteniendo usuario de la base de datos:', userError);
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (!appUser) {
			console.error('[Medic Config API] Usuario no encontrado en la tabla User. userId:', user.userId, 'authId:', user.authId, 'email:', user.email);
			return NextResponse.json({ error: 'Usuario no encontrado en el sistema' }, { status: 404 });
		}

		// Paralelizar consultas independientes para mejorar el rendimiento
		const [medicProfileResult, organizationResult] = await Promise.all([
			// Obtener perfil del médico desde medic_profile (solo campos necesarios)
			supabase.from('medic_profile').select('specialty, private_specialty, signature_url, photo_url, services, service_combos, credentials, credit_history, availability, notifications, payment_methods, whatsapp_number, whatsapp_message_template, lite_mode').eq('doctor_id', appUser.id).maybeSingle(),
			// Obtener tipo de organización (solo si tiene organizationId)
			appUser.organizationId ? supabase.from('organization').select('type').eq('id', appUser.organizationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
		]);

		const { data: medicProfile, error: profileError } = medicProfileResult;

		// Obtener perfil de clínica y tipo de organización
		let clinicProfile: { legal_name: string | null; trade_name: string | null; specialties: unknown } | null = null;
		let clinicSpecialties: string[] = [];
		let organizationType: string | null = null;

		if (appUser.organizationId && organizationResult) {
			const { data: organization, error: orgError } = organizationResult;

			if (!orgError && organization?.type) {
				organizationType = String(organization.type).toUpperCase();

				// Solo obtener clinic_profile si es una CLINICA o HOSPITAL
				if (organizationType === 'CLINICA' || organizationType === 'HOSPITAL') {
					const { data: clinic, error: clinicError } = await supabase.from('clinic_profile').select('specialties, legal_name, trade_name').eq('organization_id', appUser.organizationId).maybeSingle();

					if (!clinicError && clinic) {
						clinicProfile = clinic;
						try {
							const parsed = Array.isArray(clinic.specialties) ? clinic.specialties : typeof clinic.specialties === 'string' ? JSON.parse(clinic.specialties) : [];
							clinicSpecialties = Array.isArray(parsed) ? parsed.map((s) => (typeof s === 'string' ? s : String(s))) : [];
						} catch {
							clinicSpecialties = [];
						}
					}
				}
			}
		}

		// Si no existe perfil, usar valores por defecto (no crear en la base de datos para optimizar)
		// El perfil se creará cuando se haga el primer PATCH
		const profile = medicProfile || {
			specialty: null,
			private_specialty: null,
			signature_url: null,
			photo_url: null,
			services: [],
			service_combos: [],
			credentials: {},
			credit_history: {},
			availability: {},
			notifications: { email: true, whatsapp: false, push: false },
			payment_methods: [],
			whatsapp_number: null,
			whatsapp_message_template: null,
			lite_mode: false,
		};

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
		const notifications = parseJsonField<{ email: boolean; whatsapp: boolean; push: boolean }>(profile?.notifications, { email: true, whatsapp: false, push: false });
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
		// Para consultorios privados, verificar si hay al menos una especialidad (puede ser string o array)
		const privateSpecialtiesArray = Array.isArray(profile?.private_specialty) ? profile.private_specialty : profile?.private_specialty ? [profile.private_specialty] : [];
		const hasSpecialty = isAffiliated ? !!(profile?.specialty && (typeof profile.specialty === 'string' ? profile.specialty.trim().length > 0 : Array.isArray(profile.specialty) && profile.specialty.length > 0)) : privateSpecialtiesArray.length > 0;

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
			clinicProfile: clinicProfile
				? {
						name: clinicProfile.trade_name || clinicProfile.legal_name,
						specialties: clinicSpecialties,
				  }
				: null,
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
				privateSpecialties: (() => {
					const privateSpec = profile?.private_specialty;
					if (!privateSpec) return [];

					// Si es un array, filtrar y retornar
					if (Array.isArray(privateSpec)) {
						return privateSpec.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
					}

					// Si es un string, intentar parsearlo como JSON primero
					if (typeof privateSpec === 'string' && privateSpec.trim().length > 0) {
						const trimmed = privateSpec.trim();
						// Intentar parsear como JSON si parece ser un array JSON
						if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
							try {
								const parsed = JSON.parse(trimmed);
								if (Array.isArray(parsed)) {
									return parsed.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
								}
							} catch {
								// Si falla el parseo, tratarlo como string simple
							}
						}
						// Si no es JSON, tratarlo como string simple
						return [trimmed];
					}

					return [];
				})(),
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
		const { data: appUser, error: userError } = await supabase.from('user').select('id, organizationId, role').eq('authId', user.authId).maybeSingle();

		if (userError) {
			console.error('[Medic Config API PATCH] Error obteniendo usuario de la base de datos:', userError);
			return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
		}

		if (!appUser) {
			console.error('[Medic Config API PATCH] Usuario no encontrado en la tabla User. userId:', user.userId, 'authId:', user.authId, 'email:', user.email);
			return NextResponse.json({ error: 'Usuario no encontrado en el sistema' }, { status: 404 });
		}

		const body = await request.json();

		// Preparar datos para medic_profile
		const profileData: Record<string, unknown> = {};

		if (body.specialty !== undefined) {
			profileData.specialty = body.specialty;
		}

		if (body.privateSpecialty !== undefined) {
			// Aceptar tanto string como array de strings
			let specialtiesArray: string[] = [];

			if (Array.isArray(body.privateSpecialty)) {
				specialtiesArray = body.privateSpecialty.filter((s: any) => s && typeof s === 'string' && s.trim().length > 0);
			} else if (typeof body.privateSpecialty === 'string' && body.privateSpecialty.trim().length > 0) {
				specialtiesArray = [body.privateSpecialty.trim()];
			}

			// Validar que todas las especialidades sean válidas
			for (const specialty of specialtiesArray) {
				if (!isValidPrivateSpecialty(specialty)) {
					return NextResponse.json(
						{
							error: `Especialidad inválida: "${specialty}". Debe ser una de: ${PRIVATE_SPECIALTIES.join(', ')}`,
						},
						{ status: 400 }
					);
				}
			}

			// Guardar como array si hay múltiples, como string si hay una sola, o null si está vacío
			if (specialtiesArray.length === 0) {
				profileData.private_specialty = null;
			} else if (specialtiesArray.length === 1) {
				profileData.private_specialty = specialtiesArray[0];
			} else {
				profileData.private_specialty = specialtiesArray;
			}
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
			profileData.whatsapp_number = body.whatsappNumber && String(body.whatsappNumber).trim().length > 0 ? String(body.whatsappNumber).trim() : null;
		}

		if (body.whatsappMessageTemplate !== undefined) {
			profileData.whatsapp_message_template = body.whatsappMessageTemplate && String(body.whatsappMessageTemplate).trim().length > 0 ? String(body.whatsappMessageTemplate) : null;
		}

		if (body.paymentMethods !== undefined) {
			profileData.payment_methods = body.paymentMethods;
		}

		if (body.liteMode !== undefined) {
			profileData.lite_mode = body.liteMode;
		}

		// Validar que si está afiliado, la especialidad sea de la clínica (solo si se está actualizando specialty)
		if (appUser.organizationId && body.specialty) {
			const { data: clinic } = await supabase.from('clinic_profile').select('specialties').eq('organization_id', appUser.organizationId).maybeSingle();

			if (clinic) {
				let clinicSpecialties: string[] = [];
				try {
					const parsed = Array.isArray(clinic.specialties) ? clinic.specialties : typeof clinic.specialties === 'string' ? JSON.parse(clinic.specialties) : [];
					clinicSpecialties = Array.isArray(parsed) ? parsed.map((s) => (typeof s === 'string' ? s : String(s))) : [];
				} catch {
					clinicSpecialties = [];
				}

				if (!clinicSpecialties.includes(body.specialty)) {
					return NextResponse.json(
						{
							error: 'La especialidad seleccionada no está disponible en esta clínica',
						},
						{ status: 400 }
					);
				}
			}
		}

		// Ejecutar actualizaciones en paralelo para mejorar rendimiento
		const updatePromises: Promise<any>[] = [];

		// Actualizar nombre si se proporciona
		if (body.name !== undefined) {
			updatePromises.push(Promise.resolve(supabase.from('user').update({ name: body.name }).eq('id', appUser.id)).then((r) => r) as unknown as Promise<any>);
		}

		// Usar upsert para actualizar o crear en una sola operación (más eficiente que verificar + insert/update)
		updatePromises.push(
			Promise.resolve(
				supabase.from('medic_profile').upsert(
					{
						doctor_id: appUser.id,
						...profileData,
					},
					{
						onConflict: 'doctor_id',
					}
				)
			).then((r) => r) as unknown as Promise<any>
		);

		// Ejecutar todas las actualizaciones en paralelo
		const updateResults = await Promise.all(updatePromises);

		// Procesar resultados
		const nameUpdateResult = body.name !== undefined ? updateResults[0] : { error: null };
		const profileUpdateResult = body.name !== undefined ? updateResults[1] : updateResults[0];

		if (nameUpdateResult?.error) {
			console.error('[Medic Config API PATCH] Error actualizando nombre:', nameUpdateResult.error);
		}

		if (profileUpdateResult?.error) {
			console.error('[Medic Config API PATCH] Error actualizando perfil:', profileUpdateResult.error);
			return NextResponse.json(
				{
					error: 'Error al actualizar perfil',
					detail: profileUpdateResult.error.message,
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Configuración actualizada correctamente',
		});
	} catch (err) {
		console.error('[Medic Config API PATCH] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}
