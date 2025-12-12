'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Building2, ShoppingBag, FlaskConical, Search, FileText, Pill, Receipt, MessageCircle, Settings, Users, Shield, ChevronRight, ChevronDown, Search as SearchIcon, Menu, X, Bell } from 'lucide-react';

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
		href: '/dashboard/patient',
		label: 'Panel General',
		icon: LayoutDashboard,
	},
	{
		label: 'Explorar',
		icon: Search,
		submenu: [
			{ href: '/dashboard/patient/explore', label: 'Buscador Global' },
			{ href: '/dashboard/patient/consultorio', label: 'Consultorios' },
			{ href: '/dashboard/patient/clinics', label: 'Clínicas', comingSoon: true },
			{ href: '/dashboard/patient/pharmacies', label: 'Farmacias', comingSoon: true },
			{ href: '/dashboard/patient/labs', label: 'Laboratorios', comingSoon: true },
		],
	},
	{
		href: '/dashboard/patient/citas',
		label: 'Mis Citas',
		icon: CalendarDays,
	},
	{
		href: '/dashboard/patient/historial',
		label: 'Historial Médico',
		icon: FileText,
	},
	{
		href: '/dashboard/patient/resultados',
		label: 'Resultados',
		icon: FlaskConical,
		comingSoon: true,
	},
	{
		href: '/dashboard/patient/recetas',
		label: 'Recetas',
		icon: Pill,
	},
	{
		href: '/dashboard/patient/recordatorios',
		label: 'Recordatorios',
		icon: Bell,
	},
	{
		href: '/dashboard/patient/pagos',
		label: 'Pagos',
		icon: Receipt,
	},
	{
		href: '/dashboard/patient/mensajes',
		label: 'Mensajes',
		icon: MessageCircle,
	},
	{
		label: 'Grupo Familiar',
		icon: Users,
		submenu: [
			{ href: '/dashboard/patient/family', label: 'Mi Grupo' },
			{ href: '/dashboard/patient/family/codes', label: 'Códigos de Acceso' },
			{ href: '/dashboard/patient/family/settings', label: 'Configuración' },
		],
	},
	{
		href: '/dashboard/patient/configuracion',
		label: 'Configuración',
		icon: Settings,
	},
];

export default function PatientHamburgerMenu() {
	const pathname = usePathname() ?? '/';
	const [isOpen, setIsOpen] = useState(false);
	const [openMenus, setOpenMenus] = useState<string[]>([]);

	// Cerrar menú cuando cambia la ruta
	useEffect(() => {
		setIsOpen(false);
		setOpenMenus([]);
	}, [pathname]);

	// Prevenir scroll del body cuando el menú está abierto
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	const toggleMenu = (label: string) => {
		setOpenMenus((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]));
	};

	const normalize = (p: string | undefined | null) => {
		if (!p) return '';
		if (p === '/') return '/';
		return p.endsWith('/') ? p.slice(0, -1) : p;
	};

	const isPathActive = (href?: string | null) => {
		if (!href) return false;
		const normalizedHref = normalize(href);
		const normalizedPath = normalize(pathname);
		return normalizedPath === normalizedHref || normalizedPath.startsWith(normalizedHref + '/');
	};

	const handleLinkClick = () => {
		setIsOpen(false);
		setOpenMenus([]);
	};

	const renderLink = (link: LinkItem) => {
		const isActive = !!link.href && isPathActive(link.href);
		const isComing = !!link.comingSoon;

		// Submenu
		if (link.submenu) {
			if (isComing) {
				return (
					<li key={link.label}>
						<div
							aria-disabled="true"
							className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
							${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 bg-slate-50'}`}>
							{link.icon && <link.icon className="w-5 h-5" />}
							<span>{link.label}</span>
							<span className="ml-auto inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Próximamente</span>
						</div>
					</li>
				);
			}

			const childActive = link.submenu.some((l) => isPathActive(l.href));
			const isOpenSubmenu = openMenus.includes(link.label) || childActive;

			return (
				<li key={link.label}>
					<button
						onClick={() => toggleMenu(link.label)}
						className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition
						${isOpenSubmenu ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
						<span className="flex items-center gap-3">
							{link.icon && <link.icon className={`w-5 h-5 ${isOpenSubmenu ? 'text-white' : 'text-indigo-600'}`} />}
							{link.label}
						</span>
						<ChevronDown className={`w-4 h-4 transition-transform ${isOpenSubmenu ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
					</button>

					<ul className={`pl-8 mt-1 flex flex-col gap-1 transition-[max-height] duration-200 overflow-hidden ${isOpenSubmenu ? 'max-h-60' : 'max-h-0'}`}>
						{link.submenu.map((sub) => {
							const subActive = isPathActive(sub.href);
							const subComing = !!sub.comingSoon;

							if (subComing) {
								return (
									<li key={sub.label}>
										<div
											aria-disabled="true"
											className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
											${subActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 bg-slate-50'}`}>
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
										onClick={handleLinkClick}
										aria-current={subActive ? 'page' : undefined}
										className={`group block px-3 py-2 rounded-lg text-sm transition
											${subActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
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
						${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 bg-slate-50'}`}>
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
					onClick={handleLinkClick}
					aria-current={isActive ? 'page' : undefined}
					className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition
					${isActive ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
					{link.icon && <link.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-indigo-600'}`} />}
					{link.label}
				</Link>
			</li>
		);
	};

	return (
		<>
			{/* Botón Hamburger - Solo visible en móviles */}
			<button onClick={() => setIsOpen(!isOpen)} className="md:hidden fixed top-20 left-4 z-[9999] p-2 rounded-lg bg-white shadow-lg border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-colors" aria-label="Abrir menú" aria-expanded={isOpen}>
				{isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
			</button>

			{/* Overlay de fondo */}
			{isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] md:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" />}

			{/* Menú lateral */}
			<aside
				className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto
				${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
				aria-label="Menú de navegación móvil">
				<div className="flex flex-col gap-4 p-4 h-full">
					{/* Header */}
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">PT</div>
							<div>
								<div className="text-sm font-semibold text-slate-900">KAVIRA</div>
								<div className="text-[12px] text-slate-500">Panel del Paciente</div>
							</div>
						</div>
						<button onClick={() => setIsOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" aria-label="Cerrar menú">
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Search */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
						<SearchIcon className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" aria-hidden />
					</div>

					{/* Navigation */}
					<nav className="mt-1 flex-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">{LINKS.map(renderLink)}</ul>
					</nav>

					{/* Footer */}
					<div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
						<div>Soporte</div>
						<a href="/help" className="text-indigo-600 hover:underline" onClick={handleLinkClick}>
							Ayuda
						</a>
					</div>
				</div>
			</aside>
		</>
	);
}
