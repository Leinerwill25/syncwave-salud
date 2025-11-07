'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, User, ClipboardList, FileText, Settings, MessageCircle, CheckSquare, Folder, ChevronRight, ChevronDown, Search } from 'lucide-react';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type LinkItem = {
	href?: string;
	label: string;
	icon?: IconComponent;
	submenu?: LinkItem[];
	comingSoon?: boolean;
};

const LINKS: LinkItem[] = [
	{
		href: '/dashboard/medic',
		label: 'Panel General',
		icon: LayoutDashboard,
	},
	{
		label: 'Pacientes',
		icon: User,
		submenu: [{ href: '/dashboard/medic/pacientes', label: 'Listado de pacientes' }],
	},
	{
		label: 'Consultas',
		icon: ClipboardList,
		submenu: [
			{ href: '/dashboard/medic/consultas', label: 'Todas las consultas' },
			{ href: '/dashboard/medic/consultas/new', label: 'Nueva consulta' },
		],
	},
	{
		label: 'Recetas',
		icon: ClipboardList,
		submenu: [{ href: '/dashboard/medic/recetas', label: 'Todas las recetas' }],
	},
	{
		href: '/dashboard/medic/citas',
		label: 'Citas',
		icon: CalendarDays,
	},
	{
		href: '/dashboard/medic/resultados',
		label: 'Resultados',
		icon: Folder,
		comingSoon: true,
	},
	{
		href: '/dashboard/medic/mensajes',
		label: 'Mensajes',
		icon: MessageCircle,
		comingSoon: true,
	},
	{
		href: '/dashboard/medic/tareas',
		label: 'Tareas',
		icon: CheckSquare,
		comingSoon: true,
	},
	{
		href: '/dashboard/medic/configuracion',
		label: 'Configuración',
		icon: Settings,
	},
	{
		href: '/dashboard/medic/reportes',
		label: 'Reportes',
		icon: FileText,
		comingSoon: true,
	},
];

export default function MedicSidebar() {
	const pathname = usePathname() ?? '/';
	const [openMenus, setOpenMenus] = useState<string[]>([]);

	const toggleMenu = (label: string) => {
		setOpenMenus((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]));
	};

	// Normalize path: remove trailing slash (except for root '/')
	const normalize = (p: string | undefined | null) => {
		if (!p) return '';
		if (p === '/') return '/';
		return p.endsWith('/') ? p.slice(0, -1) : p;
	};

	// isPathActive: ahora compara de forma estricta (pathname === href normalizados)
	const isPathActive = (href?: string | null) => {
		if (!href) return false;
		return normalize(pathname) === normalize(href);
	};

	const renderLink = (link: LinkItem) => {
		const isActive = !!link.href && isPathActive(link.href);
		const isComing = !!link.comingSoon;

		// Submenu
		if (link.submenu) {
			// Abrir si está en openMenus o si alguno de los hijos es la ruta actual (exacta)
			const childActive = link.submenu.some((l) => isPathActive(l.href));
			const isOpen = openMenus.includes(link.label) || childActive;

			return (
				<li key={link.label}>
					<button
						onClick={() => toggleMenu(link.label)}
						className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition
						${isOpen ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
						<span className="flex items-center gap-3">
							{link.icon && <link.icon className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-violet-600'}`} />}
							{link.label}
						</span>
						<ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-violet-600'}`} />
					</button>

					<ul className={`pl-8 mt-1 flex flex-col gap-1 transition-[max-height] duration-200 overflow-hidden ${isOpen ? 'max-h-60' : 'max-h-0'}`}>
						{link.submenu.map((sub) => {
							const subActive = isPathActive(sub.href);
							const subComing = !!sub.comingSoon;

							if (subComing) {
								return (
									<li key={sub.label}>
										<div
											aria-disabled="true"
											className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
											${subActive ? 'bg-violet-100 text-violet-700' : 'text-slate-400 bg-slate-50'}`}>
											<span>{sub.label}</span>
											<span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Próximamente</span>
										</div>
									</li>
								);
							}

							return (
								<li key={sub.label}>
									<Link
										href={sub.href!}
										aria-current={subActive ? 'page' : undefined}
										className={`group block px-3 py-2 rounded-lg text-sm transition
											${subActive ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
										{sub.label}
									</Link>
								</li>
							);
						})}
					</ul>
				</li>
			);
		}

		// Link normal (no submenu)
		if (isComing) {
			return (
				<li key={link.label}>
					<div
						aria-disabled="true"
						className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
						${isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-400 bg-slate-50'}`}>
						{link.icon && <link.icon className="w-5 h-5" />}
						<span>{link.label}</span>
						<span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Próximamente</span>
					</div>
				</li>
			);
		}

		return (
			<li key={link.label}>
				<Link
					href={link.href!}
					aria-current={isActive ? 'page' : undefined}
					className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition
					${isActive ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
					{link.icon && <link.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-violet-600'}`} />}
					{link.label}
				</Link>
			</li>
		);
	};

	return (
		<aside className="hidden md:block w-68" aria-label="Barra lateral del panel médico">
			<div className="sticky top-[calc(var(--navbar-height,64px)+1.25rem)]" style={{ zIndex: 30 }}>
				<div className="flex flex-col gap-4 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-slate-100 border border-slate-50">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">MD</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Syncwave Salud</div>
							<div className="text-[12px] text-slate-500">Panel médico — Profesional</div>
						</div>
					</div>

					{/* Search */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition" />
						<Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" aria-hidden />
					</div>

					{/* Navigation */}
					<nav className="mt-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">{LINKS.map(renderLink)}</ul>
					</nav>

					{/* Footer */}
					<div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<div>Soporte</div>
						<a href="/help" className="text-violet-600 hover:underline">
							Ayuda
						</a>
					</div>
				</div>
			</div>
		</aside>
	);
}
