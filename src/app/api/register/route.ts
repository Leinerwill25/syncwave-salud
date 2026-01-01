// app/api/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { createNotification } from '@/lib/notifications';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const APP_URL = process.env.APP_URL?.replace(/\/$/, '') ?? '';

const supabaseAdmin: SupabaseClient | null = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

function genToken(): string {
	return randomUUID();
}

function expiryDays(days = 7): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

function addOneMonth(date = new Date()): Date {
	const d = new Date(date);
	d.setMonth(d.getMonth() + 1);
	return d;
}

/* ---------- Tipos locales ---------- */
export const USER_ROLES = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE'] as const;
export type UserRoleLocal = (typeof USER_ROLES)[number];

const ORG_TYPES = ['CLINICA', 'HOSPITAL', 'CONSULTORIO', 'FARMACIA', 'LABORATORIO'] as const;
type OrgTypeLocal = (typeof ORG_TYPES)[number];

/* ---------- Tipos del body ---------- */
type AccountInput = {
	email: string;
	fullName: string;
	password: string;
	role?: string;
};

type OrganizationInput = {
	orgName: string;
	orgType?: string | null;
	orgAddress?: string | null;
	orgPhone?: string | null;
	specialistCount?: number | string;
};

type PatientInput = {
	firstName: string;
	lastName: string;
	identifier?: string | null;
	dob?: string | null;
	gender?: string | null;
	phone?: string | null;
	address?: string | null;
	organizationId?: string | null;
	bloodType?: string | null;
	hasDisability?: boolean | null;
	disability?: string | null;
	allergies?: string | null;
	chronicConditions?: string | null;
	currentMedications?: string | null;
	insuranceProvider?: string | null;
	insuranceNumber?: string | null;
	emergencyContactName?: string | null;
	emergencyContactPhone?: string | null;
	profession?: string | null;
};

type PlanInput = {
	selectedPlan?: string;
	billingPeriod?: string;
	billingMonths?: number;
	billingDiscount?: number;
	billingTotal?: number;
};

type RegisterBody = {
	account: AccountInput;
	organization?: OrganizationInput | null;
	patient?: PatientInput | null;
	plan?: PlanInput | null;
	selectedOrganizationId?: string | null;
};

/* ---------- Utilidades ---------- */
function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function safeString(v: unknown): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

function safeNumber(v: unknown): number | undefined {
	if (typeof v === 'number') return v;
	if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
	return undefined;
}

function parseSupabaseCreateResp(resp: unknown): { id?: string; email?: string } | null {
	if (!isObject(resp)) return null;
	const r = resp as Record<string, unknown>;
	if (isObject(r.data) && isObject(r.data.user)) {
		const u = r.data.user as Record<string, unknown>;
		return { id: safeString(u.id), email: safeString(u.email) };
	}
	if (isObject(r.user)) {
		const u = r.user as Record<string, unknown>;
		return { id: safeString(u.id), email: safeString(u.email) };
	}
	if (isObject(r.data) && (typeof r.data.id === 'string' || typeof r.data.email === 'string')) {
		const d = r.data as Record<string, unknown>;
		return { id: safeString(d.id), email: safeString(d.email) };
	}
	return null;
}

/* ---------- Tipo local para invites ---------- */
type InviteCreateManyLocalInput = {
	organizationId: string;
	email: string;
	token: string;
	role: UserRoleLocal;
	invitedById: string;
	used: boolean;
	expiresAt: Date;
	createdAt: Date;
};

/* ---------- Handler ---------- */
export async function POST(req: NextRequest): Promise<NextResponse> {
	// Variables para rollback - declaradas fuera del try para que estén disponibles en el catch
	let orgRecord: any = null;
	let patientRecord: any = null;
	let userRecord: any = null;
	let subscriptionRecord: any = null;
	const createdIds: { type: string; id: string }[] = [];

	try {
		const parsed = await req.json().catch(() => null);
		if (!isObject(parsed) || !isObject(parsed.account)) {
			return NextResponse.json({ ok: false, message: 'Payload inválido: falta account info' }, { status: 400 });
		}

		const body = parsed as RegisterBody;
		const { account, organization, patient, plan } = body;
		if (!account.email || !account.fullName || !account.password) {
			return NextResponse.json({ ok: false, message: 'Payload inválido: falta email/fullName/password' }, { status: 400 });
		}

		const roleRaw = account.role ? String(account.role) : 'ADMIN';
		const role: UserRoleLocal = USER_ROLES.includes(roleRaw as UserRoleLocal) ? (roleRaw as UserRoleLocal) : 'ADMIN';

		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, message: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Prevent duplicates - Email usando Supabase (tabla User según Database.sql)
		const { data: existing, error: userCheckError } = await supabaseAdmin
			.from('User')
			.select('id, email')
			.eq('email', account.email)
			.maybeSingle();

		if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
			console.error('[Register API] Error verificando email:', userCheckError);
			return NextResponse.json({ ok: false, message: 'Error al verificar el email' }, { status: 500 });
		}

		if (existing) {
			return NextResponse.json({ ok: false, message: 'Ya existe un usuario con ese email' }, { status: 409 });
		}

		// Variable para almacenar el ID del paciente no registrado si se encuentra
		let linkedUnregisteredPatientId: string | null = null;

		// Validar cédula única ANTES de crear usuario en Supabase (solo para pacientes)
		if (role === 'PACIENTE' && patient && patient.identifier) {
			const identifier = String(patient.identifier).trim();

			if (!identifier || identifier.length === 0) {
				return NextResponse.json(
					{
						ok: false,
						message: 'La cédula de identidad es obligatoria para el registro de pacientes.',
					},
					{ status: 400 }
				);
			}

			// Verificar en pacientes registrados usando Supabase (tabla Patient según Database.sql)
			const { data: existingRegistered, error: registeredCheckError } = await supabaseAdmin
				.from('Patient')
				.select('id, identifier')
				.eq('identifier', identifier)
				.maybeSingle();

			if (registeredCheckError && registeredCheckError.code !== 'PGRST116') {
				console.error('[Register API] Error verificando cédula en Patient:', registeredCheckError);
				return NextResponse.json(
					{
						ok: false,
						message: 'Error al verificar la cédula de identidad. Por favor, intente nuevamente o contacte al administrador.',
					},
					{ status: 500 }
				);
			}

			if (existingRegistered) {
				return NextResponse.json(
					{
						ok: false,
						message: `La cédula de identidad "${identifier}" ya está registrada en el sistema. Por favor, verifique su cédula o contacte al administrador si cree que esto es un error.`,
					},
					{ status: 409 }
				);
			}

			// Verificar en pacientes no registrados usando Supabase
			// Si encontramos uno, lo vinculamos en lugar de rechazar el registro
			if (supabaseAdmin) {
				const { data: existingUnregistered, error: unregisteredCheckError } = await supabaseAdmin.from('unregisteredpatients').select('id, identification').eq('identification', identifier).maybeSingle();

				if (unregisteredCheckError) {
					console.error('Error verificando cédula en unregisteredpatients:', unregisteredCheckError);
					// Si hay error en la verificación, no permitir el registro por seguridad
					return NextResponse.json(
						{
							ok: false,
							message: 'Error al verificar la cédula de identidad. Por favor, intente nuevamente o contacte al administrador.',
						},
						{ status: 500 }
					);
				} else if (existingUnregistered) {
					// En lugar de rechazar, almacenamos el ID para vincular después
					linkedUnregisteredPatientId = existingUnregistered.id;
					console.log(`[Register API] Se encontró paciente no registrado con cédula ${identifier}. Se vinculará al registro nuevo. ID: ${linkedUnregisteredPatientId}`);
				}
			}
		}

		const referredOrgIdFromForm = (patient && isObject(patient) && patient.organizationId ? String(patient.organizationId) : body.selectedOrganizationId ?? null) ?? null;

		// Supabase create user (opcional) - Solo después de validar cédula
		let supabaseUserId: string | null = null;
		let supabaseUserEmail: string | null = null;
		let supabaseCreated = false;

		if (supabaseAdmin) {
			try {
				// Crear usuario sin confirmar email - se enviará verificación automáticamente
				const payload = {
					email: account.email,
					password: account.password,
					user_metadata: { fullName: account.fullName, role: role },
					email_confirm: false, // Cambiar a false para requerir verificación de email
				};
				const createResp = await supabaseAdmin.auth.admin.createUser(payload as unknown as Record<string, unknown>);
				const parsedResp = parseSupabaseCreateResp(createResp);
				if (parsedResp && parsedResp.id) {
					supabaseUserId = parsedResp.id;
					supabaseUserEmail = parsedResp.email ?? account.email;
					supabaseCreated = true;

					// Generar link de verificación y enviarlo por email
					// Cuando se usa admin.createUser, Supabase NO envía el email automáticamente
					// Necesitamos generar el link y enviarlo manualmente
					try {
						const redirectUrl = `${APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/confirm-email`;
						const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
							type: 'signup',
							email: account.email,
							password: account.password,
							options: {
								redirectTo: redirectUrl,
							},
						});

						if (linkError) {
							console.error('Error generando link de verificación:', linkError);
						} else if (linkData?.properties?.action_link) {
							console.log('Link de verificación generado para:', account.email);
							// Enviar el email de confirmación manualmente usando nuestro servicio de email
							// Esto es necesario porque admin.createUser NO envía el email automáticamente
							try {
								const { sendEmail } = await import('@/lib/email');
								const { getEmailConfirmationTemplate } = await import('@/lib/email/templates');
								const { getAppName } = await import('@/lib/email/resend');

								const confirmationLink = linkData.properties.action_link as string;
								const emailHtml = getEmailConfirmationTemplate({
									userName: account.fullName || account.email,
									userEmail: account.email,
									confirmationUrl: confirmationLink,
								});

								const emailResult = await sendEmail({
									to: account.email,
									subject: `Confirma tu email - ${getAppName()}`,
									html: emailHtml,
								});

								if (emailResult.success) {
									console.log('Email de confirmación enviado exitosamente a:', account.email);
								} else {
									console.error('Error enviando email de confirmación:', emailResult.error);
								}
							} catch (emailErr) {
								console.error('Error en proceso de envío de email de confirmación:', emailErr);
							}
						}
					} catch (linkErr) {
						console.error('Error en proceso de generación de link de verificación:', linkErr);
					}
				}
			} catch (err: unknown) {
				console.error('Error calling supabaseAdmin.createUser:', err);
				// No lanzar error aquí para no bloquear el registro si Supabase falla
			}
		}

		// Crear registros usando Supabase directamente (sin transacciones, pero en orden)
		// Nota: Si alguna inserción falla, debemos hacer rollback manual eliminando lo creado
		try {
			// 1. Crear Organization si existe
			if (organization) {
				const orgTypeCast: OrgTypeLocal = organization.orgType && ORG_TYPES.includes(organization.orgType as OrgTypeLocal) ? (organization.orgType as OrgTypeLocal) : 'CLINICA';
				
				// Según Database.sql: Organization tiene campos: name, type, address, contactEmail, phone, specialistCount
				const { data: orgData, error: orgError } = await supabaseAdmin
					.from('Organization')
					.insert({
						name: organization.orgName,
						type: orgTypeCast, // USER-DEFINED type según Database.sql
						address: organization.orgAddress ?? null,
						contactEmail: account.email,
						phone: organization.orgPhone ?? null,
						specialistCount: safeNumber(organization.specialistCount) ?? 0,
					})
					.select('id, name')
					.single();

				if (orgError) {
					console.error('[Register API] Error creando Organization:', orgError);
					throw new Error(`Error al crear organización: ${orgError.message}`);
				}

				orgRecord = orgData;
				createdIds.push({ type: 'Organization', id: orgRecord.id });
			}

			// 2. Crear Patient si existe
			if (patient) {
				// Según Database.sql: Patient tiene campos: firstName, lastName, identifier, dob, gender, phone, address, 
				// blood_type, allergies, has_disability, disability, unregistered_patient_id, profession
				// Nota: Database.sql usa camelCase para algunos campos (firstName, lastName) pero snake_case para otros
				const addressValue = (() => {
					const locationData: any = { address: patient.address ?? null };
					if ((patient as any).locationLat !== undefined && (patient as any).locationLng !== undefined) {
						locationData.coordinates = {
							lat: (patient as any).locationLat,
							lng: (patient as any).locationLng,
						};
					}
					return (patient as any).locationLat !== undefined && (patient as any).locationLng !== undefined ? JSON.stringify(locationData) : patient.address ?? null;
				})();

				const { data: patientData, error: patientError } = await supabaseAdmin
					.from('Patient')
					.insert({
						firstName: patient.firstName,
						lastName: patient.lastName,
						identifier: patient.identifier ? String(patient.identifier).trim() : null,
						dob: patient.dob ? new Date(patient.dob).toISOString() : null,
						gender: patient.gender ?? null,
						phone: patient.phone ?? null,
						address: addressValue,
						blood_type: patient.bloodType ? String(patient.bloodType).trim() : null,
						has_disability: patient.hasDisability ?? false,
						disability: patient.hasDisability && patient.disability ? String(patient.disability).trim() : null,
						allergies: patient.allergies ? String(patient.allergies).trim() : null,
						unregistered_patient_id: linkedUnregisteredPatientId ?? null,
						profession: patient.profession ?? null,
						// Nota: chronicConditions y currentMedications no están en Database.sql como campos directos
						// Se pueden guardar en allergies o crear campos adicionales si es necesario
					})
					.select('id, firstName, lastName')
					.single();

				if (patientError) {
					console.error('[Register API] Error creando Patient:', patientError);
					// Rollback: eliminar Organization si se creó
					if (orgRecord) {
						await supabaseAdmin.from('Organization').delete().eq('id', orgRecord.id);
					}
					throw new Error(`Error al crear paciente: ${patientError.message}`);
				}

				patientRecord = patientData;
				createdIds.push({ type: 'Patient', id: patientRecord.id });

				// Log para confirmar la vinculación
				if (linkedUnregisteredPatientId) {
					console.log(`[Register API] Paciente creado con ID ${patientRecord.id} vinculado a unregistered_patient_id: ${linkedUnregisteredPatientId}`);
				}

				// Crear FamilyGroup si es plan paciente-family
				if (plan?.selectedPlan === 'paciente-family') {
					// Según Database.sql: FamilyGroup tiene: name, ownerId, maxMembers
					const { error: familyGroupError } = await supabaseAdmin
						.from('FamilyGroup')
						.insert({
							name: `${patient.firstName} ${patient.lastName} - Grupo familiar`,
							ownerId: patientRecord.id,
							maxMembers: 5,
						});

					if (familyGroupError) {
						console.error('[Register API] Error creando FamilyGroup:', familyGroupError);
						// No fallar el registro si FamilyGroup falla
					}
				}
			}

			// 3. Preparar datos de User
			const userCreateData: {
				email: string;
				name: string | null;
				role: string;
				organizationId?: string | null;
				patientProfileId?: string | null;
				authId?: string | null;
				passwordHash?: string | null;
			} = { 
				email: account.email, 
				name: account.fullName ?? null, 
				role: role,
				organizationId: null,
				patientProfileId: null,
				authId: null,
				passwordHash: null,
			};

			// Verificar organizationId si es paciente con referredOrgId
			if (String(role).toUpperCase() === 'PACIENTE' && referredOrgIdFromForm) {
				const { data: maybeOrg, error: orgCheckError } = await supabaseAdmin
					.from('Organization')
					.select('id')
					.eq('id', referredOrgIdFromForm)
					.maybeSingle();

				if (!orgCheckError && maybeOrg) {
					userCreateData.organizationId = referredOrgIdFromForm;
				}
			}

			if (!userCreateData.organizationId && orgRecord) {
				userCreateData.organizationId = orgRecord.id;
			}
			if (patientRecord) {
				userCreateData.patientProfileId = patientRecord.id;
			}

			if (supabaseCreated && supabaseUserId) {
				userCreateData.authId = supabaseUserId;
			} else {
				const hashed = await bcrypt.hash(account.password, 10);
				userCreateData.passwordHash = hashed;
			}

			// 4. Crear User
			// Según Database.sql: User tiene: email, name, passwordHash, role, organizationId, patientProfileId, authId, used
			const { data: userData, error: userError } = await supabaseAdmin
				.from('User')
				.insert({
					email: userCreateData.email,
					name: userCreateData.name,
					role: userCreateData.role, // USER-DEFINED type según Database.sql
					organizationId: userCreateData.organizationId ?? null,
					patientProfileId: userCreateData.patientProfileId ?? null,
					authId: userCreateData.authId ?? null,
					passwordHash: userCreateData.passwordHash ?? null,
					used: true, // DEFAULT true según Database.sql
				})
				.select('id, email, role, authId, organizationId')
				.single();

			if (userError) {
				console.error('[Register API] Error creando User:', userError);
				// Rollback: eliminar lo creado
				if (patientRecord) {
					await supabaseAdmin.from('Patient').delete().eq('id', patientRecord.id);
				}
				if (orgRecord) {
					await supabaseAdmin.from('Organization').delete().eq('id', orgRecord.id);
				}
				throw new Error(`Error al crear usuario: ${userError.message}`);
			}

			userRecord = userData;
			createdIds.push({ type: 'User', id: userRecord.id });

			// 5. Crear Subscription si existe plan
			if (plan) {
				const now = new Date();
				// Según Database.sql: Subscription tiene: organizationId, patientId, planId, stripeSubscriptionId, status, startDate, endDate, planSnapshot
				const { data: subData, error: subError } = await supabaseAdmin
					.from('Subscription')
					.insert({
						organizationId: orgRecord?.id ?? null,
						patientId: patientRecord?.id ?? null,
						planId: null,
						stripeSubscriptionId: null,
						status: 'TRIALING', // USER-DEFINED type según Database.sql
						startDate: now.toISOString(),
						endDate: addOneMonth(now).toISOString(),
						planSnapshot: {
							selectedPlan: plan.selectedPlan,
							billingPeriod: plan.billingPeriod,
							months: plan.billingMonths,
							discount: plan.billingDiscount,
							total: plan.billingTotal,
						},
					})
					.select('id')
					.single();

				if (subError) {
					console.error('[Register API] Error creando Subscription:', subError);
					// No fallar el registro si Subscription falla, pero loguear
				} else {
					subscriptionRecord = subData;
				}
			}

		} catch (createError: unknown) {
			// Rollback manual: eliminar lo que se haya creado
			if (createdIds.length > 0 && supabaseAdmin) {
				console.error('[Register API] Error durante creación de registros, haciendo rollback de:', createdIds);
				for (const { type, id } of createdIds.reverse()) {
					try {
						await supabaseAdmin.from(type).delete().eq('id', id);
					} catch (rollbackErr) {
						console.error(`[Register API] Error en rollback de ${type} (${id}):`, rollbackErr);
					}
				}
			}
			throw createError;
		}

		// Migrar consultas antiguas del paciente no registrado al paciente registrado
		// Esto debe hacerse DESPUÉS de crear los registros, usando Supabase
		if (role === 'PACIENTE' && linkedUnregisteredPatientId && patientRecord?.id && supabaseAdmin) {
			try {
				console.log(`[Register API] Migrando consultas de unregistered_patient_id ${linkedUnregisteredPatientId} a patient_id ${patientRecord.id}`);

				// Actualizar todas las consultas que tienen unregistered_patient_id pero NO tienen patient_id
				const { data: updatedConsultations, error: updateError } = await supabaseAdmin.from('consultation').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null).select('id');

				if (updateError) {
					console.error('[Register API] Error migrando consultas:', updateError);
					// No fallar el registro si la migración falla, pero loguear el error
				} else {
					const migratedCount = updatedConsultations?.length || 0;
					console.log(`[Register API] Migradas ${migratedCount} consultas del paciente no registrado al paciente registrado`);

					// También actualizar appointments, facturacion, prescriptions, lab_results, tasks
					// que tengan unregistered_patient_id pero NO tengan patient_id

					// Appointments
					const { error: appointmentError } = await supabaseAdmin.from('appointment').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (appointmentError) {
						console.error('[Register API] Error migrando appointments:', appointmentError);
					}

					// Facturacion
					const { error: facturacionError } = await supabaseAdmin.from('facturacion').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (facturacionError) {
						console.error('[Register API] Error migrando facturacion:', facturacionError);
					}

					// Prescriptions
					const { error: prescriptionError } = await supabaseAdmin.from('prescription').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (prescriptionError) {
						console.error('[Register API] Error migrando prescriptions:', prescriptionError);
					}

					// Lab Results
					const { error: labResultError } = await supabaseAdmin.from('lab_result').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (labResultError) {
						console.error('[Register API] Error migrando lab_results:', labResultError);
					}

					// Tasks
					const { error: taskError } = await supabaseAdmin.from('task').update({ patient_id: patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (taskError) {
						console.error('[Register API] Error migrando tasks:', taskError);
					}
				}
			} catch (migrationErr) {
				console.error('[Register API] Error en proceso de migración de datos:', migrationErr);
				// No fallar el registro si la migración falla
			}
		}

		// Invites (crear usando Supabase)
		const invitesReturned: Array<{ token: string; url?: string }> = [];
		if (orgRecord?.id && organization) {
			const specialists = safeNumber(organization.specialistCount) ?? 0;
			if (specialists > 0) {
				const expiresAt = expiryDays(14);
				const now = new Date();
				// Según Database.sql: Invite tiene: organizationId, email, token, role, invitedById, used, expiresAt, createdAt
				const invitesData: Array<{
					organizationId: string;
					email: string | null;
					token: string;
					role: string;
					invitedById: string;
					used: boolean;
					expiresAt: string;
					createdAt: string;
				}> = [];

				for (let i = 0; i < specialists; i++) {
					const token = genToken();
					const invitedById = userRecord.id;

					invitesData.push({
						organizationId: orgRecord.id,
						email: null, // email vacío según el código original
						token,
						role: 'MEDICO', // USER-DEFINED type según Database.sql
						invitedById,
						used: false,
						expiresAt: expiresAt.toISOString(),
						createdAt: now.toISOString(),
					});

					invitesReturned.push({
						token,
						url: APP_URL ? `${APP_URL}/register/accept?token=${token}` : undefined,
					});
				}

				// Insertar invites usando Supabase
				const { error: invitesError } = await supabaseAdmin
					.from('Invite')
					.insert(invitesData);

				if (invitesError) {
					console.error('[Register API] Error creando Invites:', invitesError);
					// No fallar el registro si los invites fallan
				}
			}
		}

		// Enviar email de bienvenida SOLO si el email ya está confirmado
		// Si requiere confirmación, Supabase enviará el email de confirmación automáticamente
		// y el email de bienvenida se enviará después de la confirmación
		if (!supabaseCreated) {
			// Si no se creó en Supabase (no requiere confirmación), enviar email de bienvenida
			try {
				const loginUrl = APP_URL ? `${APP_URL}/login` : undefined;
				await createNotification({
					userId: userRecord.id,
					organizationId: orgRecord?.id ?? null,
					type: 'WELCOME',
					title: '¡Bienvenido a ASHIRA!',
					message: `Tu cuenta ha sido creada exitosamente. Bienvenido, ${account.fullName || account.email}!`,
					payload: {
						userName: account.fullName || account.email,
						userEmail: account.email,
						loginUrl,
					},
					sendEmail: true,
				});
			} catch (emailErr) {
				// No fallar el registro si el email falla
				console.error('[Register] Error enviando email de bienvenida:', emailErr);
			}
		}
		// Si supabaseCreated es true, NO enviar email de bienvenida aquí
		// El email de confirmación de Supabase ya se envió automáticamente
		// El email de bienvenida se puede enviar después de la confirmación si es necesario

		const responsePayload = {
			user: {
				id: userRecord.id,
				email: userRecord.email,
				role: userRecord.role,
				authId: userRecord.authId ?? null,
				organizationId: userRecord.organizationId ?? null,
			},
			organization: orgRecord?.id ? { id: orgRecord.id, name: orgRecord.name } : null,
			patient: patientRecord ? { id: patientRecord.id, firstName: patientRecord.firstName, lastName: patientRecord.lastName } : null,
			subscriptionId: subscriptionRecord?.id ?? null,
			invites: invitesReturned,
			supabaseUser: supabaseCreated ? { id: supabaseUserId, email: supabaseUserEmail } : null,
		};

		// Mensaje sobre verificación de email
		let emailVerificationMessage = supabaseCreated ? 'Se ha enviado un correo electrónico de verificación a tu dirección de email. Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de verificación para activar tu cuenta. Es importante que tengas acceso a este correo electrónico.' : null;

		// Mensaje adicional si se vinculó con un paciente no registrado
		if (linkedUnregisteredPatientId && role === 'PACIENTE') {
			const historyMessage = '¡Bienvenido! Hemos encontrado un historial médico previo asociado a tu cédula. Todas tus consultas anteriores ahora estarán disponibles en tu cuenta.';
			emailVerificationMessage = emailVerificationMessage ? `${emailVerificationMessage}\n\n${historyMessage}` : historyMessage;
		}

		return NextResponse.json({
			ok: true,
			data: responsePayload,
			nextUrl: null,
			emailVerificationRequired: supabaseCreated,
			hasLinkedHistory: linkedUnregisteredPatientId !== null,
			message: emailVerificationMessage || 'Registro exitoso',
			// Incluir datos para pago si es necesario (MEDICO o ADMIN con organización)
			organizationId: orgRecord?.id ?? null,
			userId: userRecord.id ?? null,
		});
	} catch (err: unknown) {
		// Rollback manual: eliminar lo que se haya creado
		if (createdIds.length > 0 && supabaseAdmin) {
			console.error('[Register API] Error durante registro, haciendo rollback de:', createdIds);
			for (const { type, id } of createdIds.reverse()) {
				try {
					await supabaseAdmin.from(type).delete().eq('id', id);
				} catch (rollbackErr) {
					console.error(`[Register API] Error en rollback de ${type} (${id}):`, rollbackErr);
				}
			}
		}
		console.error('Register error:', err);
		return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
	}
}
