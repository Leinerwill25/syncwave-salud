import React from 'react';
import ClinicStats from '@/components/ClinicStats';
import SpecialistsTable from '@/components/SpecialistsTable';
import PatientsList from '@/components/PatientsList';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { tryRestoreSessionFromCookies } from '@/lib/auth-guards';
import { cookies } from 'next/headers';

/**
 * Obtiene organizationId desde la sesión de Supabase
 */
export async function getCurrentOrganizationId(supabase: any): Promise<string | null> {
	try {
		// DEBUG: Listar cookies
		const { cookies } = await import('next/headers');
		const cookieStore = await cookies();
		const allCookies = cookieStore.getAll();
		console.log('[Clinic Dashboard] Available cookies:', allCookies.map(c => c.name));

		// 1. Intentar getUser normal
		let { data: { user }, error: authError } = await supabase.auth.getUser();
		
		// 2. Si falla, intentar restaurar sesión desde cookies legacy/custom
		if (authError || !user) {
			console.warn('[Clinic Dashboard] getUser failed, trying to restore session from cookies...');
			
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			
			if (restored) {
				console.log('[Clinic Dashboard] Session restored from cookies!');
				// Reintentar getUser
				const result = await supabase.auth.getUser();
				user = result.data.user;
				authError = result.error;
			} else {
				console.error('[Clinic Dashboard] Failed to restore session from cookies.');
			}
		}

		if (authError || !user) {
			console.error('[Clinic Dashboard] Final Auth Check Failed:', authError?.message || 'No user');
			return null;
		}

		console.log('[Clinic Dashboard] User authenticated:', user.id);

		// Usamos tabla "User" y buscamos organizationId por authId
		const { data, error } = await supabase
			.from('user')
			.select('organizationId, role, id')
			.eq('authId', user.id)
			.limit(1)
			.maybeSingle();



		if (error) {
			console.warn('[Clinic Dashboard] Supabase error fetching user organizationId:', error);
			return null;
		}
		
		console.log('[Clinic Dashboard] App user found:', data);

		if (!data?.organizationId) {
			console.warn('[Clinic Dashboard] User has no organizationId:', data);
		}
		
		return data?.organizationId ?? null;
	} catch (err) {
		console.error('[Clinic Dashboard] getCurrentOrganizationId exception:', err);
		return null;
	}
}

/**
 * fetchRecentPatientsForOrgViaSupabase
 */
async function fetchRecentPatientsForOrgViaSupabase(supabase: any, organizationId: string, take = 8) {
	try {
		// 1) Obtener todos los pacientes (esto podría optimizarse si hubiera relación directa, pero mantenemos lógica similar)
		// NOTA: Idealmente deberíamos filtrar por organización si hubiera relación directa.
		// Al no haberla directa en el schema inferido, seguimos la lógica de buscar usuarios PACIENTE de la org.
		
		// Obtener users con role = 'PACIENTE' y organizationId = organizationId
		const { data: patientUsers, error: usersErr } = await supabase
			.from('user')
			.select('id, email, organizationId, role, patientProfileId')
			.eq('role', 'PACIENTE')
			.eq('organizationId', organizationId);

		if (usersErr) {
			console.error('Supabase: error fetching Users (role=PACIENTE):', usersErr);
			return [];
		}

		if (!patientUsers || patientUsers.length === 0) {
			return [];
		}

		// Obtener los IDs de perfil de paciente
		const patientProfileIds = patientUsers
			.map((u: { patientProfileId: string | null }) => u.patientProfileId)
			.filter((id: string | null): id is string => id !== null);

		if (patientProfileIds.length === 0) {
			return [];
		}

		// Traer los pacientes que coincidan con esos IDs
		const { data: matchedPatients, error: patientsErr } = await supabase
			.from('patient')
			.select('*')
			.in('id', patientProfileIds)
			.order('createdAt', { ascending: false })
			.limit(take);

		if (patientsErr) {
			console.error('Supabase: error fetching Patient table:', patientsErr);
			return [];
		}

		// Mapear resultados
		const patientToUserMap = new Map();
		patientUsers.forEach((u: { patientProfileId: string | null; id: string; email: string | null; organizationId: string | null; role: string }) => {
			if (u.patientProfileId) patientToUserMap.set(String(u.patientProfileId), u);
		});

		const result = (matchedPatients || []).map((p: any) => {
			const user = patientToUserMap.get(String(p.id));
			return {
				id: p.id,
				firstName: p.firstName ?? p.firstname ?? null,
				lastName: p.lastName ?? p.lastname ?? null,
				createdAt: p.createdAt ?? null,
				organizationId: user?.organizationId ?? null,
				userId: user?.id ?? null,
				email: p.email ?? user?.email ?? null,
			};
		});

		return result;
	} catch (err) {
		console.error('fetchRecentPatientsForOrgViaSupabase error:', err);
		return [];
	}
}

export default async function ClinicDashboardPage() {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return (
			<div className="max-w-6xl mx-auto p-6">
				<div className="bg-white rounded-2xl p-8 shadow">
					<h1 className="text-2xl md:text-3xl font-bold text-slate-800">Resumen de la clínica</h1>
					<p className="mt-3 text-slate-600">
						No se detectó la organización en la sesión. Asegúrate de que el usuario esté autenticado y que su <code>authId</code> esté guardado en la tabla <code>User.authId</code>.
					</p>
				</div>
			</div>
		);
	}

	// Ejecutar consultas en paralelo
	const [
		orgResponse,
		specialistsCountResponse,
		recentSpecialistsResponse,
		recentPatients,
		invitesResponse
	] = await Promise.all([
		supabase.from('organization').select('id, name, type, address, phone, specialistCount, planId, inviteBaseUrl').eq('id', organizationId).single(),
		supabase.from('user').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId).eq('role', 'MEDICO'),
		supabase.from('user').select('id, email, name, createdAt').eq('organizationId', organizationId).eq('role', 'MEDICO').order('createdAt', { ascending: false }).limit(8),
		fetchRecentPatientsForOrgViaSupabase(supabase, organizationId, 8),
		supabase.from('invite').select('id, email, token, role, used, expiresAt, createdAt').eq('organizationId', organizationId).order('createdAt', { ascending: false }).limit(5)
	]);

	const org = orgResponse.data;
	const specialistsCount = specialistsCountResponse.count ?? 0;
	const recentSpecialists = recentSpecialistsResponse.data ?? [];
	const invites = invitesResponse.data ?? [];

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-6">
			<header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-slate-900">{org?.name ?? 'Mi Clínica'}</h1>
					<div className="text-sm text-slate-600 mt-1">{org?.type ?? '—'}</div>
				</div>
				<div className="flex items-center gap-6">
					<div className="text-sm text-slate-700 text-right">
						<div className="text-xs text-slate-500">Especialistas registrados</div>
						<div className="text-xl font-semibold text-slate-900">{specialistsCount}</div>
					</div>
					<div className="text-sm text-slate-700 text-right">
						<div className="text-xs text-slate-500">Plan</div>
						<div className="text-lg font-medium text-slate-800">{org?.planId ?? 'Sin plan'}</div>
					</div>
				</div>
			</header>

			<ClinicStats organization={org} specialistsCount={specialistsCount} recentPatientsCount={recentPatients.length} />

			<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<SpecialistsTable users={recentSpecialists} />

					{/* Pasamos clinicOrganizationId para que el componente UI use el mismo filtro (aunque ya se filtró en servidor) */}
					<PatientsList patients={recentPatients} clinicOrganizationId={organizationId} />
					{/* <InviteList initialInvites={invites} organizationId={organizationId} totalSlots={org?.specialistCount ?? invites.length} /> */}
				</div>

				<aside aria-labelledby="org-details-title" className="space-y-6">
					<div className="relative bg-white/95 border border-slate-200 rounded-2xl p-6 shadow-md max-w-sm">
						<div className="absolute -top-3 left-6 w-20 h-1 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 shadow-sm" aria-hidden />

						<h3 id="org-details-title" className="text-lg font-semibold text-slate-800 mb-1">
							Detalles
						</h3>
						<p className="text-sm text-slate-500 mb-4">Información de contacto y plazas planificadas</p>

						<dl className="grid gap-4 text-sm text-slate-600">
							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Dirección</dt>
								<dd className="mt-1 font-medium text-slate-800 break-words">{org?.address ?? '—'}</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Teléfono</dt>
								<dd className="mt-1 font-medium text-slate-800">{org?.phone ?? '—'}</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-xs text-slate-500">Especialistas planeados</dt>
								<dd className="mt-1 font-medium text-slate-800">{org?.specialistCount ?? 0}</dd>
							</div>

							{org?.inviteBaseUrl && (
								<div className="flex flex-col">
									<dt className="text-xs text-slate-500">Link de invitación</dt>
									<dd className="mt-1 font-medium text-slate-800 break-words">
										<a href={org.inviteBaseUrl} target="_blank" rel="noopener noreferrer" className="inline-block truncate max-w-full text-sm hover:underline" title={org.inviteBaseUrl}>
											{org.inviteBaseUrl}
										</a>
									</dd>
								</div>
							)}
						</dl>

						<div className="mt-4 text-xs text-slate-400">Puedes copiar o abrir el enlace desde la configuración.</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
