// app/api/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
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

/* ---------- Zod Schemas for Validation ---------- */
const AccountSchema = z.object({
	email: z.string().email().max(255),
	fullName: z.string().min(1).max(100),
	password: z.string().min(8).max(100),
	role: z.enum(['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE']).optional(),
});

const OrganizationSchema = z.object({
	orgName: z.string().min(1).max(150),
	orgType: z.string().max(50).nullable().optional(),
	orgAddress: z.string().max(255).nullable().optional(),
	orgPhone: z.string().max(30).nullable().optional(),
	specialistCount: z.union([z.number(), z.string() ]).optional().transform((val: unknown) => {
		const n = Number(val);
		return isNaN(n) ? 1 : Math.max(1, Math.min(n, 1000));
	}),
	sedeCount: z.union([z.number(), z.string()]).optional().transform((val: unknown) => {
		const n = Number(val);
		return isNaN(n) ? 1 : Math.max(1, Math.min(n, 100));
	}),
});

const PatientSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	identifier: z.string().max(50).nullable().optional(),
	dob: z.string().max(20).nullable().optional(),
	gender: z.string().max(20).nullable().optional(),
	phone: z.string().max(30).nullable().optional(),
	address: z.string().max(255).nullable().optional(),
	organizationId: z.string().uuid().nullable().optional(),
	bloodType: z.string().max(5).nullable().optional(),
	hasDisability: z.boolean().nullable().optional(),
	disability: z.string().max(100).nullable().optional(),
	allergies: z.string().max(500).nullable().optional(),
	chronicConditions: z.string().max(500).nullable().optional(),
	currentMedications: z.string().max(500).nullable().optional(),
	insuranceProvider: z.string().max(100).nullable().optional(),
	insuranceNumber: z.string().max(50).nullable().optional(),
	emergencyContactName: z.string().max(100).nullable().optional(),
	emergencyContactPhone: z.string().max(30).nullable().optional(),
	profession: z.string().max(100).nullable().optional(),
});

const PlanSchema = z.object({
	selectedPlan: z.string().max(50).optional(),
	billingPeriod: z.string().max(20).optional(),
	billingMonths: z.number().int().min(1).max(12).optional(),
	billingDiscount: z.number().min(0).max(100).optional(),
	billingTotal: z.number().min(0).optional(),
	requiresQuote: z.boolean().optional(),
	sedeCount: z.number().int().min(1).max(100).optional(),
});

const RegisterSchema = z.object({
	account: AccountSchema,
	organization: OrganizationSchema.nullable().optional(),
	patient: PatientSchema.nullable().optional(),
	plan: PlanSchema.nullable().optional(),
	selectedOrganizationId: z.string().uuid().nullable().optional(),
});

type RegisterBody = z.infer<typeof RegisterSchema>;

/* ---------- Tipos locales ---------- */
export const USER_ROLES = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE'] as const;
export type UserRoleLocal = (typeof USER_ROLES)[number];

const ORG_TYPES = ['CLINICA', 'HOSPITAL', 'CONSULTORIO', 'FARMACIA', 'LABORATORIO'] as const;
type OrgTypeLocal = (typeof ORG_TYPES)[number];

/* ---------- Handler ---------- */
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
	// Variables para rollback de Supabase Auth
	let supabaseCreated = false;
	let supabaseUserId: string | null = null;

	try {
		const parsedJson = await req.json().catch(() => null);
		if (!parsedJson) {
			return NextResponse.json({ ok: false, message: 'Payload inválido' }, { status: 400 });
		}

		const validation = RegisterSchema.safeParse(parsedJson);
		if (!validation.success) {
			return NextResponse.json({ 
				ok: false, 
				message: 'Error de validación', 
				errors: validation.error.errors 
			}, { status: 400 });
		}

		const body = validation.data;
		const { account, organization, patient, plan } = body;

		const roleRaw = account.role ? String(account.role) : 'ADMIN';
		const role: UserRoleLocal = USER_ROLES.includes(roleRaw as UserRoleLocal) ? (roleRaw as UserRoleLocal) : 'ADMIN';

		if (!supabaseAdmin) {
			return NextResponse.json({ ok: false, message: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Prevent duplicates - Email usando Supabase (tabla User según Database.sql)
		// PERMITIR mismo email si tiene rol diferente (ej: DOCTOR puede tener también PACIENTE)
		// Si existe, reutilizar el authId existente en lugar de crear uno nuevo
		const { data: existingUsers, error: userCheckError } = await supabaseAdmin
			.from('users')
			.select('id, email, role, authId')
			.eq('email', account.email);

		if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
			console.error('[Register API] Error verificando email:', userCheckError);
			return NextResponse.json({ ok: false, message: 'Error al verificar el email' }, { status: 500 });
		}

		// Variable para almacenar el authId existente si hay un usuario compatible
		let existingAuthId: string | null = null;
		let shouldReuseAuth = false;

		// Si hay usuarios existentes con el mismo email, verificar si tienen roles diferentes
		if (existingUsers && existingUsers.length > 0) {
			// Roles permitidos para tener el mismo email: DOCTOR/MEDICO puede tener PACIENTE, RECEPCION/RECEPCIONISTA puede tener PACIENTE
			const allowedRoleCombinations: Record<string, string[]> = {
				'MEDICO': ['PACIENTE'],
				'DOCTOR': ['PACIENTE'],
				'RECEPCION': ['PACIENTE'],
				'RECEPCIONISTA': ['PACIENTE'],
				'PACIENTE': ['MEDICO', 'DOCTOR', 'RECEPCION', 'RECEPCIONISTA'],
			};

			const newRoleUpper = role.toUpperCase();
			const existingRoles = existingUsers.map(u => String(u.role || '').toUpperCase()).filter(r => r);

			// Verificar si el nuevo rol es compatible con los roles existentes
			const isCompatible = existingRoles.some(existingRole => {
				// Si el nuevo rol está en la lista de permitidos para el rol existente, o viceversa
				return allowedRoleCombinations[existingRole]?.includes(newRoleUpper) || 
				       allowedRoleCombinations[newRoleUpper]?.includes(existingRole);
			});

			if (!isCompatible) {
				return NextResponse.json({ 
					ok: false, 
					message: `Ya existe un usuario con ese email con rol(es): ${existingRoles.join(', ')}. Solo se permite el mismo email si los roles son compatibles (ej: DOCTOR puede tener también PACIENTE).` 
				}, { status: 409 });
			}

			// Si es compatible, reutilizar el authId del primer usuario existente
			// Todos los usuarios con el mismo email deben tener el mismo authId
			const firstExistingUser = existingUsers.find(u => u.authId);
			if (firstExistingUser && firstExistingUser.authId) {
				existingAuthId = firstExistingUser.authId;
				shouldReuseAuth = true;
				console.log(`[Register API] Reutilizando authId existente ${existingAuthId} para email ${account.email} con nuevo rol ${role}`);
			}
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
			// PERMITIR mismo identifier si tiene rol diferente (ej: DOCTOR puede tener también PACIENTE)
			const { data: existingRegistered, error: registeredCheckError } = await supabaseAdmin
				.from('patient')
				.select('id, identifier, patientProfileId')
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

			if (existingRegistered && existingRegistered.patientProfileId) {
				// Verificar si hay un user asociado a este patient y qué rol tiene
				const { data: existingUserByPatientId } = await supabaseAdmin
					.from('users')
					.select('id, role')
					.eq('patientProfileId', existingRegistered.patientProfileId)
					.maybeSingle();

				if (existingUserByPatientId) {
					// Roles permitidos para tener el mismo identifier: DOCTOR/MEDICO puede tener PACIENTE, RECEPCION/RECEPCIONISTA puede tener PACIENTE
					const allowedRoleCombinations: Record<string, string[]> = {
						'MEDICO': ['PACIENTE'],
						'DOCTOR': ['PACIENTE'],
						'RECEPCION': ['PACIENTE'],
						'RECEPCIONISTA': ['PACIENTE'],
						'PACIENTE': ['MEDICO', 'DOCTOR', 'RECEPCION', 'RECEPCIONISTA'],
					};

					const existingRole = String(existingUserByPatientId.role || '').toUpperCase();
					const newRoleUpper = role.toUpperCase(); // El nuevo usuario será de rol PACIENTE

					// Verificar si el nuevo rol es compatible con el rol existente
					const isCompatible = allowedRoleCombinations[existingRole]?.includes(newRoleUpper) || 
					                     allowedRoleCombinations[newRoleUpper]?.includes(existingRole);

					if (!isCompatible) {
						return NextResponse.json(
							{
								ok: false,
								message: `La cédula de identidad "${identifier}" ya está registrada con rol: ${existingRole}. Solo se permite el mismo identifier si los roles son compatibles (ej: DOCTOR puede tener también PACIENTE).`,
							},
							{ status: 409 }
						);
					}
				} else {
					// Si existe el patient pero no tiene user asociado, permitir el registro
					// (puede ser un paciente no registrado que se está registrando ahora)
				}
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
		// Nota: supabaseUserId y supabaseCreated ya están declarados fuera del try para rollback
		let supabaseUserEmail: string | null = null;

		if (supabaseAdmin) {
			try {
				// Si hay un authId existente compatible, reutilizarlo en lugar de crear uno nuevo
				if (shouldReuseAuth && existingAuthId) {
					supabaseUserId = existingAuthId;
					supabaseUserEmail = account.email;
					supabaseCreated = false; // No creamos uno nuevo, solo reutilizamos
					console.log(`[Register API] Reutilizando usuario de Supabase Auth con ID: ${existingAuthId}`);
				} else {
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
						// Solo si creamos un nuevo usuario (no si reutilizamos uno existente)
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
				// Nota: Supabase puede requerir que los nombres de columnas camelCase se usen tal cual están en la BD
				const { data: orgData, error: orgError } = await supabaseAdmin
					.from('organization')
					.insert({
						name: organization.orgName,
						type: orgTypeCast,
						address: organization.orgAddress ?? null,
						contactEmail: account.email,
						phone: organization.orgPhone ?? null,
						specialistCount: safeNumber(organization.specialistCount) ?? 0,
						sede_count: safeNumber(plan?.sedeCount ?? organization.sedeCount) ?? 1,
						is_custom_quote: plan?.requiresQuote ?? false,
					})
					.select('id, name')
					.single();

				if (orgError) {
					console.error('[Register API] Error creando Organization:', {
						message: orgError.message,
						code: orgError.code,
						details: orgError.details,
						hint: orgError.hint,
					});
					throw new Error(`Error al crear organización: ${orgError.message} (Código: ${orgError.code})`);
				}

				if (!orgData || !orgData.id) {
					console.error('[Register API] Organization creada pero sin ID:', orgData);
					throw new Error('Error al crear organización: No se recibió ID de la organización creada');
				}

				orgRecord = orgData;
				createdIds.push({ type: 'organization', id: orgRecord.id }); // Usar nombre de tabla en minúsculas para rollback
				console.log('[Register API] Organization creada exitosamente:', orgRecord.id);
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
					.from('patient')
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
					console.error('[Register API] Error creando Patient:', {
						message: patientError.message,
						code: patientError.code,
						details: patientError.details,
						hint: patientError.hint,
					});
					// Rollback: eliminar Organization si se creó
					if (orgRecord) {
						await supabaseAdmin.from('organization').delete().eq('id', orgRecord.id);
					}
					throw new Error(`Error al crear paciente: ${patientError.message} (Código: ${patientError.code})`);
				}

				patientRecord = patientData;
				createdIds.push({ type: 'patient', id: patientRecord.id }); // Usar nombre de tabla en minúsculas para rollback
				console.log('[Register API] Patient creado exitosamente:', patientRecord.id);

				// Log para confirmar la vinculación
				if (linkedUnregisteredPatientId) {
					console.log(`[Register API] Paciente creado con ID ${patientRecord.id} vinculado a unregistered_patient_id: ${linkedUnregisteredPatientId}`);
				}

				// Crear FamilyGroup si es plan paciente-family
				if (plan?.selectedPlan === 'paciente-family') {
					// Según Database.sql: FamilyGroup tiene: name, ownerId, maxMembers
					const { error: familyGroupError } = await supabaseAdmin
						.from('familygroup')
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
					.from('organization')
					.select('id')
					.eq('id', referredOrgIdFromForm)
					.maybeSingle();

				if (!orgCheckError && maybeOrg) {
					userCreateData.organizationId = referredOrgIdFromForm;
				}
			}

			if (!userCreateData.organizationId && orgRecord && orgRecord.id) {
				userCreateData.organizationId = orgRecord.id;
				console.log('[Register API] Asignando organizationId al User:', orgRecord.id);
			} else if (!userCreateData.organizationId && orgRecord && !orgRecord.id) {
				console.error('[Register API] ADVERTENCIA: orgRecord existe pero no tiene ID:', orgRecord);
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

			// 4. Verificar si ya existe un User con este email Y este rol específico
			// Si existe, reutilizarlo en lugar de crear uno nuevo
			const { data: existingUserWithRole, error: existingUserCheckError } = await supabaseAdmin
				.from('users')
				.select('id, email, role, authId, organizationId')
				.eq('email', userCreateData.email)
				.eq('role', userCreateData.role)
				.maybeSingle();

			// Verificar si ya existe un usuario con el mismo authId
			// Si existe, no podemos usar ese authId para el nuevo registro (violaría la restricción UNIQUE)
			let authIdToUse: string | null = userCreateData.authId ?? null;
			if (userCreateData.authId) {
				const authIdStr = String(userCreateData.authId);
				const { data: existingUserWithAuthId } = await supabaseAdmin
					.from('users')
					.select('id, email, role')
					.eq('authId', authIdStr)
					.maybeSingle();
				
				if (existingUserWithAuthId) {
					// Ya existe un usuario con este authId, no podemos usarlo para el nuevo registro
					// El nuevo registro tendrá authId como null, ya que el authId ya está asociado a otro registro
					console.log(`[Register API] AuthId ${authIdStr} ya está en uso por usuario ${existingUserWithAuthId.id} (${existingUserWithAuthId.email}, ${existingUserWithAuthId.role}). El nuevo registro tendrá authId null.`);
					authIdToUse = null;
				} else {
					authIdToUse = authIdStr;
				}
			}

			let userData: any = null;
			let userError: any = null;

			if (existingUserWithRole && !existingUserCheckError) {
				// Ya existe un usuario con este email y rol, reutilizarlo
				console.log('[Register API] Usuario ya existe con este email y rol, reutilizando:', existingUserWithRole.id);
				userData = existingUserWithRole;
				
				// Actualizar el authId solo si no tenía uno y ahora lo tenemos Y no está en uso
				if (!userData.authId && authIdToUse) {
					const { error: updateError } = await supabaseAdmin
						.from('users')
						.update({ authId: authIdToUse })
						.eq('id', userData.id);
					
					if (!updateError) {
						userData.authId = authIdToUse;
						console.log('[Register API] AuthId actualizado para usuario existente');
					}
				}
				
				userRecord = userData;
				createdIds.push({ type: 'user', id: userRecord.id });
				console.log('[Register API] Usuario reutilizado exitosamente:', userRecord.id);
			} else {
				// Crear nuevo User
				// Según Database.sql: Users tiene: email, name, passwordHash, role, organizationId, patientProfileId, authId, used
				const userInsertData: any = {
					email: userCreateData.email,
					name: userCreateData.name,
					role: userCreateData.role, // USER-DEFINED type según Database.sql
					organizationId: userCreateData.organizationId ?? null,
					patientProfileId: userCreateData.patientProfileId ?? null,
					authId: authIdToUse, // Usar authIdToUse que puede ser null si ya está en uso
					passwordHash: userCreateData.passwordHash ?? null,
					used: true, // DEFAULT true según Database.sql
				};

				console.log('[Register API] Intentando crear User en tabla "users" con datos:', {
					email: userInsertData.email,
					role: userInsertData.role,
					organizationId: userInsertData.organizationId,
					hasAuthId: !!userInsertData.authId,
					hasPasswordHash: !!userInsertData.passwordHash,
				});

				const { data: createdUserData, error: createError } = await supabaseAdmin
					.from('users')
					.insert(userInsertData)
					.select('id, email, role, authId, organizationId')
					.single();

				userData = createdUserData;
				userError = createError;

				if (userError) {
					console.error('[Register API] Error creando User en tabla "users":', {
						message: userError.message,
						code: userError.code,
						details: userError.details,
						hint: userError.hint,
						data: userInsertData,
					});
					// Rollback: eliminar lo creado
					if (patientRecord) {
						await supabaseAdmin.from('patient').delete().eq('id', patientRecord.id);
					}
					if (orgRecord) {
						await supabaseAdmin.from('organization').delete().eq('id', orgRecord.id);
					}
					throw new Error(`Error al crear usuario: ${userError.message} (Código: ${userError.code})`);
				}

				if (!userData || !userData.id) {
					console.error('[Register API] User creado pero sin ID:', userData);
					// Rollback
					if (patientRecord) {
						await supabaseAdmin.from('patient').delete().eq('id', patientRecord.id);
					}
					if (orgRecord) {
						await supabaseAdmin.from('organization').delete().eq('id', orgRecord.id);
					}
					throw new Error('Error al crear usuario: No se recibió ID del usuario creado');
				}

				userRecord = userData;
				createdIds.push({ type: 'users', id: userRecord.id }); // Usar nombre de tabla correcto para rollback
				console.log('[Register API] User creado exitosamente en tabla "users":', userRecord.id);
			}

			// 5. Crear Subscription si existe plan
			if (plan) {
				const now = new Date();
				// Según Database.sql: Subscription tiene: organizationId, patientId, planId, stripeSubscriptionId, status, startDate, endDate, planSnapshot
				const { data: subData, error: subError } = await supabaseAdmin
					.from('subscription')
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
							requiresQuote: plan.requiresQuote,
							sedeCount: plan.sedeCount,
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
						// Usar nombre de tabla en minúsculas (Supabase requiere nombres de tabla en minúsculas)
						const tableName = type.toLowerCase();
						await supabaseAdmin.from(tableName).delete().eq('id', id);
						console.log(`[Register API] Rollback exitoso de ${tableName} (${id})`);
					} catch (rollbackErr: any) {
						console.error(`[Register API] Error en rollback de ${type} (${id}):`, {
							message: rollbackErr?.message,
							code: rollbackErr?.code,
							details: rollbackErr?.details,
						});
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
					.from('invite')
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

		// Validación final: asegurarse de que userRecord existe y tiene ID
		if (!userRecord || !userRecord.id) {
			console.error('[Register API] ERROR CRÍTICO: userRecord no existe o no tiene ID después de la creación:', {
				userRecord,
				createdIds,
			});
			// Rollback de todo lo creado
			if (createdIds.length > 0 && supabaseAdmin) {
				console.error('[Register API] Haciendo rollback completo debido a userRecord inválido');
				for (const { type, id } of createdIds.reverse()) {
					try {
						const tableName = type.toLowerCase();
						await supabaseAdmin.from(tableName).delete().eq('id', id);
						console.log(`[Register API] Rollback exitoso de ${tableName} (${id})`);
					} catch (rollbackErr: any) {
						console.error(`[Register API] Error en rollback de ${type} (${id}):`, rollbackErr);
					}
				}
			}
			// También eliminar el usuario de Supabase Auth si se creó
			if (supabaseCreated && supabaseUserId && supabaseAdmin) {
				try {
					await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
					console.log('[Register API] Usuario de Supabase Auth eliminado durante rollback');
				} catch (authDeleteErr: any) {
					console.error('[Register API] Error eliminando usuario de Supabase Auth:', authDeleteErr);
				}
			}
			return NextResponse.json(
				{
					ok: false,
					message: 'Error crítico: No se pudo crear el usuario en la base de datos. Por favor, intente nuevamente o contacte al administrador.',
				},
				{ status: 500 }
			);
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
					// Usar nombre de tabla en minúsculas (Supabase requiere nombres de tabla en minúsculas)
					const tableName = type.toLowerCase();
					await supabaseAdmin.from(tableName).delete().eq('id', id);
					console.log(`[Register API] Rollback exitoso de ${tableName} (${id})`);
				} catch (rollbackErr: any) {
					console.error(`[Register API] Error en rollback de ${type} (${id}):`, {
						message: rollbackErr?.message,
						code: rollbackErr?.code,
						details: rollbackErr?.details,
					});
				}
			}
		}
		// También eliminar el usuario de Supabase Auth si se creó
		// Nota: Necesitamos acceder a las variables del scope externo
		// Estas variables están declaradas al inicio de la función
		if (supabaseCreated && supabaseUserId && supabaseAdmin) {
			try {
				await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
				console.log('[Register API] Usuario de Supabase Auth eliminado durante rollback');
			} catch (authDeleteErr: any) {
				console.error('[Register API] Error eliminando usuario de Supabase Auth:', authDeleteErr);
			}
		}
		console.error('[Register API] Error completo:', err);
const isDev = process.env.NODE_ENV === 'development';
		const responseMessage = isDev 
			? (err instanceof Error ? err.message : 'Error interno')
			: 'Ocurrió un error inesperado al procesar el registro. Por favor, intente nuevamente más tarde.';

		return NextResponse.json(
			{
				ok: false,
				message: responseMessage,
				...(isDev && err instanceof Error ? { stack: err.stack, name: err.name } : {}),
			},
			{ status: 500 }
		);
	}
}
