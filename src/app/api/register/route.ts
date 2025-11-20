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

		// Prevent duplicates
		const existing = await prisma.user.findUnique({ where: { email: account.email } });
		if (existing) {
			return NextResponse.json({ ok: false, message: 'Ya existe un usuario con ese email' }, { status: 409 });
		}

		// Supabase create user (opcional)
		let supabaseUserId: string | null = null;
		let supabaseUserEmail: string | null = null;
		let supabaseCreated = false;

		if (supabaseAdmin) {
			try {
				const payload = {
					email: account.email,
					password: account.password,
					user_metadata: { fullName: account.fullName, role: roleRaw },
					email_confirm: true,
				};
				const createResp = await supabaseAdmin.auth.admin.createUser(payload as unknown as Record<string, unknown>);
				const parsedResp = parseSupabaseCreateResp(createResp);
				if (parsedResp && parsedResp.id) {
					supabaseUserId = parsedResp.id;
					supabaseUserEmail = parsedResp.email ?? account.email;
					supabaseCreated = true;
				}
			} catch (err: unknown) {
				console.error('Error calling supabaseAdmin.createUser:', err);
			}
		}

		const referredOrgIdFromForm = (patient && isObject(patient) && patient.organizationId ? String(patient.organizationId) : body.selectedOrganizationId ?? null) ?? null;

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
						identifier: patient.identifier ?? null,
						dob: patient.dob ? new Date(patient.dob) : null,
						gender: patient.gender ?? null,
						phone: patient.phone ?? null,
						address: patient.address ?? null,
					},
				});

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

		// Enviar email de bienvenida
		try {
			const loginUrl = APP_URL ? `${APP_URL}/login` : undefined;
			await createNotification({
				userId: txResult.userRecord.id,
				organizationId: txResult.organizationId,
				type: 'WELCOME',
				title: '¡Bienvenido a SyncWave Salud!',
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

		const responsePayload = {
			user: txResult.userRecord,
			organization: txResult.organizationId ? { id: txResult.organizationId, name: txResult.organizationName } : null,
			patient: txResult.patientRecord,
			subscriptionId: txResult.subscriptionId,
			invites: invitesReturned,
			supabaseUser: supabaseCreated ? { id: supabaseUserId, email: supabaseUserEmail } : null,
		};

		return NextResponse.json({ ok: true, data: responsePayload, nextUrl: null });
	} catch (err: unknown) {
		console.error('Register error:', err);
		return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
	}
}
