'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, User, ClipboardList, FileText, Settings, MessageCircle, CheckSquare, Folder, ChevronRight, ChevronDown, Search, FileCheck, CreditCard, DollarSign, Users } from 'lucide-react';
import type { MedicConfig } from '@/types/medic-config';
import PaymentsModal from '@/components/medic/PaymentsModal';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type LinkItem = {
	href?: string;
	label: string;
	icon?: IconComponent;
	submenu?: LinkItem[];
	comingSoon?: boolean;
	showOnlyForOrgType?: string; // Solo mostrar si organizationType coincide
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
		submenu: [
			{ href: '/dashboard/medic/pacientes', label: 'Listado de pacientes' },
			{ href: '/dashboard/medic/pacientes-frecuentes', label: 'Pacientes Frecuentes', icon: Users },
		],
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
		label: 'Órdenes Médicas',
		icon: FileCheck,
		submenu: [
			{ href: '/dashboard/medic/ordenes', label: 'Todas las órdenes' },
			{ href: '/dashboard/medic/ordenes/new', label: 'Nueva orden' },
		],
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
	},
	{
		href: '/dashboard/medic/mensajes',
		label: 'Mensajes',
		icon: MessageCircle,
	},
	{
		href: '/dashboard/medic/tareas',
		label: 'Tareas',
		icon: CheckSquare,
	},
	{
		label: 'Configuración',
		icon: Settings,
		submenu: [
			{ href: '/dashboard/medic/configuracion', label: 'Perfil Profesional' },
			{ href: '/dashboard/medic/configuracion/consultorio', label: 'Consultorio', showOnlyForOrgType: 'CONSULTORIO' },
			{ href: '/dashboard/medic/configuracion/roles', label: 'Crear Rol', showOnlyForOrgType: 'CONSULTORIO' },
			{ href: '/dashboard/medic/configuracion/moneda', label: 'Configuración de Moneda', icon: DollarSign },
		],
	},
	{
		href: '/dashboard/medic/reportes',
		label: 'Reportes',
		icon: FileText,
	},
];

export default function MedicSidebar() {
	const pathname = usePathname() ?? '/';
	const [openMenus, setOpenMenus] = useState<string[]>([]);
	const [medicConfig, setMedicConfig] = useState<MedicConfig | null>(null);
	const [loadingConfig, setLoadingConfig] = useState(true);
	const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);

	useEffect(() => {
		loadMedicConfig();
	}, []);

	// Recargar configuración cuando cambia la ruta (por si se completó el perfil)
	useEffect(() => {
		if (pathname?.includes('/configuracion')) {
			loadMedicConfig();
		}
	}, [pathname]);

	// Escuchar evento personalizado para recargar configuración después de guardar
	useEffect(() => {
		const handleConfigUpdate = () => {
			loadMedicConfig();
		};

		window.addEventListener('medicConfigUpdated', handleConfigUpdate);
		return () => {
			window.removeEventListener('medicConfigUpdated', handleConfigUpdate);
		};
	}, []);

	const loadMedicConfig = async () => {
		try {
			const res = await fetch('/api/medic/config', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setMedicConfig(data);
			}
		} catch (err) {
			console.error('Error cargando configuración del médico:', err);
		} finally {
			setLoadingConfig(false);
		}
	};

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

		// Si el perfil no está completo, solo mostrar Configuración
		if (!loadingConfig && medicConfig && !medicConfig.isProfileComplete) {
			// Si es Configuración, mostrarlo normalmente
			if (link.label === 'Configuración') {
				// Continuar con el render normal
			} else {
				// Ocultar todos los demás links
				return null;
			}
		}

		// Submenu
		if (link.submenu) {
			// Filtrar submenu según el tipo de organización
			const visibleSubmenu = link.submenu.filter((sub) => {
				if (sub.showOnlyForOrgType) {
					// Si aún está cargando, no mostrar items condicionales
					if (loadingConfig) return false;
					return medicConfig?.organizationType === sub.showOnlyForOrgType;
				}
				return true;
			});

			// Si no hay items visibles en el submenu, no mostrar el menú
			if (visibleSubmenu.length === 0) {
				return null;
			}

			// Si solo hay un item visible, mostrar como link directo en lugar de submenu
			if (visibleSubmenu.length === 1) {
				const singleItem = visibleSubmenu[0];
				const singleActive = isPathActive(singleItem.href);
				const singleComing = !!singleItem.comingSoon;

				if (singleComing) {
					return (
						<li key={link.label}>
							<div
								aria-disabled="true"
								className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
								${singleActive ? 'bg-teal-100 text-teal-700' : 'text-slate-400 bg-blue-50'}`}>
								{link.icon && <link.icon className="w-5 h-5" />}
								<span>{singleItem.label}</span>
								<span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">Próximamente</span>
							</div>
						</li>
					);
				}

				return (
					<li key={link.label}>
						<Link
							href={singleItem.href!}
							aria-current={singleActive ? 'page' : undefined}
							className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition
							${singleActive ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50'}`}>
							{link.icon && <link.icon className={`w-5 h-5 ${singleActive ? 'text-white' : 'text-teal-600'}`} />}
							{singleItem.label}
						</Link>
					</li>
				);
			}

			// Abrir si está en openMenus o si alguno de los hijos es la ruta actual (exacta)
			const childActive = visibleSubmenu.some((l) => isPathActive(l.href));
			const isOpen = openMenus.includes(link.label) || childActive;

			return (
				<li key={link.label}>
					<button
						onClick={() => toggleMenu(link.label)}
						className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition
						${isOpen ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50'}`}>
						<span className="flex items-center gap-3">
							{link.icon && <link.icon className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-teal-600'}`} />}
							{link.label}
						</span>
						<ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-teal-600'}`} />
					</button>

					<ul className={`pl-8 mt-1 flex flex-col gap-1 transition-[max-height] duration-200 overflow-hidden ${isOpen ? 'max-h-60' : 'max-h-0'}`}>
						{visibleSubmenu.map((sub) => {
							const subActive = isPathActive(sub.href);
							const subComing = !!sub.comingSoon;

							if (subComing) {
								return (
									<li key={sub.label}>
										<div
											aria-disabled="true"
											className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-80
											${subActive ? 'bg-teal-100 text-teal-700' : 'text-slate-400 bg-blue-50'}`}>
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
											${subActive ? 'bg-teal-100 text-teal-700 font-semibold' : 'text-slate-700 hover:bg-blue-50'}`}>
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
						${isActive ? 'bg-teal-100 text-teal-700' : 'text-slate-400 bg-blue-50'}`}>
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
					${isActive ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50'}`}>
					{link.icon && <link.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-teal-600'}`} />}
					{link.label}
				</Link>
			</li>
		);
	};

	return (
		<aside className="hidden md:block w-68 self-start" aria-label="Barra lateral del panel médico">
			<div className="sticky top-4 md:top-6" style={{ zIndex: 30 }}>
				<div className="flex flex-col gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-blue-100 border border-blue-50">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">MD</div>
						<div>
							<div className="text-sm font-semibold text-slate-900">Syncwave Salud</div>
							<div className="text-[12px] text-slate-500">Panel médico — Profesional</div>
						</div>
					</div>

					{/* Search */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 bg-blue-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-200 transition" />
						<Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" aria-hidden />
					</div>

					{/* Navigation */}
					<nav className="mt-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">{LINKS.map(renderLink)}</ul>
					</nav>

					{/* Pagos Efectuados Button */}
					<div className="mt-3 pt-2 border-t border-blue-100">
						<button
							onClick={() => setPaymentsModalOpen(true)}
							className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 transition-colors group"
						>
							<CreditCard className="w-5 h-5 text-teal-600 group-hover:text-teal-700" />
							<span>Pagos Efectuados</span>
						</button>
					</div>

					{/* Footer */}
					<div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-xs text-slate-500">
						<div>Soporte</div>
						<a href="/help" className="text-teal-600 hover:underline">
							Ayuda
						</a>
					</div>
				</div>
			</div>

			{/* Payments Modal */}
			<PaymentsModal
				isOpen={paymentsModalOpen}
				onClose={() => setPaymentsModalOpen(false)}
			/>
		</aside>
	);
}
