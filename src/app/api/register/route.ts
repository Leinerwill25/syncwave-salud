// app/api/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Prisma, OrgType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

/* ---------- Tipos ---------- */
type AccountInput = {
	email: string;
	fullName: string;
	password: string;
	role?: string;
};

type OrganizationInput = {
	orgName: string;
	orgType?: string;
	orgAddress?: string | null;
	orgPhone?: string | null;
	specialistCount?: number | string;
};

type PatientInput = {
	firstName: string;
	lastName: string;
	identifier?: string | null;
	dob?: string | null; // ISO date string expected
	gender?: string | null;
	phone?: string | null;
	address?: string | null;
	organizationId?: string | null; // coming from the form (not stored on Patient table)
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

/* ---------- Utilidades de tipo ---------- */
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
		// casteo a UserRole — asumimos que el valor enviado coincide con el enum en tu schema.
		const role = roleRaw as unknown as UserRole;

		// Prevent duplicates
		const existing = await prisma.user.findUnique({ where: { email: account.email } });
		if (existing) {
			return NextResponse.json({ ok: false, message: 'Ya existe un usuario con ese email' }, { status: 409 });
		}

		// Intentar crear usuario en Supabase (admin) si está disponible
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
				} else {
					console.warn('Supabase create user: could not parse returned user id. Response:', createResp);
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error('Error calling supabaseAdmin.createUser:', err.message);
				} else {
					console.error('Unknown error calling supabaseAdmin.createUser:', err);
				}
			}
		} else {
			console.warn('supabaseAdmin no disponible; se usará fallback local (passwordHash).');
		}

		const referredOrgIdFromForm = (patient && isObject(patient) && patient.organizationId ? String(patient.organizationId) : body.selectedOrganizationId ?? null) ?? null;

		// Transaction: crear registros
		const txResult = await prisma.$transaction(
			async (tx: Prisma.TransactionClient) => {
				// Org
				let orgRecord: Awaited<ReturnType<typeof tx.organization.create>> | null = null;
				if (organization) {
					// Convertimos orgType al enum OrgType
					const orgTypeCast = organization.orgType ? (organization.orgType as unknown as OrgType) : ('CLINICA' as OrgType);
					orgRecord = await tx.organization.create({
						data: {
							name: organization.orgName,
							type: orgTypeCast,
							address: organization.orgAddress ?? null,
							contactEmail: account.email,
							phone: organization.orgPhone ?? null,
							specialistCount: safeNumber(organization.specialistCount) ?? 0,
						},
					});
				}

				// Patient
				let patientRecord: Awaited<ReturnType<typeof tx.patient.create>> | null = null;
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

				// Preparar user payload
				const userCreateData: {
					email: string;
					name: string | null;
					role: UserRole;
					organizationId?: string | undefined;
					patientProfileId?: string | null | undefined;
					authId?: string | undefined;
					passwordHash?: string | undefined;
				} = {
					email: account.email,
					name: account.fullName ?? null,
					role,
				};

				// PRIORIDAD para organizationId
				if (String(role).toUpperCase() === 'PACIENTE' && referredOrgIdFromForm) {
					try {
						const maybeOrg = await tx.organization.findUnique({ where: { id: referredOrgIdFromForm } });
						if (maybeOrg) {
							userCreateData.organizationId = referredOrgIdFromForm;
						}
					} catch (err: unknown) {
						if (err instanceof Error) {
							console.error('Error validando organizationId en tx:', err.message);
						} else {
							console.error('Unknown error validando organizationId en tx:', err);
						}
					}
				}

				if (!userCreateData.organizationId && orgRecord) {
					userCreateData.organizationId = orgRecord.id;
				}

				if (patientRecord) {
					// Convertimos id a string (tu schema usa string UUID)
					userCreateData.patientProfileId = String(patientRecord.id);
				}

				// Auth / password
				if (supabaseCreated && supabaseUserId) {
					userCreateData.authId = supabaseUserId;
				} else {
					const saltRounds = 10;
					const hashed = await bcrypt.hash(account.password, saltRounds);
					userCreateData.passwordHash = hashed;
				}

				const userRecord = await tx.user.create({
					data: {
						email: userCreateData.email,
						name: userCreateData.name,
						role: userCreateData.role,
						organizationId: userCreateData.organizationId,
						patientProfileId: userCreateData.patientProfileId,
						authId: userCreateData.authId,
						passwordHash: userCreateData.passwordHash,
					},
				});

				// Subscription
				let subscriptionRecord: Awaited<ReturnType<typeof tx.subscription.create>> | null = null;
				if (plan) {
					const planSnapshot = {
						selectedPlan: plan.selectedPlan,
						billingPeriod: plan.billingPeriod,
						months: plan.billingMonths,
						discount: plan.billingDiscount,
						total: plan.billingTotal,
					};
					const now = new Date();
					const trialEnd = addOneMonth(now);
					subscriptionRecord = await tx.subscription.create({
						data: {
							organizationId: orgRecord ? orgRecord.id : undefined,
							// Convertimos patientRecord.id a string si existe (Prisma espera string)
							patientId: patientRecord ? String(patientRecord.id) : undefined,
							planId: null,
							stripeSubscriptionId: null,
							status: 'TRIALING',
							startDate: now,
							endDate: trialEnd,
							planSnapshot,
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
					organizationId: orgRecord ? orgRecord.id : null,
					organizationName: orgRecord ? orgRecord.name : null,
					patientRecord: patientRecord ? { id: patientRecord.id, firstName: patientRecord.firstName, lastName: patientRecord.lastName } : null,
					subscriptionId: subscriptionRecord ? subscriptionRecord.id : null,
				};
			},
			{ timeout: 10000 }
		);

		// Outside transaction: invites
		const invitesReturned: Array<{ token: string; url?: string }> = [];
		if (txResult.organizationId && organization) {
			const specialists = safeNumber(organization.specialistCount) ?? 0;
			if (specialists > 0) {
				const expiresAt = expiryDays(14);
				// Usamos el tipo de Prisma para createMany
				const invitesData: Prisma.InviteCreateManyInput[] = [];

				const now = new Date();
				for (let i = 0; i < specialists; i += 1) {
					const token = genToken();
					// Garantizamos que invitedById sea string (tu schema espera string UUID)
					const invitedById = String(txResult.userRecord.id);

					invitesData.push({
						organizationId: txResult.organizationId,
						email: '',
						token,
						role: 'MEDICO' as unknown as UserRole,
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

				await prisma.invite.createMany({
					data: invitesData,
					skipDuplicates: true,
				});
			}
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
		if (err instanceof Error) {
			console.error('Register error:', err.message);
			return NextResponse.json({ ok: false, message: err.message || 'Error interno' }, { status: 500 });
		}
		console.error('Register error (unknown):', err);
		return NextResponse.json({ ok: false, message: 'Error interno' }, { status: 500 });
	}
}
