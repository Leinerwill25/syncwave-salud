// components/ClinicSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
	{ href: '/dashboard/clinic', label: 'Resumen', icon: 'dashboard' },
	{ href: '/dashboard/clinic/invites', label: 'Invitaciones', icon: 'invite' },
	{ href: '/dashboard/clinic/specialists', label: 'Especialistas', icon: 'users' },
	{ href: '/dashboard/clinic/billing', label: 'Facturación', icon: 'billing' },
	{ href: '/dashboard/clinic/settings', label: 'Configuración', icon: 'settings' },
];

function Icon({ name, className = '' }: { name?: string; className?: string }) {
	const base = `w-5 h-5 ${className}`;
	switch (name) {
		case 'dashboard':
			return (
				<svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden>
					<path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" fill="currentColor" />
				</svg>
			);
		case 'invite':
			return (
				<svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden>
					<path d="M12 12a4 4 0 100-8 4 4 0 000 8zm7 9H5a1 1 0 01-1-1v-1a6 6 0 0112 0v1a1 1 0 01-1 1z" fill="currentColor" />
				</svg>
			);
		case 'users':
			return (
				<svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden>
					<path d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM2 20a6 6 0 0112 0v1H2v-1zM18 20v-1a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		case 'billing':
			return (
				<svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden>
					<path d="M21 11.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13l4-2 4 2 4-2 6 2v-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
				</svg>
			);
		case 'settings':
		default:
			return (
				<svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden>
					<path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 013.28 17.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 015.6 3.28l.06.06a1.65 1.65 0 001.82.33H8.5A1.65 1.65 0 0010.5 3V2a2 2 0 014 0v.09c0 .55.39 1.02.94 1.2a1.65 1.65 0 001.82-.33l.06-.06A2 2 0 0120.72 6.1l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="0.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
	}
}

export default function ClinicSidebar() {
	const pathname = usePathname() ?? '/dashboard/clinic';

	return (
		// visible en md+ (ajusta breakpoint si prefieres xl)
		<aside className="hidden md:block w-72" aria-label="Barra lateral del panel de la clínica">
			<div className="sticky top-[calc(var(--navbar-height,64px)+1.25rem)] p-4" style={{ zIndex: 30 }}>
				<div className="flex flex-col gap-4 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-slate-100 border border-slate-50">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">SW</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Syncwave Salud</div>
							<div className="text-[12px] text-slate-500">Panel clínico — Gestión</div>
						</div>
					</div>

					{/* Search - small subtle control */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition" />
						<svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.2" />
						</svg>
					</div>

					{/* Navigation */}
					<nav className="mt-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">
							{LINKS.map((l) => {
								const active = pathname === l.href || (l.href !== '/dashboard/clinic' && pathname.startsWith(l.href));
								return (
									<li key={l.href}>
										<Link
											href={l.href}
											aria-current={active ? 'page' : undefined}
											className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium
                        ${active ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}
                      `}>
											<span className={`flex items-center justify-center w-9 h-9 rounded-md transition ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-sky-600 group-hover:bg-sky-50'}`} aria-hidden>
												<Icon name={l.icon} className={active ? '' : 'text-sky-600'} />
											</span>

											<span className="flex-1">{l.label}</span>

											{/* subtle active indicator / chevron */}
											<span className={`text-xs font-medium transition ${active ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-60 text-slate-400'}`}>{active ? 'Activo' : ''}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>

					{/* Shortcuts */}
					<div className="pt-3 mt-2 border-t border-slate-100">
						<div className="text-xs text-slate-500 mb-2">Atajos</div>
						<div className="flex flex-col gap-2">
							<Link href="/dashboard/clinic/specialists/new" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-medium shadow hover:scale-[1.01] transition">
								+ Invitar especialista
							</Link>

							<Link href="/dashboard/clinic/billing" className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white border border-slate-100 text-sm hover:bg-slate-50 transition">
								<span>Suscripción</span>
								<svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" aria-hidden>
									<path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</Link>
						</div>
					</div>

					{/* Footer tiny */}
					<div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<div>Soporte</div>
						<a href="/help" className="text-sky-600 hover:underline">
							Ayuda
						</a>
					</div>
				</div>
			</div>
		</aside>
	);
}
