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
	role: z.enum(['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE', 'LABORATORIO']).optional(),
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
export const USER_ROLES = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE', 'LABORATORIO'] as const;
export type UserRoleLocal = (typeof USER_ROLES)[number];

const ORG_TYPES = ['CLINICA', 'HOSPITAL', 'CONSULTORIO', 'FARMACIA', 'LABORATORIO'] as const;
type OrgTypeLocal = (typeof ORG_TYPES)[number];

async function checkExistingAuth(admin: SupabaseClient, email: string, role: string) {
  const { data: users, error } = await admin.from('users').select('id, email, role, authId').eq('email', email);
  if (error && error.code !== 'PGRST116') throw error;
  if (!users?.length) return { authId: null, reuse: false };

  const roles = users.map((u: any) => String(u.role || '').toUpperCase());
  const newRole = role.toUpperCase();
  const combos: Record<string, string[]> = { 'MEDICO':['PACIENTE'], 'DOCTOR':['PACIENTE'], 'RECEPCION':['PACIENTE'], 'PACIENTE':['MEDICO','DOCTOR','RECEPCION'] };
  
  if (!roles.some((r: string) => combos[r]?.includes(newRole) || combos[newRole]?.includes(r))) {
    throw new Error(`Email ya registrado con roles incompatibles: ${roles.join(', ')}`);
  }
  return { authId: users.find((u: any) => u.authId)?.authId || null, reuse: true };
}

async function migrateData(admin: SupabaseClient, unregId: string, patId: string) {
  const tables = ['consultation', 'appointment', 'facturacion', 'prescription', 'lab_result', 'task'];
  for (const t of tables) {
    try {
      await admin.from(t).update({ patient_id: patId }).eq('unregistered_patient_id', unregId).is('patient_id', null);
    } catch (e: any) {
      console.error(`Migrate fail ${t}:`, e);
    }
  }
}

async function validateIdentifier(admin: SupabaseClient, identifier: string, role: string) {
  if (role !== 'PACIENTE' || !identifier) return null;
  const { data: reg } = await admin.from('patient').select('id, patientProfileId').eq('identifier', identifier).maybeSingle();
  if (reg?.patientProfileId) {
    const { data: user } = await admin.from('users').select('role').eq('patientProfileId', reg.patientProfileId).maybeSingle();
    if (user && !['MEDICO','DOCTOR','RECEPCION'].includes(String(user.role).toUpperCase())) throw new Error(`Cédula ya registrada con rol incompatible: ${user.role}`);
  }
  const { data: unreg } = await admin.from('unregisteredpatients').select('id').eq('identification', identifier).maybeSingle();
  return unreg?.id || null;
}

async function createOrg(admin: SupabaseClient, org: any, plan: any, email: string) {
  const { data, error } = await admin.from('organization').insert({
    name: org.orgName, type: org.orgType || 'CLINICA', address: org.orgAddress, 
    contactEmail: email, phone: org.orgPhone, specialistCount: Number(org.specialistCount) || 0,
    sede_count: Number(plan?.sedeCount || org.sedeCount) || 1, is_custom_quote: !!plan?.requiresQuote
  }).select('id').single();
  if (error) throw error;
  return data;
}

async function createPat(admin: SupabaseClient, pat: any, unregId: string | null) {
  const { data, error } = await admin.from('patient').insert({
    firstName: pat.firstName, lastName: pat.lastName, identifier: pat.identifier,
    dob: pat.dob ? new Date(pat.dob).toISOString() : null, gender: pat.gender, 
    phone: pat.phone, address: pat.address, blood_type: pat.bloodType,
    has_disability: !!pat.hasDisability, disability: pat.disability, 
    allergies: pat.allergies, unregistered_patient_id: unregId, profession: pat.profession
  }).select('id').single();
  if (error) throw error;
  return data;
}

async function createUsr(admin: SupabaseClient, acc: any, role: string, orgId: string | null, patId: string | null, authId: string | null) {
  const { data: existing } = await admin.from('users').select('id, email, role').eq('email', acc.email).eq('role', role).maybeSingle();
  if (existing) return existing;

  let finalAuthId = authId;
  if (authId) {
    const { data: inUse } = await admin.from('users').select('id').eq('authId', authId).maybeSingle();
    if (inUse) finalAuthId = null;
  }

  const { data, error } = await admin.from('users').insert({
    email: acc.email, name: acc.fullName, role, organizationId: orgId,
    patientProfileId: patId, authId: finalAuthId, 
    passwordHash: authId ? null : await bcrypt.hash(acc.password, 10), used: true
  }).select('id, email, role').single();
  if (error) throw error;
  return data;
}

/* ---------- Handler ---------- */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = supabaseAdmin;
  if (!admin) return NextResponse.json({ ok: false, message: 'Server error: Supabase not initialized' }, { status: 500 });
  
  let created: { type: string; id: string }[] = [];
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) return NextResponse.json({ ok: false, message: 'Payload inválido' }, { status: 400 });

    const val = RegisterSchema.safeParse(rawBody);
    if (!val.success) return NextResponse.json({ ok: false, message: 'Error de validación', errors: val.error.issues }, { status: 400 });

    const { account, organization, patient, plan } = val.data;
    const role = (account.role || 'ADMIN') as UserRoleLocal;

    const { authId, reuse } = await checkExistingAuth(admin, account.email, role);
    const unregId = await validateIdentifier(admin, patient?.identifier || '', role);


    // 2. Auth Creation (if needed)
    let finalAuthId = authId;
    if (!reuse) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email, password: account.password,
        user_metadata: { fullName: account.fullName, role }, email_confirm: true
      });
      if (error) throw error;
      finalAuthId = data.user.id;
    }


    // 3. Record Creation (Org, Patient, User)
    let orgRec = null;
    if (organization) {
      orgRec = await createOrg(admin, organization, plan, account.email);
      created.push({ type: 'organization', id: orgRec.id });
    }

    let patRec = null;
    if (patient) {
      patRec = await createPat(admin, patient, unregId);
      created.push({ type: 'patient', id: patRec.id });
    }

    const usrRec = await createUsr(admin, account, role, orgRec?.id, patRec?.id, finalAuthId);
    created.push({ type: 'users', id: usrRec.id });


    // 4. Post-creation (Migration)
    if (unregId && patRec) await migrateData(admin, unregId, patRec.id);

    // 5. Subscription
    if (plan) {
      await admin.from('subscription').insert({
        organizationId: orgRec?.id ?? null,
        patientId: patRec?.id ?? null,
        status: plan.requiresQuote ? 'PENDING_QUOTE' : 'TRIALING',
        startDate: new Date().toISOString(),
        endDate: expiryDays(30).toISOString(),
        planSnapshot: plan
      });
    }

    return NextResponse.json({
      ok: true,
      user: { id: usrRec.id, email: usrRec.email, role: usrRec.role },
      orgId: orgRec?.id,
      patientId: patRec?.id,
      authId: finalAuthId
    });

  } catch (err: any) {
    console.error('[Register API] Critical Error:', err);
    if (created.length > 0) {
      for (const { type, id } of created.reverse()) {
        try {
          await admin.from(type).delete().eq('id', id);
        } catch (e: any) {
          console.error(`Rollback fail ${type}:`, e);
        }
      }
    }
    return NextResponse.json({ ok: false, message: err.message || 'Error interno' }, { status: 500 });
  }
}
