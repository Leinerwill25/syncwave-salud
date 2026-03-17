'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  UserSquare2, 
  Package, 
  CalendarCheck, 
  FileText, 
  Settings2,
  Menu,
  X,
  LogOut,
  Activity,
  Search as SearchIcon,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

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
		href: '/dashboard/administration',
		label: 'Dashboard',
		icon: LayoutDashboard,
	},
	{
		href: '/dashboard/administration/specialists',
		label: 'Especialistas',
		icon: UserSquare2,
	},
	{
		href: '/dashboard/administration/patients',
		label: 'Pacientes',
		icon: Users,
	},
	{
		href: '/dashboard/administration/inventory',
		label: 'Inventario',
		icon: Package,
	},
	{
		href: '/dashboard/administration/appointments',
		label: 'Agendamiento',
		icon: CalendarCheck,
	},
	{
		href: '/dashboard/administration/reminders',
		label: 'Recordatorios',
		icon: Clock,
	},
	{
		href: '/dashboard/administration/consultations',
		label: 'Consultas',
		icon: FileText,
	},
	{
		href: '/dashboard/administration/services',
		label: 'Servicios',
		icon: Settings2,
	},
	{
		href: '/dashboard/administration/documents',
		label: 'Documentos',
		icon: FileText,
	},
	{
		href: '/dashboard/administration/settings',
		label: 'Configuración',
		icon: Settings,
	},
];

export function AdministrationSidebar() {
	const pathname = usePathname() ?? '/';
    const router = useRouter();
	const [openMenus, setOpenMenus] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        const handleExternalToggle = () => {
            setIsMobileMenuOpen(true);
        };

        window.addEventListener('toggle-admin-sidebar', handleExternalToggle);
        return () => window.removeEventListener('toggle-admin-sidebar', handleExternalToggle);
    }, []);

	const toggleMenu = (label: string) => {
		setOpenMenus((prev) => (prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]));
	};

	// Normalize path
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

    const handleSignOut = async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

	const renderLink = (link: LinkItem) => {
		const isActive = !!link.href && isPathActive(link.href);
		const isComing = !!link.comingSoon;

		if (link.submenu) {
			const childActive = link.submenu.some((l) => isPathActive(l.href));
			const isOpen = openMenus.includes(link.label) || childActive;

			return (
				<li key={link.label}>
					<button
						onClick={() => toggleMenu(link.label)}
						className={`group flex items-center justify-between w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition
						${isOpen ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
						<span className="flex items-center gap-2 sm:gap-3 min-w-0">
							{link.icon && <link.icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isOpen ? 'text-white' : 'text-blue-600'}`} />}
							<span className="truncate">{link.label}</span>
						</span>
						<ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
					</button>

					<ul className={`pl-6 sm:pl-8 mt-1 flex flex-col gap-0.5 sm:gap-1 transition-[max-height] duration-200 overflow-hidden ${isOpen ? 'max-h-60' : 'max-h-0'}`}>
						{link.submenu.map((sub) => {
							const subActive = isPathActive(sub.href);
							return (
								<li key={sub.label}>
									<Link
										href={sub.href!}
										className={`group block px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition
											${subActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
										<span className="truncate block">{sub.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</li>
			);
		}

		return (
			<li key={link.label}>
				<Link
					href={link.href!}
					className={`group flex items-center gap-2 sm:gap-3 w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition
					${isActive ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>
					{link.icon && <link.icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />}
					<span className="truncate">{link.label}</span>
				</Link>
			</li>
		);
	};

    const SidebarContent = () => (
        <div className="flex flex-col gap-3 sm:gap-4 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg ring-1 ring-slate-100 border border-slate-50 h-fit">
            {/* Brand */}
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md ring-1 ring-white/20 flex-shrink-0">AD</div>
                <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate uppercase tracking-tight">ASHIRA</div>
                    <div className="text-[10px] sm:text-[12px] text-emerald-600 font-medium truncate uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">Administración</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <input placeholder="Buscar sección..." className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-slate-100 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition" />
                <SearchIcon className="absolute right-2.5 sm:right-3 top-1.5 sm:top-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            </div>

            {/* Navigation */}
            <nav className="mt-1">
                <ul className="flex flex-col gap-0.5 sm:gap-1">
                    {LINKS.map(renderLink)}
                </ul>
            </nav>

            {/* Logout */}
            <div className="mt-2 sm:mt-3 pt-2 border-t border-slate-100">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );

    if (!mounted) return null;

	return (
		<>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden fixed top-20 left-4 z-40 p-2.5 bg-white text-blue-600 rounded-xl shadow-xl border border-slate-100 active:scale-95 transition-transform"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar View */}
            <aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-50 md:sticky md:top-6 transform transition-transform duration-300 ease-in-out w-64 md:w-64 lg:w-68 self-start px-4 md:px-0 py-20 md:py-0",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="md:hidden absolute top-4 right-8 z-[60]">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white rounded-lg shadow-md text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <SidebarContent />
            </aside>
        </>
	);
}
