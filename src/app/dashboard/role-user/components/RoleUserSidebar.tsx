'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarDays, User, ClipboardList, FileText, MessageCircle, CheckSquare, Folder, ChevronRight, ChevronDown, Search, FileCheck, LogOut, Shield, Calendar, BarChart3, TrendingUp, CreditCard, Stethoscope } from 'lucide-react';
import { hasRoleUserPermission, getRoleUserSession, type RoleUserSession, roleNameEquals, getRoleUserDisplayName } from '@/lib/role-user-auth-client';
import CurrencyRateWidget from '@/components/role-user/CurrencyRateWidget';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type LinkItem = {
	href?: string;
	label: string;
	icon?: IconComponent;
	module?: string; // Nombre del módulo para verificar permisos
	submenu?: LinkItem[];
	requiredPermission?: 'view' | 'create' | 'edit' | 'delete'; // Permiso requerido para ver este link
	showOnlyForRole?: string; // Solo mostrar si el nombre del rol coincide
};

// Configuración de todos los módulos posibles
const ALL_MODULES: LinkItem[] = [
	{
		href: '/dashboard/role-user',
		label: 'Panel General',
		icon: LayoutDashboard,
	},
	{
		href: '/dashboard/role-user/pacientes',
		label: 'Pacientes',
		icon: User,
		module: 'pacientes',
		requiredPermission: 'view',
	},
	{
		label: 'Consultas',
		icon: ClipboardList,
		module: 'consultas',
		requiredPermission: 'view',
		submenu: [
			{ href: '/dashboard/role-user/consultas', label: 'Todas las consultas', module: 'consultas', requiredPermission: 'view' },
			{ href: '/dashboard/role-user/consultas/new', label: 'Nueva consulta', module: 'consultas', requiredPermission: 'create' },
		],
	},
	{
		href: '/dashboard/role-user/citas',
		label: 'Citas',
		icon: CalendarDays,
		module: 'citas',
		requiredPermission: 'view',
	},
	{
		href: '/dashboard/role-user/mis-citas',
		label: 'Mis Citas Programadas',
		icon: Calendar,
		module: 'citas',
		requiredPermission: 'view',
		showOnlyForRole: 'Asistente De Citas',
	},
	{
		href: '/dashboard/role-user/reportes-citas',
		label: 'Reportes de Citas',
		icon: BarChart3,
		module: 'citas',
		requiredPermission: 'view',
		showOnlyForRole: 'Asistente De Citas',
	},
	{
		href: '/dashboard/role-user/estadisticas-citas',
		label: 'Estadísticas de Citas',
		icon: TrendingUp,
		module: 'citas',
		requiredPermission: 'view',
		showOnlyForRole: 'Asistente De Citas',
	},
	{
		href: '/dashboard/role-user/origen-citas',
		label: 'Origen de las Citas',
		icon: BarChart3,
		module: 'citas',
		requiredPermission: 'view',
		showOnlyForRole: 'Asistente De Citas',
	},
	{
		href: '/dashboard/role-user/estadisticas-servicios',
		label: 'Panel Inteligente de Servicios',
		icon: BarChart3,
		showOnlyForRole: 'Recepción',
	},
	{
		label: 'Recetas',
		icon: FileText,
		module: 'recetas',
		requiredPermission: 'view',
		submenu: [{ href: '/dashboard/role-user/recetas', label: 'Todas las recetas', module: 'recetas', requiredPermission: 'view' }],
	},
	{
		label: 'Órdenes Médicas',
		icon: FileCheck,
		module: 'ordenes',
		requiredPermission: 'view',
		submenu: [
			{ href: '/dashboard/role-user/ordenes', label: 'Todas las órdenes', module: 'ordenes', requiredPermission: 'view' },
			{ href: '/dashboard/role-user/ordenes/new', label: 'Nueva orden', module: 'ordenes', requiredPermission: 'create' },
		],
	},
	{
		href: '/dashboard/role-user/resultados',
		label: 'Resultados',
		icon: Folder,
		module: 'resultados',
		requiredPermission: 'view',
	},
	{
		href: '/dashboard/role-user/mensajes',
		label: 'Mensajes',
		icon: MessageCircle,
		module: 'mensajes',
		requiredPermission: 'view',
	},
	{
		href: '/dashboard/role-user/mensajeria',
		label: 'Mensajería Privada',
		icon: MessageCircle,
	},
	{
		href: '/dashboard/role-user/tareas',
		label: 'Tareas',
		icon: CheckSquare,
		module: 'tareas',
		requiredPermission: 'view',
	},
	{
		href: '/dashboard/role-user/reportes',
		label: 'Reportes',
		icon: FileText,
		module: 'reportes',
		requiredPermission: 'view',
	},
	{
		href: '/dashboard/role-user/servicios',
		label: 'Servicios del consultorio',
		icon: Stethoscope,
	},
	{
		href: '/dashboard/role-user/whatsapp-config',
		label: 'Mensaje de WhatsApp',
		icon: MessageCircle,
		showOnlyForRole: 'Asistente De Citas',
	},
	{
		href: '/dashboard/role-user/metodos-pago',
		label: 'Métodos de Pago',
		icon: CreditCard,
		showOnlyForRole: 'Recepción',
	},
];

export default function RoleUserSidebar() {
	const pathname = usePathname() ?? '/';
	const router = useRouter();
	const [openMenus, setOpenMenus] = useState<string[]>([]);
	const [session, setSession] = useState<RoleUserSession | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSession();
	}, []);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			} else {
				router.push('/login/role-user');
			}
		} catch (err) {
			console.error('[Role User Sidebar] Error cargando sesión:', err);
			router.push('/login/role-user');
		} finally {
			setLoading(false);
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

	// isPathActive: compara de forma estricta (pathname === href normalizados)
	const isPathActive = (href?: string | null) => {
		if (!href) return false;
		return normalize(pathname) === normalize(href);
	};

	// Verifica si el usuario tiene permiso para ver un link
	const hasPermissionForLink = (link: LinkItem): boolean => {
		if (!session) return false;

		// Si tiene showOnlyForRole, verificar que el rol coincide (normalizado)
		if (link.showOnlyForRole && !roleNameEquals(session.roleName, link.showOnlyForRole)) {
			return false;
		}

		// Link especial: Servicios del consultorio ó Pacientes → solo Recepción o Asistente De Citas
		if (link.href === '/dashboard/role-user/servicios' || link.href === '/dashboard/role-user/pacientes') {
			if (
				!roleNameEquals(session.roleName, 'Recepción') &&
				!roleNameEquals(session.roleName, 'Asistente De Citas')
			) {
				return false;
			}
			// No depende de módulos/permissions, se muestra directo
			return true;
		}

		if (!link.module || !link.requiredPermission) {
			// Si no hay módulo o permiso requerido, siempre mostrar (como Panel General)
			return true;
		}
		return hasRoleUserPermission(session, link.module, link.requiredPermission);
	};

	// Filtrar módulos según permisos
	const getFilteredLinks = (): LinkItem[] => {
		if (!session) return [];

		return ALL_MODULES.filter((link) => {
			// Si tiene submenu, filtrar primero los items del submenu
			if (link.submenu) {
				const filteredSubmenu = link.submenu.filter((sub) => hasPermissionForLink(sub));
				if (filteredSubmenu.length === 0) {
					// Si no hay items visibles en el submenu, no mostrar el menú padre
					return false;
				}
				// Actualizar el submenu filtrado
				link.submenu = filteredSubmenu;
			}

			// Verificar permiso del link principal
			return hasPermissionForLink(link);
		});
	};

	const renderLink = (link: LinkItem) => {
		const isActive = !!link.href && isPathActive(link.href);

		// Submenu
		if (link.submenu) {
			// Abrir si está en openMenus o si alguno de los hijos es la ruta actual
			const childActive = link.submenu.some((l) => isPathActive(l.href));
			const isOpen = openMenus.includes(link.label) || childActive;

			// Si solo hay un item visible en el submenu, mostrar como link directo
			if (link.submenu.length === 1) {
				const singleItem = link.submenu[0];
				const singleActive = isPathActive(singleItem.href);

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
						{link.submenu.map((sub) => {
							const subActive = isPathActive(sub.href);

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

	const handleLogout = async () => {
		try {
			await fetch('/api/role-users/login', {
				method: 'DELETE',
				credentials: 'include',
			});
			router.push('/login/role-user');
		} catch (err) {
			console.error('[Logout] Error:', err);
			router.push('/login/role-user');
		}
	};

	if (loading) {
		return (
			<aside className="hidden md:block w-68 self-start" aria-label="Barra lateral del panel de usuario">
				<div className="sticky top-4 md:top-6" style={{ zIndex: 30 }}>
					<div className="flex flex-col gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-blue-100 border border-blue-50">
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
						</div>
					</div>
				</div>
			</aside>
		);
	}

	if (!session) {
		return null;
	}

	const filteredLinks = getFilteredLinks();

	return (
		<aside className="hidden md:block w-68 self-start" aria-label="Barra lateral del panel de usuario">
			<div className="sticky top-4 md:top-6" style={{ zIndex: 30 }}>
				<div className="flex flex-col gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg ring-1 ring-blue-100 border border-blue-50">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-md ring-1 ring-white/20">
							<Shield className="w-6 h-6" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-sm font-semibold text-slate-900 truncate">
								{getRoleUserDisplayName(session)}
							</div>
							<div className="text-[12px] text-slate-500 truncate">
								{session.firstName} {session.lastName}
							</div>
						</div>
					</div>

					{/* Search */}
					<div className="relative">
						<input placeholder="Buscar sección..." aria-label="Buscar sección" className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 bg-blue-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-200 transition" />
						<Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" aria-hidden />
					</div>

					{/* Navigation */}
					<nav className="mt-1" aria-label="Navegación principal">
						<ul className="flex flex-col gap-1">{filteredLinks.map(renderLink)}</ul>
					</nav>

					<div className="mt-auto pt-4">
						<CurrencyRateWidget />
						
						{/* Logout Button */}
						<div className="pt-2 border-t border-blue-100">
							<button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors group">
								<LogOut className="w-5 h-5 text-slate-600 group-hover:text-red-600" />
								<span>Cerrar Sesión</span>
							</button>
						</div>

						{/* Footer */}
						<div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-xs text-slate-500">
							<div>Soporte</div>
							<a href="/help" className="text-teal-600 hover:underline">
								Ayuda
							</a>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
