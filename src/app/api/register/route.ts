// app/api/register/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const APP_URL = process.env.APP_URL?.replace(/\/$/, '') ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

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

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		// Basic validation
		if (!body?.account || !body.account.email || !body.account.fullName || !body.account.password) {
			return NextResponse.json({ ok: false, message: 'Payload inválido: falta account info' }, { status: 400 });
		}

		const { account, organization, patient, plan } = body as any;
		const role = (account.role || 'ADMIN') as string;

		// Prevent duplicates
		const existing = await prisma.user.findUnique({ where: { email: account.email } });
		if (existing) {
			return NextResponse.json({ ok: false, message: 'Ya existe un usuario con ese email' }, { status: 409 });
		}

		// Try to create user in Supabase Auth (server-side) if admin client available
		let supabaseUserId: string | null = null;
		let supabaseUserEmail: string | null = null;
		let supabaseCreated = false;

		if (supabaseAdmin) {
			try {
				// supabaseAdmin.auth.admin.createUser returns { data, error } where data may contain 'user'
				const createResp = await supabaseAdmin.auth.admin.createUser({
					email: account.email,
					password: account.password,
					user_metadata: { fullName: account.fullName, role: account.role },
					email_confirm: true,
				});

				if (createResp.error) {
					// Log and continue to fallback (we do not abort immediately so admin can still register locally)
					console.error('Supabase create user error:', createResp.error);
					// fallback will store passwordHash locally below
				} else {
					// try multiple shapes to obtain the user id safely
					const maybeUser = (createResp.data as any)?.user ?? (createResp as any)?.data ?? null;
					// createResp.data may be { user } or might be user directly in older versions
					let userObj: any = null;
					if (maybeUser?.id) {
						userObj = maybeUser; // has .id
					} else if ((createResp as any)?.data?.id) {
						userObj = (createResp as any).data;
					} else if ((createResp as any)?.user?.id) {
						userObj = (createResp as any).user;
					}
					if (userObj && userObj.id) {
						supabaseUserId = userObj.id;
						supabaseUserEmail = userObj.email ?? account.email;
						supabaseCreated = true;
					} else {
						// if can't parse user id, log for debugging and allow fallback
						console.warn('Supabase create user: could not parse returned user id, falling back to local auth. createResp:', createResp);
					}
				}
			} catch (err) {
				console.error('Error calling supabaseAdmin.createUser:', err);
				// We'll fallback to local password hash below
			}
		} else {
			console.warn('supabaseAdmin no disponible; se usará fallback local (passwordHash).');
		}

		// Create DB records inside transaction (kept short)
		const txResult = await prisma.$transaction(
			async (tx: Prisma.TransactionClient) => {
				let orgRecord: any = null;
				let patientRecord: any = null;

				if (organization) {
					orgRecord = await tx.organization.create({
						data: {
							name: organization.orgName,
							type: organization.orgType || 'CLINICA',
							address: organization.orgAddress || null,
							contactEmail: account.email,
							phone: organization.orgPhone || null,
							specialistCount: organization.specialistCount ? Number(organization.specialistCount) : 0,
						},
					});
				}

				if (patient) {
					patientRecord = await tx.patient.create({
						data: {
							firstName: patient.firstName,
							lastName: patient.lastName,
							identifier: patient.identifier || null,
							dob: patient.dob ? new Date(patient.dob) : null,
							gender: patient.gender || null,
							phone: patient.phone || null,
							address: patient.address || null,
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

				// Prepare user data: if supabase user created -> store authId and DO NOT store passwordHash.
				// If supabase not available or failed, hash password and store passwordHash for local auth fallback.
				const userData: any = {
					email: account.email,
					name: account.fullName,
					role: account.role,
					organizationId: orgRecord ? orgRecord.id : undefined,
					patientProfileId: patientRecord ? patientRecord.id : undefined,
				};

				if (supabaseCreated && supabaseUserId) {
					userData.authId = supabaseUserId;
				} else {
					// fallback: hash password and store passwordHash
					const saltRounds = 10;
					const pwdHash = await bcrypt.hash(account.password, saltRounds);
					userData.passwordHash = pwdHash;
				}

				const userRecord = await tx.user.create({
					data: userData,
				});

				let subscriptionRecord: any = null;
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
							patientId: patientRecord ? patientRecord.id : undefined,
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
					},
					organizationId: orgRecord ? orgRecord.id : null,
					organizationName: orgRecord ? orgRecord.name : null,
					patientRecord: patientRecord ? { id: patientRecord.id, firstName: patientRecord.firstName, lastName: patientRecord.lastName } : null,
					subscriptionId: subscriptionRecord ? subscriptionRecord.id : null,
				};
			},
			{ timeout: 10000 }
		);

		// Outside tx: create invites (fast)
		const invitesReturned: Array<{ token: string; url?: string }> = [];
		if (txResult.organizationId) {
			const specialists = Number(organization.specialistCount) || 0;
			if (specialists > 0) {
				const expiresAt = expiryDays(14);
				const invitesData: any[] = [];
				const now = new Date();
				for (let i = 0; i < specialists; i++) {
					const token = genToken();
					invitesData.push({
						organizationId: txResult.organizationId,
						email: '',
						token,
						role: 'MEDICO',
						invitedById: txResult.userRecord.id,
						used: false,
						expiresAt,
						createdAt: now,
					});
					invitesReturned.push({ token, url: APP_URL ? `${APP_URL}/register/accept?token=${token}` : undefined });
				}

				await prisma.invite.createMany({
					data: invitesData.map((d) => ({
						organizationId: d.organizationId,
						email: d.email,
						token: d.token,
						role: d.role as any,
						invitedById: d.invitedById,
						used: d.used,
						expiresAt: d.expiresAt,
						createdAt: d.createdAt,
					})),
					skipDuplicates: true,
				});
			}
		}

		const response = {
			user: txResult.userRecord,
			organization: txResult.organizationId ? { id: txResult.organizationId, name: txResult.organizationName } : null,
			patient: txResult.patientRecord,
			subscriptionId: txResult.subscriptionId,
			invites: invitesReturned,
			supabaseUser: supabaseCreated ? { id: supabaseUserId, email: supabaseUserEmail } : null,
		};

		return NextResponse.json({ ok: true, data: response, nextUrl: null });
	} catch (err: any) {
		console.error('Register error:', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error interno' }, { status: 500 });
	}
}
