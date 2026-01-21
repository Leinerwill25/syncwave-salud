'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, X, Save, Check, AlertCircle, Power, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
	id: string;
	role_name: string;
	role_description: string | null;
	is_active: boolean;
	created_at: string;
	users: RoleUser[];
	permissions: RolePermission[];
}

interface RoleUser {
	id: string;
	first_name: string;
	last_name: string;
	identifier: string;
	email: string | null;
	phone: string | null;
	is_active: boolean;
}

interface RolePermission {
	id: string;
	module: string;
	permissions: Record<string, boolean>;
}

const AVAILABLE_MODULES = [
	{ value: 'pacientes', label: 'Pacientes' },
	{ value: 'consultas', label: 'Consultas' },
	{ value: 'citas', label: 'Citas' },
	{ value: 'recetas', label: 'Recetas' },
	{ value: 'ordenes', label: 'Órdenes Médicas' },
	{ value: 'resultados', label: 'Resultados' },
	{ value: 'mensajes', label: 'Mensajes' },
	{ value: 'tareas', label: 'Tareas' },
	{ value: 'reportes', label: 'Reportes' },
];

const AVAILABLE_PERMISSIONS = [
	{ key: 'view', label: 'Ver' },
	{ key: 'create', label: 'Crear' },
	{ key: 'edit', label: 'Editar' },
	{ key: 'delete', label: 'Eliminar' },
	{ key: 'confirm', label: 'Confirmar' },
	{ key: 'schedule', label: 'Agendar' },
	{ key: 'cancel', label: 'Cancelar' },
];

export default function RolesManagementPage() {
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Estados para crear/editar rol
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);
	const [roleName, setRoleName] = useState('');
	const [roleDescription, setRoleDescription] = useState('');
	const [selectedPermissions, setSelectedPermissions] = useState<Record<string, Record<string, boolean>>>({});

	// Estados para usuarios del rol
	const [isUserModalOpen, setIsUserModalOpen] = useState(false);
	const [selectedRoleForUser, setSelectedRoleForUser] = useState<Role | null>(null);
	const [userFirstName, setUserFirstName] = useState('');
	const [userLastName, setUserLastName] = useState('');
	const [userIdentifier, setUserIdentifier] = useState('');
	const [userEmail, setUserEmail] = useState('');
	const [userPhone, setUserPhone] = useState('');
	const [userPassword, setUserPassword] = useState('');
	const [showUserPassword, setShowUserPassword] = useState(false);

	useEffect(() => {
		loadRoles();
	}, []);

	const loadRoles = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/medic/roles', { credentials: 'include' });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al cargar roles');
			}
			const data = await res.json();
			setRoles(data.roles || []);
		} catch (err) {
			console.error('Error cargando roles:', err);
			setError(err instanceof Error ? err.message : 'Error al cargar roles');
		} finally {
			setLoading(false);
		}
	};

	// Roles predeterminados
	const PREDEFINED_ROLES = {
		'Asistente De Citas': {
			roleName: 'Asistente De Citas',
			roleDescription: 'Rol para gestionar citas: crear y editar citas (agendar citas)',
			permissions: {
				citas: {
					view: true,
					create: true,
					edit: true,
					delete: false,
					confirm: false,
					schedule: true,
					cancel: false,
				},
			},
		},
		'Recepción': {
			roleName: 'Recepción',
			roleDescription: 'Rol para recepción: visualizar citas, editar estados (reagendada, cancelada, en proceso), gestionar servicios y montos cobrados con motivos',
			permissions: {
				citas: {
					view: true,
					create: false,
					edit: true,
					delete: false,
					confirm: false,
					schedule: false,
					cancel: true,
				},
				consultas: {
					view: true,
					create: false,
					edit: false,
					delete: false,
				},
			},
		},
	};

	const handleCreateRole = () => {
		setRoleName('');
		setRoleDescription('');
		setSelectedPermissions({});
		setIsCreateModalOpen(true);
	};

	const handleSelectPredefinedRole = (roleKey: keyof typeof PREDEFINED_ROLES) => {
		const predefined = PREDEFINED_ROLES[roleKey];
		setRoleName(predefined.roleName);
		setRoleDescription(predefined.roleDescription);
		setSelectedPermissions(predefined.permissions);
	};

	const handleEditRole = (role: Role) => {
		setEditingRole(role);
		setRoleName(role.role_name);
		setRoleDescription(role.role_description || '');
		
		// Cargar permisos existentes
		const perms: Record<string, Record<string, boolean>> = {};
		role.permissions.forEach((perm) => {
			perms[perm.module] = perm.permissions;
		});
		setSelectedPermissions(perms);
		setIsEditModalOpen(true);
	};

	const handleSaveRole = async () => {
		if (!roleName.trim()) {
			setError('El nombre del rol es requerido');
			return;
		}

		try {
			setError(null);
			const permissions = Object.entries(selectedPermissions).map(([module, perms]) => ({
				module,
				permissions: perms,
			}));

			const url = editingRole ? `/api/medic/roles/${editingRole.id}` : '/api/medic/roles';
			const method = editingRole ? 'PATCH' : 'POST';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					roleName: roleName.trim(),
					roleDescription: roleDescription.trim() || null,
					permissions,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al guardar el rol');
			}

			setSuccess(editingRole ? 'Rol actualizado correctamente' : 'Rol creado correctamente');
			setIsCreateModalOpen(false);
			setIsEditModalOpen(false);
			setEditingRole(null);
			loadRoles();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar el rol');
		}
	};

	const handleDeleteRole = async (roleId: string) => {
		if (!confirm('¿Estás seguro de que deseas desactivar este rol? Todos los usuarios asociados también serán desactivados.')) {
			return;
		}

		try {
			const res = await fetch(`/api/medic/roles/${roleId}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al desactivar el rol');
			}

			setSuccess('Rol desactivado correctamente');
			loadRoles();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al desactivar el rol');
		}
	};

	const handleAddUser = (role: Role) => {
		setSelectedRoleForUser(role);
		setUserFirstName('');
		setUserLastName('');
		setUserIdentifier('');
		setUserEmail('');
		setUserPhone('');
		setUserPassword('');
		setShowUserPassword(false);
		setIsUserModalOpen(true);
	};

	const handleSaveUser = async () => {
		if (!userFirstName.trim() || !userLastName.trim() || !userIdentifier.trim()) {
			setError('Nombre, apellido e identificación son requeridos');
			return;
		}

		if (!userEmail.trim()) {
			setError('El correo electrónico es obligatorio');
			return;
		}

		// Validar formato de email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(userEmail.trim())) {
			setError('El correo electrónico no tiene un formato válido');
			return;
		}

		if (!userPassword.trim() || userPassword.length < 8) {
			setError('La contraseña es requerida y debe tener al menos 8 caracteres');
			return;
		}

		if (!selectedRoleForUser) return;

		try {
			setError(null);
			const res = await fetch(`/api/medic/roles/${selectedRoleForUser.id}/users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					firstName: userFirstName.trim(),
					lastName: userLastName.trim(),
					identifier: userIdentifier.trim(),
					email: userEmail.trim() || null,
					phone: userPhone.trim() || null,
					password: userPassword.trim(),
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al agregar el usuario');
			}

			setSuccess('Usuario agregado al rol correctamente');
			setIsUserModalOpen(false);
			setSelectedRoleForUser(null);
			loadRoles();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al agregar el usuario');
		}
	};

	const togglePermission = (module: string, permission: string) => {
		setSelectedPermissions((prev) => {
			// Crear una copia profunda del estado anterior
			const newPerms = { ...prev };
			
			// Si el módulo no existe, crearlo
			if (!newPerms[module]) {
				newPerms[module] = {};
			} else {
				// Crear una copia del objeto de permisos del módulo
				newPerms[module] = { ...newPerms[module] };
			}
			
			// Toggle del permiso específico
			newPerms[module][permission] = !(newPerms[module][permission] || false);
			
			return newPerms;
		});
	};

	const handleToggleUserStatus = async (roleId: string, userId: string, currentStatus: boolean) => {
		const newStatus = !currentStatus;
		const action = newStatus ? 'habilitar' : 'deshabilitar';
		
		if (!confirm(`¿Estás seguro de que deseas ${action} a este usuario? ${!newStatus ? 'El usuario no podrá iniciar sesión mientras esté deshabilitado.' : ''}`)) {
			return;
		}

		try {
			setError(null);
			const res = await fetch(`/api/medic/roles/${roleId}/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					isActive: newStatus,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || `Error al ${action} el usuario`);
			}

			setSuccess(`Usuario ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`);
			loadRoles();
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : `Error al ${action} el usuario`);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
						<Shield className="w-8 h-8 text-teal-600" />
						Gestión de Roles Internos
					</h1>
					<p className="text-sm text-slate-600 mt-2">Crea y gestiona roles para tu consultorio privado</p>
				</div>
				<button
					onClick={handleCreateRole}
					className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition shadow-md"
				>
					<Plus className="w-5 h-5" />
					<span className="hidden sm:inline">Crear Rol</span>
				</button>
			</div>

			{/* Mensajes */}
			<AnimatePresence>
				{error && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-800">{error}</p>
						<button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
							<X className="w-4 h-4" />
						</button>
					</motion.div>
				)}
				{success && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
						<Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-green-800">{success}</p>
						<button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
							<X className="w-4 h-4" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Lista de Roles */}
			{roles.length === 0 ? (
				<div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
					<Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600 mb-4">No hay roles creados aún</p>
					<button onClick={handleCreateRole} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
						Crear tu primer rol
					</button>
				</div>
			) : (
				<div className="grid gap-6">
					{roles.map((role) => (
						<div key={role.id} className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<h3 className="text-xl font-bold text-slate-900 mb-1">{role.role_name}</h3>
									{role.role_description && <p className="text-sm text-slate-600">{role.role_description}</p>}
								</div>
								<div className="flex items-center gap-2">
									<button onClick={() => handleAddUser(role)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition" title="Agregar usuario">
										<Users className="w-5 h-5" />
									</button>
									<button onClick={() => handleEditRole(role)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar rol">
										<Edit2 className="w-5 h-5" />
									</button>
									<button onClick={() => handleDeleteRole(role.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Desactivar rol">
										<Trash2 className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Usuarios del rol */}
							<div className="mb-4">
								<h4 className="text-sm font-semibold text-slate-700 mb-2">Usuarios ({role.users.length})</h4>
								{role.users.length === 0 ? (
									<p className="text-sm text-slate-500">No hay usuarios asignados</p>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{role.users.map((user) => (
											<div key={user.id} className={`p-3 rounded-lg border-2 transition-all ${
												user.is_active 
													? 'bg-slate-50 border-slate-200' 
													: 'bg-slate-100 border-slate-300 opacity-75'
											}`}>
												<div className="flex items-start justify-between gap-2 mb-2">
													<div className="flex-1 min-w-0">
														<p className={`font-medium ${user.is_active ? 'text-slate-900' : 'text-slate-600'}`}>
															{user.first_name} {user.last_name}
														</p>
														<p className="text-xs text-slate-600">C.I.: {user.identifier}</p>
														{user.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
													</div>
													<button
														onClick={() => handleToggleUserStatus(role.id, user.id, user.is_active)}
														className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
															user.is_active
																? 'text-green-600 hover:bg-green-50'
																: 'text-red-600 hover:bg-red-50'
														}`}
														title={user.is_active ? 'Deshabilitar usuario' : 'Habilitar usuario'}
													>
														{user.is_active ? (
															<Power className="w-4 h-4" />
														) : (
															<PowerOff className="w-4 h-4" />
														)}
													</button>
												</div>
												<div className="flex items-center gap-2 mt-2">
													<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
														user.is_active
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}>
														{user.is_active ? 'Activo' : 'Deshabilitado'}
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Permisos del rol */}
							<div>
								<h4 className="text-sm font-semibold text-slate-700 mb-2">Permisos</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{role.permissions.map((perm) => (
										<div key={perm.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
											<p className="font-medium text-blue-900 mb-1">{AVAILABLE_MODULES.find((m) => m.value === perm.module)?.label || perm.module}</p>
											<div className="flex flex-wrap gap-1">
												{Object.entries(perm.permissions)
													.filter(([, enabled]) => enabled)
													.map(([key]) => (
														<span key={key} className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
															{AVAILABLE_PERMISSIONS.find((p) => p.key === key)?.label || key}
														</span>
													))}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Modal Crear/Editar Rol */}
			<AnimatePresence>
				{(isCreateModalOpen || isEditModalOpen) && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
						<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
							<div className="p-6 border-b border-slate-200 flex items-center justify-between">
								<h2 className="text-xl font-bold text-slate-900">{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
								<button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingRole(null); }} className="text-slate-400 hover:text-slate-600">
									<X className="w-6 h-6" />
								</button>
							</div>

							<div className="p-6 space-y-6">
								{/* Roles Predeterminados - Solo mostrar al crear, no al editar */}
								{!editingRole && (
									<div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4 mb-4">
										<label className="block text-sm font-semibold text-slate-700 mb-3">Selecciona un Rol Predeterminado</label>
										<p className="text-xs text-slate-600 mb-3">Al seleccionar un rol predeterminado, se creará automáticamente con todas sus funcionalidades configuradas.</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<button
												type="button"
												onClick={async () => {
													setError(null);
													try {
														// Verificar si el rol ya existe (solo roles activos de la organización actual)
														// La comparación debe ser exacta y solo considerar roles activos
														const roleNameToCheck = PREDEFINED_ROLES['Asistente De Citas'].roleName.trim();
														const existingRoles = roles.filter((r) => 
															r.is_active === true && 
															r.role_name?.trim() === roleNameToCheck
														);
														
														if (existingRoles.length > 0) {
															setError(`El rol "${roleNameToCheck}" ya existe en tu consultorio`);
															return;
														}

														const permissions = Object.entries(PREDEFINED_ROLES['Asistente De Citas'].permissions).map(([module, perms]) => ({
															module,
															permissions: perms,
														}));

														const res = await fetch('/api/medic/roles', {
															method: 'POST',
															headers: { 'Content-Type': 'application/json' },
															credentials: 'include',
															body: JSON.stringify({
																roleName: PREDEFINED_ROLES['Asistente De Citas'].roleName,
																roleDescription: PREDEFINED_ROLES['Asistente De Citas'].roleDescription,
																permissions,
															}),
														});

														if (!res.ok) {
															const data = await res.json();
															// Si es un error 409 (conflicto), el rol ya existe
															if (res.status === 409) {
																setError(`El rol "${PREDEFINED_ROLES['Asistente De Citas'].roleName}" ya existe en tu consultorio`);
																return;
															}
															throw new Error(data.error || 'Error al crear el rol');
														}

														setSuccess('Rol "Asistente De Citas" creado correctamente');
														setIsCreateModalOpen(false);
														loadRoles();
														setTimeout(() => setSuccess(null), 3000);
													} catch (err) {
														setError(err instanceof Error ? err.message : 'Error al crear el rol');
													}
												}}
												className="text-left p-4 bg-white border-2 border-teal-300 rounded-lg hover:border-teal-500 hover:shadow-md transition-all"
											>
												<div className="font-semibold text-slate-900 mb-1">Asistente De Citas</div>
												<div className="text-xs text-slate-600 mb-2">Crear y editar citas</div>
												<div className="text-xs text-teal-600 font-medium">✓ Crear citas</div>
												<div className="text-xs text-teal-600 font-medium">✓ Editar citas</div>
											</button>
											<button
												type="button"
												onClick={async () => {
													setError(null);
													try {
														// Verificar si el rol ya existe (solo roles activos de la organización actual)
														// La comparación debe ser exacta y solo considerar roles activos
														const roleNameToCheck = PREDEFINED_ROLES['Recepción'].roleName.trim();
														const existingRoles = roles.filter((r) => 
															r.is_active === true && 
															r.role_name?.trim() === roleNameToCheck
														);
														
														if (existingRoles.length > 0) {
															setError(`El rol "${roleNameToCheck}" ya existe en tu consultorio`);
															return;
														}

														const permissions = Object.entries(PREDEFINED_ROLES['Recepción'].permissions).map(([module, perms]) => ({
															module,
															permissions: perms,
														}));

														const res = await fetch('/api/medic/roles', {
															method: 'POST',
															headers: { 'Content-Type': 'application/json' },
															credentials: 'include',
															body: JSON.stringify({
																roleName: PREDEFINED_ROLES['Recepción'].roleName,
																roleDescription: PREDEFINED_ROLES['Recepción'].roleDescription,
																permissions,
															}),
														});

														if (!res.ok) {
															const data = await res.json();
															// Si es un error 409 (conflicto), el rol ya existe
															if (res.status === 409) {
																setError(`El rol "${PREDEFINED_ROLES['Recepción'].roleName}" ya existe en tu consultorio`);
																return;
															}
															throw new Error(data.error || 'Error al crear el rol');
														}

														setSuccess('Rol "Recepción" creado correctamente');
														setIsCreateModalOpen(false);
														loadRoles();
														setTimeout(() => setSuccess(null), 3000);
													} catch (err) {
														setError(err instanceof Error ? err.message : 'Error al crear el rol');
													}
												}}
												className="text-left p-4 bg-white border-2 border-teal-300 rounded-lg hover:border-teal-500 hover:shadow-md transition-all"
											>
												<div className="font-semibold text-slate-900 mb-1">Recepción</div>
												<div className="text-xs text-slate-600 mb-2">Gestionar citas, servicios y pagos</div>
												<div className="text-xs text-teal-600 font-medium">✓ Ver citas</div>
												<div className="text-xs text-teal-600 font-medium">✓ Editar estados</div>
												<div className="text-xs text-teal-600 font-medium">✓ Gestionar servicios</div>
												<div className="text-xs text-teal-600 font-medium">✓ Editar montos</div>
											</button>
										</div>
										<div className="mt-4 pt-4 border-t border-teal-200">
											<p className="text-xs text-slate-500 italic">Nota: Los roles se crean automáticamente con permisos predefinidos. Puedes editarlos después si es necesario.</p>
										</div>
									</div>
								)}

								{/* Solo mostrar campos editables si se está editando un rol existente */}
								{editingRole && (
									<>
										<div>
											<label className="block text-sm font-semibold text-slate-700 mb-2">Nombre del Rol *</label>
											<input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Ej: Asistente, Recepcionista" />
										</div>

										<div>
											<label className="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
											<textarea value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Descripción del rol y sus responsabilidades" />
										</div>

										<div>
											<label className="block text-sm font-semibold text-slate-700 mb-4">Permisos por Módulo</label>
											<div className="space-y-4">
												{AVAILABLE_MODULES.map((module) => (
													<div key={module.value} className="border border-slate-200 rounded-lg p-4">
														<h4 className="font-medium text-slate-900 mb-3">{module.label}</h4>
														<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
															{AVAILABLE_PERMISSIONS.map((perm) => {
																const isChecked = selectedPermissions[module.value]?.[perm.key] === true;
																return (
																	<label key={`${module.value}-${perm.key}`} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition">
																		<input
																			type="checkbox"
																			checked={isChecked}
																			onChange={(e) => {
																				e.stopPropagation();
																				togglePermission(module.value, perm.key);
																			}}
																			onClick={(e) => e.stopPropagation()}
																			className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
																		/>
																		<span className="text-sm text-slate-700 select-none">{perm.label}</span>
																	</label>
																);
															})}
														</div>
													</div>
												))}
											</div>
										</div>
									</>
								)}
							</div>

							{/* Solo mostrar botones de guardar/cancelar si se está editando */}
							{editingRole && (
								<div className="p-6 border-t border-slate-200 flex justify-end gap-3">
									<button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingRole(null); }} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition">
										Cancelar
									</button>
									<button onClick={handleSaveRole} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition flex items-center gap-2">
										<Save className="w-4 h-4" />
										Guardar
									</button>
								</div>
							)}

							{/* Si no se está editando, mostrar solo botón de cerrar */}
							{!editingRole && (
								<div className="p-6 border-t border-slate-200 flex justify-end gap-3">
									<button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingRole(null); }} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition">
										Cerrar
									</button>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Modal Agregar Usuario */}
			<AnimatePresence>
				{isUserModalOpen && selectedRoleForUser && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
						<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
							<div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
								<h2 className="text-lg sm:text-xl font-bold text-slate-900 pr-4">Agregar Usuario a "{selectedRoleForUser.role_name}"</h2>
								<button onClick={() => { setIsUserModalOpen(false); setSelectedRoleForUser(null); }} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
									<X className="w-5 h-5 sm:w-6 sm:h-6" />
								</button>
							</div>

							<div className="p-4 sm:p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">Nombre *</label>
										<input type="text" value={userFirstName} onChange={(e) => setUserFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">Apellido *</label>
										<input type="text" value={userLastName} onChange={(e) => setUserLastName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">Cédula de Identidad *</label>
										<input type="text" value={userIdentifier} onChange={(e) => setUserIdentifier(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">
											Email <span className="text-red-500">*</span>
										</label>
										<input
											type="email"
											value={userEmail}
											onChange={(e) => setUserEmail(e.target.value)}
											className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
											required
											placeholder="usuario@ejemplo.com"
										/>
										<p className="text-xs text-slate-500 mt-1">El usuario usará este email para iniciar sesión</p>
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">Teléfono (opcional)</label>
										<input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña *</label>
										<div className="relative">
											<input
												type={showUserPassword ? 'text' : 'password'}
												value={userPassword}
												onChange={(e) => setUserPassword(e.target.value)}
												className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-12 transition"
												placeholder="Mínimo 8 caracteres"
												minLength={8}
											/>
											<button
												type="button"
												onClick={() => setShowUserPassword(!showUserPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
											>
												{showUserPassword ? (
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.02.153-2.006.44-2.941M3 3l18 18M9.88 9.88a3 3 0 004.24 4.24" />
													</svg>
												) : (
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												)}
											</button>
										</div>
										<p className="text-xs text-slate-500 mt-1">El usuario usará esta contraseña para iniciar sesión con su cédula o email</p>
									</div>
								</div>
							</div>

							<div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white">
								<button onClick={() => { setIsUserModalOpen(false); setSelectedRoleForUser(null); }} className="w-full sm:w-auto px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition font-medium">
									Cancelar
								</button>
								<button onClick={handleSaveUser} className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition font-medium shadow-md">
									Agregar Usuario
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

