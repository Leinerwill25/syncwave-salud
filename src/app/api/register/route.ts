// app/api/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client'; // tipos Prisma
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

		// Prevent duplicates - Email
		const existing = await prisma.user.findUnique({ where: { email: account.email } });
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

			// Verificar en pacientes registrados (tabla Patient)
			const existingRegistered = await prisma.patient.findFirst({
				where: { identifier: identifier },
			});

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

		// Tipamos correctamente tx para Prisma
		const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			let orgRecord: any = null;
			if (organization) {
				const orgTypeCast: OrgTypeLocal = organization.orgType && ORG_TYPES.includes(organization.orgType as OrgTypeLocal) ? (organization.orgType as OrgTypeLocal) : 'CLINICA';
				orgRecord = await tx.organization.create({
					data: {
						name: organization.orgName,
						type: orgTypeCast as unknown as any,
						address: organization.orgAddress ?? null,
						contactEmail: account.email,
						phone: organization.orgPhone ?? null,
						specialistCount: safeNumber(organization.specialistCount) ?? 0,
					},
				});
			}

			let patientRecord: any = null;
			if (patient) {
				patientRecord = await tx.patient.create({
					data: {
						firstName: patient.firstName,
						lastName: patient.lastName,
						identifier: patient.identifier ? String(patient.identifier).trim() : null,
						dob: patient.dob ? new Date(patient.dob) : null,
						gender: patient.gender ?? null,
						phone: patient.phone ?? null,
						address: (() => {
							// Si hay coordenadas, guardarlas como JSON en el campo address junto con la dirección
							const locationData: any = { address: patient.address ?? null };
							if ((patient as any).locationLat !== undefined && (patient as any).locationLng !== undefined) {
								locationData.coordinates = {
									lat: (patient as any).locationLat,
									lng: (patient as any).locationLng,
								};
							}
							// Guardar como JSON string si hay coordenadas, sino solo la dirección
							return (patient as any).locationLat !== undefined && (patient as any).locationLng !== undefined ? JSON.stringify(locationData) : patient.address ?? null;
						})(),
						bloodType: patient.bloodType ? String(patient.bloodType).trim() : null,
						hasDisability: patient.hasDisability ?? false,
						disability: patient.hasDisability && patient.disability ? String(patient.disability).trim() : null,
						allergies: patient.allergies ? String(patient.allergies).trim() : null,
						chronicConditions: patient.chronicConditions ? String(patient.chronicConditions).trim() : null,
						currentMedications: patient.currentMedications ? String(patient.currentMedications).trim() : null,
						// Vincular con paciente no registrado si se encontró uno con la misma cédula
						unregisteredPatientId: linkedUnregisteredPatientId ?? null,
					} as Prisma.PatientCreateInput,
				});

				// Log para confirmar la vinculación
				if (linkedUnregisteredPatientId) {
					console.log(`[Register API] Paciente creado con ID ${patientRecord.id} vinculado a unregistered_patient_id: ${linkedUnregisteredPatientId}`);
				}

				if (plan?.selectedPlan === 'paciente-family') {
					await tx.familyGroup.create({
						data: {
							name: `${patient.firstName} ${patient.lastName} - Grupo familiar`,
							ownerId: patientRecord.id,
							maxMembers: 5,
						},
					});
				}
			}

			const userCreateData: {
				email: string;
				name: string | null;
				role: UserRoleLocal;
				organizationId?: string;
				patientProfileId?: string | null;
				authId?: string;
				passwordHash?: string;
			} = { email: account.email, name: account.fullName ?? null, role };

			if (String(role).toUpperCase() === 'PACIENTE' && referredOrgIdFromForm) {
				const maybeOrg = await tx.organization.findUnique({ where: { id: referredOrgIdFromForm } });
				if (maybeOrg) userCreateData.organizationId = referredOrgIdFromForm;
			}

			if (!userCreateData.organizationId && orgRecord) userCreateData.organizationId = orgRecord.id;
			if (patientRecord) userCreateData.patientProfileId = String(patientRecord.id);

			if (supabaseCreated && supabaseUserId) {
				userCreateData.authId = supabaseUserId;
			} else {
				const hashed = await bcrypt.hash(account.password, 10);
				userCreateData.passwordHash = hashed;
			}

			// Al insertar en Prisma, casteamos role para evitar discrepancias de typing en distintos setups de prisma
			const userRecord = await tx.user.create({
				data: {
					email: userCreateData.email,
					name: userCreateData.name,
					// cast seguro para satisfacer al typing de Prisma en diferentes setups
					role: userCreateData.role as unknown as any,
					organizationId: userCreateData.organizationId,
					patientProfileId: userCreateData.patientProfileId,
					authId: userCreateData.authId,
					passwordHash: userCreateData.passwordHash,
				},
			});

			let subscriptionRecord: any = null;
			if (plan) {
				const now = new Date();
				subscriptionRecord = await tx.subscription.create({
					data: {
						organizationId: orgRecord?.id,
						patientId: patientRecord?.id ? String(patientRecord.id) : undefined,
						planId: null,
						stripeSubscriptionId: null,
						status: 'TRIALING',
						startDate: now,
						endDate: addOneMonth(now),
						planSnapshot: {
							selectedPlan: plan.selectedPlan,
							billingPeriod: plan.billingPeriod,
							months: plan.billingMonths,
							discount: plan.billingDiscount,
							total: plan.billingTotal,
						},
					},
				});
			}

			return {
				userRecord: {
					id: userRecord.id,
					email: userRecord.email,
					role: userRecord.role,
					authId: userRecord.authId ?? null,
					organizationId: userRecord.organizationId ?? null,
				},
				organizationId: orgRecord?.id ?? null,
				organizationName: orgRecord?.name ?? null,
				patientRecord: patientRecord ? { id: patientRecord.id, firstName: patientRecord.firstName, lastName: patientRecord.lastName } : null,
				subscriptionId: subscriptionRecord?.id ?? null,
			};
		});

		// Migrar consultas antiguas del paciente no registrado al paciente registrado
		// Esto debe hacerse DESPUÉS de la transacción de Prisma, usando Supabase
		if (role === 'PACIENTE' && linkedUnregisteredPatientId && txResult.patientRecord?.id && supabaseAdmin) {
			try {
				console.log(`[Register API] Migrando consultas de unregistered_patient_id ${linkedUnregisteredPatientId} a patient_id ${txResult.patientRecord.id}`);

				// Actualizar todas las consultas que tienen unregistered_patient_id pero NO tienen patient_id
				const { data: updatedConsultations, error: updateError } = await supabaseAdmin.from('consultation').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null).select('id');

				if (updateError) {
					console.error('[Register API] Error migrando consultas:', updateError);
					// No fallar el registro si la migración falla, pero loguear el error
				} else {
					const migratedCount = updatedConsultations?.length || 0;
					console.log(`[Register API] Migradas ${migratedCount} consultas del paciente no registrado al paciente registrado`);

					// También actualizar appointments, facturacion, prescriptions, lab_results, tasks
					// que tengan unregistered_patient_id pero NO tengan patient_id

					// Appointments
					const { error: appointmentError } = await supabaseAdmin.from('appointment').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (appointmentError) {
						console.error('[Register API] Error migrando appointments:', appointmentError);
					}

					// Facturacion
					const { error: facturacionError } = await supabaseAdmin.from('facturacion').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (facturacionError) {
						console.error('[Register API] Error migrando facturacion:', facturacionError);
					}

					// Prescriptions
					const { error: prescriptionError } = await supabaseAdmin.from('prescription').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (prescriptionError) {
						console.error('[Register API] Error migrando prescriptions:', prescriptionError);
					}

					// Lab Results
					const { error: labResultError } = await supabaseAdmin.from('lab_result').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (labResultError) {
						console.error('[Register API] Error migrando lab_results:', labResultError);
					}

					// Tasks
					const { error: taskError } = await supabaseAdmin.from('task').update({ patient_id: txResult.patientRecord.id }).eq('unregistered_patient_id', linkedUnregisteredPatientId).is('patient_id', null);

					if (taskError) {
						console.error('[Register API] Error migrando tasks:', taskError);
					}
				}
			} catch (migrationErr) {
				console.error('[Register API] Error en proceso de migración de datos:', migrationErr);
				// No fallar el registro si la migración falla
			}
		}

		// Invites (fuera de la transacción)
		const invitesReturned: Array<{ token: string; url?: string }> = [];
		if (txResult.organizationId && organization) {
			const specialists = safeNumber(organization.specialistCount) ?? 0;
			if (specialists > 0) {
				const expiresAt = expiryDays(14);
				const now = new Date();
				const invitesData: InviteCreateManyLocalInput[] = [];

				for (let i = 0; i < specialists; i++) {
					const token = genToken();
					const invitedById = String(txResult.userRecord.id);

					invitesData.push({
						organizationId: txResult.organizationId,
						email: '',
						token,
						role: 'MEDICO',
						invitedById,
						used: false,
						expiresAt,
						createdAt: now,
					});

					invitesReturned.push({
						token,
						url: APP_URL ? `${APP_URL}/register/accept?token=${token}` : undefined,
					});
				}

				// casteo al pasar a prisma.createMany para evitar problemas de typing en compilación
				await prisma.invite.createMany({ data: invitesData as unknown as any, skipDuplicates: true });
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
					userId: txResult.userRecord.id,
					organizationId: txResult.organizationId,
					type: 'WELCOME',
					title: '¡Bienvenido a KAVIRA!',
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
			user: txResult.userRecord,
			organization: txResult.organizationId ? { id: txResult.organizationId, name: txResult.organizationName } : null,
			patient: txResult.patientRecord,
			subscriptionId: txResult.subscriptionId,
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
			organizationId: txResult.organizationId || null,
			userId: txResult.userRecord.id || null,
		});
	} catch (err: unknown) {
		console.error('Register error:', err);
		return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
	}
}
