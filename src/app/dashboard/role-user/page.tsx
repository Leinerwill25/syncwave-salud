'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	CalendarDays,
	User,
	ClipboardList,
	FileText,
	MessageCircle,
	CheckSquare,
	Folder,
	FileCheck,
	Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { hasRoleUserPermission, getRoleUserAccessibleModules } from '@/lib/role-user-auth-client';

interface RoleUserSession {
	roleUserId: string;
	roleId: string;
	organizationId: string;
	firstName: string;
	lastName: string;
	identifier: string;
	roleName: string;
	permissions: Array<{
		id: string;
		module: string;
		permissions: Record<string, boolean>;
	}>;
}

const MODULE_CONFIG = [
	{ value: 'pacientes', label: 'Pacientes', icon: User, href: '/dashboard/role-user/pacientes' },
	{ value: 'consultas', label: 'Consultas', icon: ClipboardList, href: '/dashboard/role-user/consultas' },
	{ value: 'citas', label: 'Citas', icon: CalendarDays, href: '/dashboard/role-user/citas' },
	{ value: 'recetas', label: 'Recetas', icon: FileText, href: '/dashboard/role-user/recetas' },
	{ value: 'ordenes', label: 'Órdenes Médicas', icon: FileCheck, href: '/dashboard/role-user/ordenes' },
	{ value: 'resultados', label: 'Resultados', icon: Folder, href: '/dashboard/role-user/resultados' },
	{ value: 'mensajes', label: 'Mensajes', icon: MessageCircle, href: '/dashboard/role-user/mensajes' },
	{ value: 'tareas', label: 'Tareas', icon: CheckSquare, href: '/dashboard/role-user/tareas' },
	{ value: 'reportes', label: 'Reportes', icon: FileText, href: '/dashboard/role-user/reportes' },
];

export default function RoleUserDashboard() {
	const router = useRouter();
	const [session, setSession] = useState<RoleUserSession | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSession();
	}, []);

	const loadSession = async () => {
		try {
			const res = await fetch('/api/role-users/login', {
				credentials: 'include',
			});

			if (!res.ok) {
				router.push('/login/role-user');
				return;
			}

			const data = await res.json();
			if (data.authenticated && data.user) {
				setSession({
					roleUserId: data.user.id,
					roleId: data.user.role.id,
					organizationId: data.user.organizationId,
					firstName: data.user.firstName,
					lastName: data.user.lastName,
					identifier: data.user.identifier,
					roleName: data.user.role.name,
					permissions: data.user.permissions || [],
				});
			} else {
				router.push('/login/role-user');
			}
		} catch (err) {
			console.error('[Role User Dashboard] Error:', err);
			router.push('/login/role-user');
		} finally {
			setLoading(false);
		}
	};


	if (loading || !session) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
			</div>
		);
	}

	const accessibleModules = getRoleUserAccessibleModules(session);

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6"
			>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Panel General</h1>
				<p className="text-sm sm:text-base text-slate-600 mt-1">
					Bienvenido, {session.firstName} {session.lastName} — Rol: <span className="font-semibold text-teal-600">{session.roleName}</span>
				</p>
			</motion.div>

			{/* Módulos Accesibles */}
			<div>
				<h2 className="text-xl font-bold text-slate-900 mb-4">Módulos Disponibles</h2>
					{accessibleModules.length === 0 ? (
						<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
							<Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
							<p className="text-slate-600">No tienes acceso a ningún módulo. Contacta al administrador.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{MODULE_CONFIG.filter((module) => accessibleModules.includes(module.value)).map((module, index) => {
								const Icon = module.icon;
								const canView = hasRoleUserPermission(session, module.value as any, 'view');
								const canCreate = hasRoleUserPermission(session, module.value as any, 'create');

								return (
									<motion.div
										key={module.value}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1 }}
									>
										<a
											href={module.href}
											className="block bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg hover:border-teal-300 transition-all group"
										>
											<div className="flex items-start justify-between mb-4">
												<div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
													<Icon className="w-6 h-6 text-white" />
												</div>
												<div className="flex gap-1">
													{canView && (
														<span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Ver</span>
													)}
													{canCreate && (
														<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Crear</span>
													)}
												</div>
											</div>
											<h3 className="text-lg font-semibold text-slate-900 mb-2">{module.label}</h3>
											<p className="text-sm text-slate-600">
												{canView && canCreate
													? 'Puedes ver y crear registros'
													: canView
													? 'Puedes ver registros'
													: canCreate
													? 'Puedes crear registros'
													: 'Acceso limitado'}
											</p>
										</a>
									</motion.div>
								);
							})}
						</div>
					)}
				</div>
		</div>
	);
}

