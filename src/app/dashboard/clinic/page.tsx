/** @refactored ASHIRA Clinic Dashboard - Main Dashboard Page */
import React from 'react';
import ClinicStats from '@/components/ClinicStats';
import SpecialistsTable from '@/components/SpecialistsTable';
import PatientsList from '@/components/PatientsList';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { tryRestoreSessionFromCookies } from '@/lib/auth-guards';
import { CalendarDays, MapPin, Phone, Users, Crown, Link2, UserPlus } from 'lucide-react';
import Link from 'next/link';

/**
 * Obtiene organizationId desde la sesión de Supabase
 */
export async function getCurrentOrganizationId(supabase: any): Promise<string | null> {
	try {
		const { cookies } = await import('next/headers');
		const cookieStore = await cookies();
		const allCookies = cookieStore.getAll();
		console.log('[Clinic Dashboard] Available cookies:', allCookies.map(c => c.name));

		let { data: { user }, error: authError } = await supabase.auth.getUser();
		
		if (authError || !user) {
			console.warn('[Clinic Dashboard] getUser failed, trying to restore session from cookies...');
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				console.log('[Clinic Dashboard] Session restored from cookies!');
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

		const { data, error } = await supabase
			.from('users')
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
		const { data: patientUsers, error: usersErr } = await supabase
			.from('users')
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

		const patientProfileIds = patientUsers
			.map((u: { patientProfileId: string | null }) => u.patientProfileId)
			.filter((id: string | null): id is string => id !== null);

		if (patientProfileIds.length === 0) {
			return [];
		}

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

function formatDateSpanish(): string {
	const now = new Date();
	return now.toLocaleDateString('es-VE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return 'Buenos días';
	if (hour < 18) return 'Buenas tardes';
	return 'Buenas noches';
}

export default async function ClinicDashboardPage() {
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
					<h1 className="text-2xl font-bold text-slate-900">Resumen de la clínica</h1>
					<p className="mt-3 text-slate-500 leading-relaxed">
						No se detectó la organización en la sesión. Asegúrate de que el usuario esté
						autenticado y que su <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">authId</code> esté
						guardado en la tabla <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">User.authId</code>.
					</p>
				</div>
			</div>
		);
	}

	const [
		orgResponse,
		specialistsCountResponse,
		recentSpecialistsResponse,
		recentPatients,
		invitesResponse
	] = await Promise.all([
		supabase.from('organization').select('id, name, type, address, phone, specialistCount, sede_count, planId, inviteBaseUrl').eq('id', organizationId).single(),
		supabase.from('users').select('*', { count: 'exact', head: true }).eq('organizationId', organizationId).eq('role', 'MEDICO'),
		supabase.from('users').select('id, email, name, createdAt').eq('organizationId', organizationId).eq('role', 'MEDICO').order('createdAt', { ascending: false }).limit(8),
		fetchRecentPatientsForOrgViaSupabase(supabase, organizationId, 8),
		supabase.from('invite').select('id, email, token, role, used, expiresAt, createdAt').eq('organizationId', organizationId).order('createdAt', { ascending: false }).limit(5)
	]);

	const org = orgResponse.data;
	const specialistsCount = specialistsCountResponse.count ?? 0;
	const recentSpecialists = recentSpecialistsResponse.data ?? [];

	return (
		<div className="space-y-8">
			{/* Hero Header */}
			<header className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
					<div>
						<p className="text-sm text-slate-500 mb-1">{getGreeting()}</p>
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
							{org?.name ?? 'Mi Clínica'}
						</h1>
						<div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
							<CalendarDays className="w-4 h-4 text-slate-400" />
							<span className="capitalize">{formatDateSpanish()}</span>
						</div>

						{/* Chips de estado */}
						<div className="flex flex-wrap items-center gap-2 mt-4">
							{org?.type && (
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-xs font-medium text-slate-600 border border-slate-100">
									{org.type}
								</span>
							)}
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-xs font-medium text-sky-700 border border-sky-100">
								<Users className="w-3 h-3" />
								{specialistsCount} especialista{specialistsCount !== 1 ? 's' : ''}
							</span>
							{org?.planId && (
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100">
									<Crown className="w-3 h-3" />
									Plan: {org.planId}
								</span>
							)}
						</div>
					</div>

					<div className="flex gap-3 shrink-0">
						<Link
							href="/dashboard/clinic/invites"
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
						>
							<UserPlus className="w-4 h-4" />
							Invitar especialista
						</Link>
						<Link
							href="/dashboard/clinic/invites"
							className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
						>
							Ver invitaciones
						</Link>
					</div>
				</div>
			</header>

			{/* Stats */}
			<ClinicStats
				organization={org}
				specialistsCount={specialistsCount}
				recentPatientsCount={recentPatients.length}
			/>

			{/* Main Grid: 2/3 + 1/3 */}
			<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<SpecialistsTable users={recentSpecialists} />
					<PatientsList patients={recentPatients} clinicOrganizationId={organizationId} />
				</div>

				{/* Sidebar de detalles */}
				<aside aria-labelledby="org-details-title" className="space-y-5">
					{/* Card de detalles de la org */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-sky-500 to-teal-400" aria-hidden="true" />
							<h3 id="org-details-title" className="text-base font-semibold text-slate-900">
								Detalles de la clínica
							</h3>
						</div>

						<dl className="space-y-4">
							<div className="flex items-start gap-3">
								<MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
								<div>
									<dt className="text-xs text-slate-400 font-medium">Dirección</dt>
									<dd className="text-sm text-slate-700 mt-0.5 break-words">{org?.address ?? '—'}</dd>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
								<div>
									<dt className="text-xs text-slate-400 font-medium">Teléfono</dt>
									<dd className="text-sm text-slate-700 mt-0.5">{org?.phone ?? '—'}</dd>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
								<div>
									<dt className="text-xs text-slate-400 font-medium">Capacidad de especialistas</dt>
									<dd className="text-sm text-slate-700 mt-0.5">{org?.specialistCount ?? 0} máximo</dd>
								</div>
							</div>

							{org?.inviteBaseUrl && (
								<div className="flex items-start gap-3">
									<Link2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
									<div className="min-w-0">
										<dt className="text-xs text-slate-400 font-medium">Link de invitación</dt>
										<dd className="text-sm text-sky-600 mt-0.5 break-all">
											<a href={org.inviteBaseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
												{org.inviteBaseUrl}
											</a>
										</dd>
									</div>
								</div>
							)}
						</dl>
					</div>

					{/* Accesos rápidos */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
							Accesos rápidos
						</h4>
						<div className="flex flex-col gap-2">
							<Link
								href="/dashboard/clinic/settings"
								className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm text-slate-700 transition-colors group"
							>
								<span>Configuración</span>
								<span className="text-slate-300 group-hover:text-slate-500 transition-colors">→</span>
							</Link>
							<Link
								href="/dashboard/clinic/analytics/kpis"
								className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm text-slate-700 transition-colors group"
							>
								<span>KPIs y Analítica</span>
								<span className="text-slate-300 group-hover:text-slate-500 transition-colors">→</span>
							</Link>
							<Link
								href="/dashboard/clinic/profile"
								className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm text-slate-700 transition-colors group"
							>
								<span>Perfil de la clínica</span>
								<span className="text-slate-300 group-hover:text-slate-500 transition-colors">→</span>
							</Link>
						</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
