'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserPlus, Users, CreditCard, Settings, Search, ChevronRight } from 'lucide-react';

/**
 * ICONS declarado como `const` para preservar las claves literales.
 * Usaremos `keyof typeof ICONS` para forzar que `icon` de cada link
 * sólo pueda ser una de esas claves.
 */
const ICONS = {
	dashboard: LayoutDashboard,
	invite: UserPlus,
	users: Users,
	billing: CreditCard,
	settings: Settings,
} as const;

type IconKey = keyof typeof ICONS;
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type LinkItem = {
	href: string;
	label: string;
	icon: IconKey;
	comingSoon?: boolean;
};

const LINKS: LinkItem[] = [
	{ href: '/dashboard/clinic', label: 'Resumen', icon: 'dashboard' },
	{ href: '/dashboard/clinic/invites', label: 'Invitaciones', icon: 'invite' },
	{ href: '/dashboard/clinic/specialists', label: 'Especialistas', icon: 'users' },
	{ href: '/dashboard/clinic/billing', label: 'Facturación', icon: 'billing', comingSoon: true },
	{ href: '/dashboard/clinic/settings', label: 'Configuración', icon: 'settings' },
	// Analítica
	{ href: '/dashboard/clinic/analytics/data', label: 'Analítica de Datos', icon: 'dashboard' }, // Reusing dashboard icon for now or add new one
	{ href: '/dashboard/clinic/analytics/reports', label: 'Reportes', icon: 'dashboard' },
	{ href: '/dashboard/clinic/analytics/kpis', label: 'KPIs', icon: 'dashboard' },
	{ href: '/dashboard/clinic/analytics/specialists', label: 'Por Especialista', icon: 'users' },
	{ href: '/dashboard/clinic/analytics/consultations', label: 'Consultas', icon: 'dashboard' },
	{ href: '/dashboard/clinic/analytics/diagnoses', label: 'Diagnósticos', icon: 'dashboard' },
	{ href: '/dashboard/clinic/analytics/followup', label: 'Seguimiento', icon: 'dashboard' },
	{ href: '/dashboard/clinic/analytics/comparison', label: 'Citas vs Consultas', icon: 'dashboard' },
];

export default function ClinicSidebar() {
	const pathname = usePathname() ?? '/dashboard/clinic';

	return (
		// visible en md+ (ajusta breakpoint si prefieres xl)
		<aside className="hidden md:block w-68" aria-label="Barra lateral del panel de la clínica">
			<div className="sticky top-[calc(var(--navbar-height,64px)+1.25rem)]" style={{ zIndex: 30 }}>
				<div className="flex flex-col gap-4 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-slate-100 border border-slate-50">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-linear-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">SW</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">KAVIRA</div>
							<div className="text-[12px] text-slate-500">Panel clínico — Gestión</div>
						</div>
					</div>

					{/* Search - icon desde lucide */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition" />
						<Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" aria-hidden />
					</div>

					{/* Navigation */}
					<nav className="mt-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">
							{LINKS.map((l) => {
								const active = pathname === l.href || (l.href !== '/dashboard/clinic' && pathname.startsWith(l.href));
								const IconComp = ICONS[l.icon] as IconComponent | undefined;
								const isComing = !!l.comingSoon;

								// Si es comingSoon, lo mostramos deshabilitado (no-link)
								if (isComing) {
									return (
										<li key={l.href}>
											<div
												aria-disabled="true"
												className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium
												${active ? 'bg-linear-to-r from-sky-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 bg-transparent'}
												cursor-not-allowed opacity-80`}>
												<span className={`flex items-center justify-center w-9 h-9 rounded-md transition ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`} aria-hidden>
													{IconComp ? <IconComp className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} /> : null}
												</span>

												<span className="flex-1 flex items-center gap-2">
													<span>{l.label}</span>
													{/* Badge "Próximamente" */}
													<span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Próximamente</span>
												</span>

												{/* subtle active indicator / chevron */}
												<span className={`text-xs font-medium transition ${active ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-0 text-slate-400'}`}>{active ? 'Activo' : ''}</span>
											</div>
										</li>
									);
								}

								// Link normal para el resto
								return (
									<li key={l.href}>
										<Link
											href={l.href}
											aria-current={active ? 'page' : undefined}
											className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium
                        ${active ? 'bg-linear-to-r from-sky-600 to-indigo-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
											<span className={`flex items-center justify-center w-9 h-9 rounded-md transition ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-sky-600 group-hover:bg-sky-50'}`} aria-hidden>
												{IconComp ? <IconComp className={`w-5 h-5 ${active ? 'text-white' : 'text-sky-600'}`} /> : null}
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
							<Link href="/dashboard/clinic/specialists/new" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-linear-to-r from-emerald-600 to-sky-600 text-white text-sm font-medium shadow hover:scale-[1.01] transition">
								<UserPlus className="w-4 h-4" aria-hidden />+ Invitar especialista
							</Link>

							{/* El shortcut Suscripción lo dejamos navegable; si quieres también marcarlo "Próximamente" dímelo y lo deshabilito aquí también */}
							<Link href="/dashboard/clinic/billing" className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white border border-slate-100 text-sm hover:bg-slate-50 transition">
								<span>Suscripción</span>
								<ChevronRight className="w-4 h-4 text-slate-600" aria-hidden />
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
