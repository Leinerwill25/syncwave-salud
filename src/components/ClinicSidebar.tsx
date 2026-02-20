/** @refactored ASHIRA Clinic Dashboard - ClinicSidebar */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	UserPlus,
	Users,
	CreditCard,
	Settings,
	Search,
	ChevronRight,
	BarChart3,
	FileText,
	TrendingUp,
	Stethoscope,
	Activity,
	Clipboard,
	GitCompare,
	Heart,
	Database,
	HelpCircle,
	Menu,
	X,
} from 'lucide-react';

const ICONS = {
	dashboard: LayoutDashboard,
	invite: UserPlus,
	users: Users,
	billing: CreditCard,
	settings: Settings,
	analytics: BarChart3,
	reports: FileText,
	kpis: TrendingUp,
	specialists: Stethoscope,
	consultations: Activity,
	diagnoses: Clipboard,
	followup: Heart,
	comparison: GitCompare,
	data: Database,
} as const;

type IconKey = keyof typeof ICONS;

type LinkItem = {
	href: string;
	label: string;
	icon: IconKey;
	comingSoon?: boolean;
};

type NavGroup = {
	label: string;
	items: LinkItem[];
};

const NAV_GROUPS: NavGroup[] = [
	{
		label: 'Principal',
		items: [
			{ href: '/dashboard/clinic', label: 'Resumen', icon: 'dashboard' },
			{ href: '/dashboard/clinic/invites', label: 'Invitaciones', icon: 'invite' },
			{ href: '/dashboard/clinic/specialists', label: 'Especialistas', icon: 'users' },
			{ href: '/dashboard/clinic/billing', label: 'Facturación', icon: 'billing', comingSoon: true },
			{ href: '/dashboard/clinic/settings', label: 'Configuración', icon: 'settings' },
		],
	},
	{
		label: 'Analítica',
		items: [
			{ href: '/dashboard/clinic/analytics/data', label: 'Datos', icon: 'data' },
			{ href: '/dashboard/clinic/analytics/reports', label: 'Reportes', icon: 'reports' },
			{ href: '/dashboard/clinic/analytics/kpis', label: 'KPIs', icon: 'kpis' },
			{ href: '/dashboard/clinic/analytics/specialists', label: 'Especialistas', icon: 'specialists' },
			{ href: '/dashboard/clinic/analytics/consultations', label: 'Consultas', icon: 'consultations' },
			{ href: '/dashboard/clinic/analytics/diagnoses', label: 'Diagnósticos', icon: 'diagnoses' },
			{ href: '/dashboard/clinic/analytics/followup', label: 'Seguimiento', icon: 'followup' },
			{ href: '/dashboard/clinic/analytics/comparison', label: 'Comparación', icon: 'comparison' },
		],
	},
];

function SidebarContent({ pathname }: { pathname: string }) {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredGroups = NAV_GROUPS.map((group) => ({
		...group,
		items: group.items.filter((item) =>
			item.label.toLowerCase().includes(searchQuery.toLowerCase())
		),
	})).filter((group) => group.items.length > 0);

	return (
		<div className="flex flex-col gap-5 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
			{/* Brand header */}
			<div className="flex items-center gap-3 px-1">
				<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
					SW
				</div>
				<div>
					<div className="text-sm font-semibold text-slate-900">ASHIRA</div>
					<div className="text-[11px] text-slate-400">Panel de gestión</div>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
				<input
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Buscar..."
					aria-label="Buscar sección"
					className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition"
				/>
			</div>

			{/* Navigation groups */}
			<nav className="flex flex-col gap-5" aria-label="Navegación principal">
				{filteredGroups.map((group) => (
					<div key={group.label}>
						<p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-3 mb-2">
							{group.label}
						</p>
						<ul className="flex flex-col gap-0.5">
							{group.items.map((item) => {
								const active =
									pathname === item.href ||
									(item.href !== '/dashboard/clinic' && pathname.startsWith(item.href));
								const IconComp = ICONS[item.icon];
								const isComing = !!item.comingSoon;

								if (isComing) {
									return (
										<li key={item.href}>
											<div
												aria-disabled="true"
												className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-slate-400 cursor-not-allowed"
											>
												<span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50" aria-hidden="true">
													<IconComp className="w-4 h-4 text-slate-300" />
												</span>
												<span className="flex-1">{item.label}</span>
												<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
													Pronto
												</span>
											</div>
										</li>
									);
								}

								return (
									<li key={item.href}>
										<Link
											href={item.href}
											aria-current={active ? 'page' : undefined}
											className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors
												${
													active
														? 'bg-sky-50 text-sky-700 border-l-2 border-sky-600'
														: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
												}`}
										>
											<span
												className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
													active ? 'bg-sky-100 text-sky-600' : 'bg-slate-50 text-slate-400 group-hover:text-slate-500'
												}`}
												aria-hidden="true"
											>
												<IconComp className="w-4 h-4" />
											</span>
											<span className="flex-1 truncate">{item.label}</span>
											{active && (
												<ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
											)}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</nav>

			{/* Quick action */}
			<div className="pt-3 border-t border-slate-100">
				<Link
					href="/dashboard/clinic/specialists/new"
					className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
				>
					<UserPlus className="w-4 h-4" aria-hidden="true" />
					Invitar especialista
				</Link>
			</div>

			{/* Footer */}
			<div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 px-1">
				<span>Soporte</span>
				<Link href="/help" className="text-sky-500 hover:text-sky-600 transition-colors inline-flex items-center gap-1">
					<HelpCircle className="w-3 h-3" />
					Ayuda
				</Link>
			</div>
		</div>
	);
}

export default function ClinicSidebar() {
	const pathname = usePathname() ?? '/dashboard/clinic';
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<>
			{/* Botón hamburguesa — visible en móvil */}
			<button
				type="button"
				onClick={() => setMobileOpen(true)}
				className="md:hidden fixed top-20 left-4 z-40 p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 transition-colors"
				aria-label="Abrir menú de navegación"
			>
				<Menu className="w-5 h-5" />
			</button>

			{/* Overlay móvil */}
			{mobileOpen && (
				<div className="md:hidden fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
					<div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-50 p-4 overflow-y-auto">
						<div className="flex justify-end mb-2">
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
								aria-label="Cerrar menú"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<SidebarContent pathname={pathname} />
					</div>
				</div>
			)}

			{/* Sidebar desktop */}
			<aside className="hidden md:block w-64 lg:w-[268px]" aria-label="Navegación del panel clínico">
				<div className="sticky top-24" style={{ zIndex: 30 }}>
					<SidebarContent pathname={pathname} />
				</div>
			</aside>
		</>
	);
}
