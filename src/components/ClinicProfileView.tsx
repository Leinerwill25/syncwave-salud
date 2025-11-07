// components/ClinicProfileCard.tsx
'use client';

import { useEffect, useState } from 'react';

type RawProfile = {
	id: string;
	organizationId: string;
	legalRif?: string | null;
	legalName?: string | null;
	tradeName?: string | null;
	entityType?: string | null;
	addressFiscal?: string | null;
	addressOperational?: string | null;
	stateProvince?: string | null;
	cityMunicipality?: string | null;
	postalCode?: string | null;
	phoneFixed?: string | null;
	phoneMobile?: string | null;
	contactEmail?: string | null;
	website?: string | null;
	socialFacebook?: string | null;
	socialInstagram?: string | null;
	socialLinkedin?: string | null;
	officesCount?: number | null;
	specialties?: any; // json
	openingHours?: any; // json
	capacityPerDay?: number | null;
	employeesCount?: number | null;
	directorName?: string | null;
	adminName?: string | null;
	directorIdNumber?: string | null;
	sanitaryLicense?: string | null;
	liabilityInsuranceNumber?: string | null;
	bankName?: string | null;
	bankAccountType?: string | null;
	bankAccountNumber?: string | null;
	bankAccountOwner?: string | null;
	currency?: string | null;
	paymentMethods?: any; // json
	billingSeries?: string | null;
	taxRegime?: string | null;
	billingAddress?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

function safeParseArrayField(v: any): any[] {
	if (v == null) return [];
	if (Array.isArray(v)) return v;
	if (typeof v === 'string') {
		try {
			const p = JSON.parse(v);
			return Array.isArray(p) ? p : [];
		} catch {
			return [];
		}
	}
	// if it's json object representing items, try to wrap or return empty
	return Array.isArray(v) ? v : [];
}

function showOrNot<T = unknown>(val: T | null | undefined, placeholder = 'No ha sido registrado') {
	if (val === undefined || val === null) return placeholder;
	if (typeof val === 'string' && val.trim() === '') return placeholder;
	return val;
}

/** Small icons */
function IconPhone() {
	return (
		<svg className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M22 16.92V21a1 1 0 0 1-1.1 1 19 19 0 0 1-8.63-3.07 19 19 0 0 1-6-6A19 19 0 0 1 2 3.1 1 1 0 0 1 3 2h4.09a1 1 0 0 1 1 .76c.12.68.36 1.98.74 3.38a1 1 0 0 1-.24 1L7.5 9.5a16 16 0 0 0 6 6l1.36-1.36a1 1 0 0 1 1-.24c1.4.38 2.7.62 3.38.74a1 1 0 0 1 .76 1V21z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
		</svg>
	);
}
function IconMail() {
	return (
		<svg className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M3 8.5v7A2.5 2.5 0 0 0 5.5 18h13A2.5 2.5 0 0 0 21 15.5v-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M21 8.5l-9 6-9-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
function IconMap() {
	return (
		<svg className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M12 2C8 2 5 5 5 9c0 6 7 11 7 11s7-5 7-11c0-4-3-7-7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/** Elegant, minimal corporate style component */
export default function ClinicProfileCard() {
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<RawProfile | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			setError(null);
			try {
				// include credentials in case cookies are used for auth
				const res = await fetch('/api/clinic-profile', { credentials: 'include' });
				const json = await res.json().catch(() => ({ ok: false, message: 'invalid json' }));
				if (!res.ok || !json.ok) {
					const msg = json?.message ?? `HTTP ${res.status}`;
					if (mounted) setError(msg);
					if (mounted) setProfile(null);
				} else {
					if (mounted) setProfile(json.profile ?? null);
				}
			} catch (err: any) {
				if (mounted) setError(err?.message ?? 'network error');
				if (mounted) setProfile(null);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		load();
		return () => {
			mounted = false;
		};
	}, []);

	const specialties = safeParseArrayField(profile?.specialties);
	const openingHours = safeParseArrayField(profile?.openingHours);
	const paymentMethods = safeParseArrayField(profile?.paymentMethods);

	if (loading) {
		return (
			<div className="max-w-4xl w-full mx-auto p-6 rounded-2xl bg-gradient-to-br from-white/70 to-slate-50/60 shadow-lg border border-slate-100">
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-3/5 rounded-lg bg-slate-200" />
					<div className="h-4 w-1/2 rounded-lg bg-slate-200" />
					<div className="grid grid-cols-2 gap-4 mt-4">
						<div className="h-40 rounded-lg bg-slate-200 col-span-1" />
						<div className="h-40 rounded-lg bg-slate-200 col-span-1" />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl w-full mx-auto p-6 rounded-2xl border border-red-100 bg-red-50 text-red-800 shadow-sm">
				<div className="font-medium">Error</div>
				<div className="mt-2 text-sm">{error}</div>
			</div>
		);
	}

	if (!profile) {
		return <div className="max-w-4xl w-full mx-auto p-6 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">No se encontró información del perfil de la clínica.</div>;
	}

	return (
		<article className="max-w-4xl w-full mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-slate-100">
			{/* Header */}
			<div className="relative bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 p-6">
				<div className="flex items-start gap-4">
					<div className="flex-shrink-0">
						<div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/20">
							{/* logo placeholder */}
							<span className="text-white font-semibold text-lg">{(profile.tradeName ?? profile.legalName ?? 'C').slice(0, 2).toUpperCase()}</span>
						</div>
					</div>

					<div className="flex-1 text-white">
						<h2 className="text-2xl font-semibold leading-tight">{profile.tradeName ?? profile.legalName ?? 'Nombre no disponible'}</h2>
						<p className="text-sm opacity-90 mt-1">{profile.tradeName && profile.legalName && profile.tradeName !== profile.legalName ? profile.legalName : profile.entityType ?? 'Entidad no especificada'}</p>

						<div className="mt-3 flex flex-wrap gap-2 items-center">
							<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/12 text-sm backdrop-blur-sm">
								<strong className="font-medium">{profile.officesCount ?? 0}</strong>
								<span className="text-xs opacity-90">Consultorios</span>
							</span>

							<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 text-sm">
								<strong className="font-medium">{profile.employeesCount ?? '—'}</strong>
								<span className="text-xs opacity-90">Empleados</span>
							</span>

							<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 text-sm">
								<strong className="font-medium">{profile.capacityPerDay ?? '—'}</strong>
								<span className="text-xs opacity-90">Capacidad/día</span>
							</span>
						</div>
					</div>

					<div className="flex-shrink-0 text-right text-white">
						<div className="text-xs opacity-90">Última actualización</div>
						<div className="mt-1 font-medium">{profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : '—'}</div>
						<div className="mt-3"></div>
					</div>
				</div>

				{/* subtle decorative SVG / gradient overlay */}
				<svg className="absolute right-0 bottom-0 w-56 opacity-10" viewBox="0 0 200 200" fill="none" aria-hidden>
					<circle cx="100" cy="100" r="80" fill="white" />
				</svg>
			</div>

			{/* Body */}
			<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Left column */}
				<div className="space-y-6">
					<div className="rounded-xl p-4 bg-gradient-to-tr from-white to-slate-50 ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Contacto</h4>
						<div className="text-sm text-slate-600 space-y-1">
							<div>
								<IconPhone />
								<span className="font-medium text-slate-800">{showOrNot(profile.phoneMobile ?? profile.phoneFixed, 'No ha sido registrado')}</span>
							</div>
							<div>
								<IconMail />
								<span className="text-slate-700">{showOrNot(profile.contactEmail, 'No ha sido registrado')}</span>
							</div>
							<div>
								<IconMap />
								<span className="text-slate-700">
									{profile.addressOperational ?? profile.addressFiscal ? (
										<>
											{profile.addressOperational ?? profile.addressFiscal}
											<span className="text-xs text-slate-500 block mt-1">
												{profile.cityMunicipality ?? ''}
												{profile.stateProvince ? `, ${profile.stateProvince}` : ''}
												{profile.postalCode ? ` • ${profile.postalCode}` : ''}
											</span>
										</>
									) : (
										'No ha sido registrado'
									)}
								</span>
							</div>

							<div className="mt-3">
								<div className="text-xs text-slate-500">Sitio web</div>
								<div>
									{profile.website ? (
										<a href={profile.website} target="_blank" rel="noreferrer" className="text-sky-600 underline">
											{profile.website}
										</a>
									) : (
										<span className="text-slate-500">No ha sido registrado</span>
									)}
								</div>
							</div>

							<div className="mt-3 flex gap-2">
								{profile.socialFacebook ? (
									<a href={profile.socialFacebook} className="text-slate-700 text-xs px-3 py-1 rounded-full border" target="_blank" rel="noreferrer">
										Facebook
									</a>
								) : null}
								{profile.socialInstagram ? (
									<a href={profile.socialInstagram} className="text-slate-700 text-xs px-3 py-1 rounded-full border" target="_blank" rel="noreferrer">
										Instagram
									</a>
								) : null}
								{profile.socialLinkedin ? (
									<a href={profile.socialLinkedin} className="text-slate-700 text-xs px-3 py-1 rounded-full border" target="_blank" rel="noreferrer">
										LinkedIn
									</a>
								) : null}
							</div>
						</div>
					</div>

					<div className="rounded-xl p-4 bg-white ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Responsables</h4>
						<div className="text-sm text-slate-600 space-y-1">
							<div>
								<span className="text-slate-700 font-medium">Director:</span> <span>{showOrNot(profile.directorName, 'No ha sido registrado')}</span>
								<span className="text-xs text-slate-500 block">{profile.directorIdNumber ?? ''}</span>
							</div>
							<div>
								<span className="text-slate-700 font-medium">Administrador:</span> <span>{showOrNot(profile.adminName, 'No ha sido registrado')}</span>
							</div>
						</div>
					</div>

					<div className="rounded-xl p-4 bg-white ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Bancario</h4>
						<div className="text-sm text-slate-600 space-y-1">
							<div>{showOrNot(profile.bankName)}</div>
							<div className="text-xs text-slate-500">Titular: {showOrNot(profile.bankAccountOwner)}</div>
							<div className="text-xs text-slate-500">Cuenta: {showOrNot(profile.bankAccountNumber)}</div>
							<div className="text-xs text-slate-500">Tipo: {showOrNot(profile.bankAccountType)}</div>
							<div className="text-xs text-slate-500">Moneda: {showOrNot(profile.currency)}</div>
						</div>
					</div>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<div className="rounded-xl p-4 bg-gradient-to-br from-white to-slate-50 ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Especialidades</h4>
						<div className="mt-2 flex flex-wrap gap-2">
							{specialties.length > 0 ? (
								specialties.map((s: any, i: number) => {
									const label = typeof s === 'string' ? s : s?.name ?? JSON.stringify(s);
									return (
										<span key={i} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
											{label}
										</span>
									);
								})
							) : (
								<div className="text-sm text-slate-500">No registradas</div>
							)}
						</div>
					</div>

					<div className="rounded-xl p-4 bg-white ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Horarios</h4>
						<div className="mt-2 text-sm text-slate-600 space-y-1">
							{openingHours.length > 0 ? (
								openingHours.map((h: any, idx: number) => {
									const dayLabel = h?.day ?? h?.weekday ?? `Día ${idx + 1}`;
									const from = h?.open ?? h?.from ?? h?.start ?? '—';
									const to = h?.close ?? h?.to ?? h?.end ?? '—';
									return (
										<div key={idx} className="flex items-center justify-between">
											<div className="font-medium text-slate-700">{dayLabel}</div>
											<div className="text-slate-600">
												{from} — {to}
											</div>
										</div>
									);
								})
							) : (
								<div className="text-sm text-slate-500">No disponible</div>
							)}
						</div>
					</div>

					<div className="rounded-xl p-4 bg-white ring-1 ring-slate-100">
						<h4 className="text-sm font-semibold text-slate-700 mb-2">Pagos & Facturación</h4>
						<div className="text-sm text-slate-600 space-y-2">
							<div>
								<span className="font-medium text-slate-700">Métodos:</span>{' '}
								{paymentMethods.length > 0 ? (
									paymentMethods.map((p: any, i: number) => (
										<span key={i} className="inline-block ml-2 px-2 py-1 text-xs rounded bg-slate-100">
											{typeof p === 'string' ? p : p?.name ?? JSON.stringify(p)}
										</span>
									))
								) : (
									<span className="text-slate-500">No registrado</span>
								)}
							</div>

							<div>
								<div className="text-xs text-slate-500">Serie:</div>
								<div className="text-sm text-slate-700">{showOrNot(profile.billingSeries)}</div>
							</div>

							<div>
								<div className="text-xs text-slate-500">Régimen fiscal</div>
								<div className="text-sm text-slate-700">{showOrNot(profile.taxRegime)}</div>
							</div>

							<div>
								<div className="text-xs text-slate-500">Dirección fiscal</div>
								<div className="text-sm text-slate-700">{showOrNot(profile.billingAddress)}</div>
							</div>
						</div>
					</div>

					<div className="rounded-xl p-4 bg-white/60 ring-1 ring-slate-100 flex items-center justify-between">
						<div className="text-sm text-slate-600">
							<div className="text-xs text-slate-500">Capacidad por día</div>
							<div className="font-medium text-slate-800">{showOrNot(profile.capacityPerDay ?? null)}</div>
						</div>

						<div className="text-sm text-slate-600">
							<div className="text-xs text-slate-500">Empleados</div>
							<div className="font-medium text-slate-800">{showOrNot(profile.employeesCount ?? null)}</div>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
				<div className="text-xs text-slate-500">
					ID organización: <span className="text-slate-700">{profile.organizationId}</span>
				</div>
				<div className="text-xs text-slate-500">
					Creado: <span className="text-slate-700">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span>
				</div>
			</div>
		</article>
	);
}
