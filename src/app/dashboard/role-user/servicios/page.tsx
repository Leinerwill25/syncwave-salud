'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Plus, Edit2, Trash2, Loader2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getRoleUserSession, type RoleUserSession, roleNameEquals } from '@/lib/role-user-auth-client';

type Service = {
	id: string;
	name: string;
	description: string | null;
	price: number | string;
	currency: string;
	is_active?: boolean;
};

type ServiceCombo = {
	id: string;
	name: string;
	description: string | null;
	price: number | string;
	currency: string;
	serviceIds: string[];
	is_active?: boolean;
};

const CURRENCIES = [
	{ value: 'USD', label: 'USD ($)' },
	{ value: 'VES', label: 'VES (Bs.)' },
	{ value: 'EUR', label: 'EUR (€)' },
];

export default function RoleUserServicesPage() {
	const [services, setServices] = useState<Service[]>([]);
	const [combos, setCombos] = useState<ServiceCombo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [session, setSession] = useState<RoleUserSession | null>(null);

	// Solo "Asistente De Citas" puede editar; "Recepción" solo ve
	const canEdit = session ? roleNameEquals(session.roleName, 'Asistente De Citas') : false;

	// Form state para servicios individuales
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formPrice, setFormPrice] = useState('');
	const [formCurrency, setFormCurrency] = useState('USD');

	// Form state para combos de servicios
	const [comboName, setComboName] = useState('');
	const [comboDescription, setComboDescription] = useState('');
	const [comboPrice, setComboPrice] = useState('');
	const [comboCurrency, setComboCurrency] = useState('USD');
	const [comboServiceIds, setComboServiceIds] = useState<string[]>([]);
	const [editingComboId, setEditingComboId] = useState<string | null>(null);
	const [isAddingCombo, setIsAddingCombo] = useState(false);

	const loadServices = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/role-users/services', {
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar servicios');
			}

			setServices((data.services || []) as Service[]);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error cargando servicios:', err);
			setError(err.message || 'Error al cargar servicios');
		} finally {
			setLoading(false);
		}
	};

	const loadCombos = async () => {
		try {
			const res = await fetch('/api/role-users/service-combos', {
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar combos de servicios');
			}

			setCombos((data.combos || []) as ServiceCombo[]);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error cargando combos:', err);
		}
	};

	useEffect(() => {
		const load = async () => {
			try {
				const s = await getRoleUserSession();
				setSession(s);
			} catch (err) {
				console.error('[RoleUserServicesPage] Error cargando sesión de role-user:', err);
			} finally {
				// Siempre intentamos cargar servicios y combos (GET es permitido para ambos roles)
				loadServices();
				loadCombos();
			}
		};
		load();
	}, []);

	const resetForm = () => {
		setFormName('');
		setFormDescription('');
		setFormPrice('');
		setFormCurrency('USD');
	};

	const resetComboForm = () => {
		setComboName('');
		setComboDescription('');
		setComboPrice('');
		setComboCurrency('USD');
		setComboServiceIds([]);
		setEditingComboId(null);
		setIsAddingCombo(false);
	};

	const handleAdd = () => {
		if (!canEdit) return;
		setIsAdding(true);
		setEditingId(null);
		resetForm();
		setError(null);
		setSuccess(null);
	};

	const handleEdit = (service: Service) => {
		if (!canEdit) return;
		const numericPrice = Number(typeof service.price === 'string' ? service.price.replace(',', '.') : service.price);
		setEditingId(service.id);
		setIsAdding(false);
		setFormName(service.name);
		setFormDescription(service.description || '');
		setFormPrice(Number.isNaN(numericPrice) ? '' : numericPrice.toString());
		setFormCurrency(service.currency || 'USD');
		setError(null);
		setSuccess(null);
	};

	const handleCancel = () => {
		setIsAdding(false);
		setEditingId(null);
		resetForm();
		setError(null);
		setSuccess(null);
	};

	const handleSave = async () => {
		if (!canEdit) {
			return;
		}
		if (!formName.trim()) {
			setError('El nombre del servicio es requerido');
			return;
		}

		const priceValue = Number(formPrice.replace(',', '.'));
		if (Number.isNaN(priceValue) || priceValue < 0) {
			setError('El precio debe ser un número válido mayor o igual a 0');
			return;
		}

		try {
			setError(null);
			setSuccess(null);

			if (isAdding) {
				// Crear nuevo servicio
				const res = await fetch('/api/role-users/services', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim() || null,
						price: priceValue,
						currency: formCurrency,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al crear servicio');
				}

				setSuccess('Servicio creado correctamente');
				setIsAdding(false);
			} else if (editingId) {
				// Actualizar servicio existente
				const res = await fetch(`/api/role-users/services/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim() || null,
						price: priceValue,
						currency: formCurrency,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al actualizar servicio');
				}

				setSuccess('Servicio actualizado correctamente');
				setEditingId(null);
			}

			resetForm();
			await loadServices();

			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error guardando servicio:', err);
			setError(err.message || 'Error al guardar servicio');
		}
	};

	const handleDelete = async (id: string) => {
		if (!canEdit) return;
		if (!confirm('¿Está seguro de que desea eliminar (desactivar) este servicio?')) {
			return;
		}

		try {
			setError(null);
			setSuccess(null);

			const res = await fetch(`/api/role-users/services/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(data.error || 'Error al eliminar servicio');
			}

			setSuccess('Servicio eliminado correctamente');
			await loadServices();

			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error eliminando servicio:', err);
			setError(err.message || 'Error al eliminar servicio');
		}
	};

	// Manejo de combos de servicios (solo asistente de citas puede crear)
	const toggleServiceInCombo = (serviceId: string) => {
		setComboServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
	};

	const handleAddCombo = () => {
		if (!canEdit) return;
		setIsAddingCombo(true);
		setEditingComboId(null);
		resetComboForm();
		setError(null);
		setSuccess(null);
	};

	const handleEditCombo = (combo: ServiceCombo) => {
		if (!canEdit) return;
		const numericPrice = Number(typeof combo.price === 'string' ? combo.price.replace(',', '.') : combo.price);
		setEditingComboId(combo.id);
		setIsAddingCombo(false);
		setComboName(combo.name);
		setComboDescription(combo.description || '');
		setComboPrice(Number.isNaN(numericPrice) ? '' : numericPrice.toString());
		setComboCurrency(combo.currency || 'USD');
		setComboServiceIds(combo.serviceIds || []);
		setError(null);
		setSuccess(null);
	};

	const handleCancelCombo = () => {
		setIsAddingCombo(false);
		setEditingComboId(null);
		resetComboForm();
		setError(null);
		setSuccess(null);
	};

	const handleDeleteCombo = async (id: string) => {
		if (!canEdit) return;
		if (!confirm('¿Está seguro de que desea eliminar (desactivar) este combo de servicios?')) {
			return;
		}

		try {
			setError(null);
			setSuccess(null);

			const res = await fetch(`/api/role-users/service-combos/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(data.error || 'Error al eliminar combo');
			}

			setSuccess('Combo eliminado correctamente');
			await loadCombos();

			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error eliminando combo:', err);
			setError(err.message || 'Error al eliminar combo');
		}
	};

	const handleSaveCombo = async () => {
		if (!canEdit) return;

		if (!comboName.trim()) {
			setError('El nombre del combo es obligatorio.');
			return;
		}

		if (!comboPrice.trim()) {
			setError('El precio del combo es obligatorio.');
			return;
		}

		const numericPrice = Number(comboPrice.replace(',', '.'));
		if (Number.isNaN(numericPrice) || numericPrice < 0) {
			setError('El precio del combo debe ser un número válido mayor o igual a 0.');
			return;
		}

		if (comboServiceIds.length === 0) {
			setError('Debes seleccionar al menos un servicio individual para armar el combo.');
			return;
		}

		try {
			setError(null);
			setSuccess(null);

			if (isAddingCombo) {
				// Crear nuevo combo
				const res = await fetch('/api/role-users/service-combos', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: comboName.trim(),
						description: comboDescription.trim() || null,
						price: numericPrice,
						currency: comboCurrency,
						serviceIds: comboServiceIds,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al crear el combo de servicios');
				}

				setSuccess('Combo creado correctamente');
				setIsAddingCombo(false);
			} else if (editingComboId) {
				// Actualizar combo existente
				const res = await fetch(`/api/role-users/service-combos/${editingComboId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: comboName.trim(),
						description: comboDescription.trim() || null,
						price: numericPrice,
						currency: comboCurrency,
						serviceIds: comboServiceIds,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al actualizar el combo de servicios');
				}

				setSuccess('Combo actualizado correctamente');
				setEditingComboId(null);
			}

			resetComboForm();
			await loadCombos();

			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('[RoleUserServicesPage] Error guardando combo:', err);
			setError(err.message || 'Error al guardar el combo de servicios');
		}
	};

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
								<Stethoscope className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Servicios del consultorio</h1>
								<p className="text-sm sm:text-base text-slate-600 mt-1.5">{canEdit ? 'Registra y administra los servicios médicos y sus precios que ofrece el consultorio.' : 'Visualiza los servicios configurados y sus precios para este consultorio.'}</p>
							</div>
						</div>
					</div>

					{canEdit && !isAdding && !editingId && (
						<button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-md hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/30">
							<Plus className="w-5 h-5" />
							<span>Agregar servicio</span>
						</button>
					)}
				</div>
			</motion.div>

			{/* Messages */}
			{(error || success) && (
				<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
					{error && (
						<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
							<p className="text-sm text-red-800">{error}</p>
						</div>
					)}
					{success && (
						<div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-center gap-3">
							<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
							<p className="text-sm text-green-800">{success}</p>
						</div>
					)}
				</motion.div>
			)}

			{/* Add/Edit Form - Servicios individuales */}
			{canEdit && (isAdding || editingId) && (
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
					<h2 className="text-lg font-semibold text-slate-900 mb-4">{isAdding ? 'Agregar servicio' : 'Editar servicio'}</h2>

					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Nombre del servicio <span className="text-red-500">*</span>
								</label>
								<input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Consulta general, Control prenatal, Ecografía" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Precio <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="Ej: 50.00" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
									<select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
										{CURRENCIES.map((c) => (
											<option key={c.value} value={c.value}>
												{c.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Descripción (opcional)</label>
							<textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Breve descripción del servicio, condiciones especiales, duración, etc." rows={3} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
						</div>

						<div className="flex items-center gap-3 pt-2">
							<button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
								<Save className="w-4 h-4" />
								Guardar
							</button>
							<button onClick={handleCancel} className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
								<X className="w-4 h-4" />
								Cancelar
							</button>
						</div>
					</div>
				</motion.div>
			)}

			{/* Listado de servicios individuales */}
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
				{loading ? (
					<div className="p-8 sm:p-10">
						<div className="flex items-center gap-3 text-slate-600">
							<Loader2 className="animate-spin w-5 h-5" />
							<span className="font-medium">Cargando servicios del consultorio...</span>
						</div>
					</div>
				) : services.length === 0 ? (
					<div className="p-12 sm:p-16 text-center">
						<div className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center text-teal-600 shadow-lg">
							<Stethoscope size={32} />
						</div>
						<p className="text-xl font-semibold text-slate-900 mb-2">No hay servicios configurados</p>
						<p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{canEdit ? 'Agrega los servicios que ofrece el consultorio para que el médico y el asistente puedan usarlos al registrar citas y consultas.' : 'Aún no hay servicios configurados para este consultorio. Contacta al Asistente de Citas para que los registre.'}</p>
						{canEdit && (
							<button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-md hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all">
								<Plus className="w-5 h-5" />
								Agregar primer servicio
							</button>
						)}
					</div>
				) : (
					<div className="divide-y divide-slate-200">
						{services.map((service, index) => (
							<motion.div key={service.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
								{editingId === service.id ? (
									<div className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-slate-700 mb-2">
													Nombre del servicio <span className="text-red-500">*</span>
												</label>
												<input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
											</div>
											<div>
												<label className="block text-sm font-medium text-slate-700 mb-2">Precio</label>
												<div className="flex gap-2">
													<input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
													<select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
														{CURRENCIES.map((c) => (
															<option key={c.value} value={c.value}>
																{c.value}
															</option>
														))}
													</select>
												</div>
											</div>
										</div>
										<div>
											<label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
											<textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
										</div>
										<div className="flex gap-2">
											<button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
												<Save className="w-4 h-4 inline mr-2" />
												Guardar
											</button>
											<button onClick={handleCancel} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
												<X className="w-4 h-4 inline mr-2" />
												Cancelar
											</button>
										</div>
									</div>
								) : (
									<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1.5">
												<h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
													{(() => {
														const numericPrice = Number(typeof service.price === 'string' ? service.price.replace(',', '.') : service.price);
														return Number.isNaN(numericPrice) ? '-' : `${numericPrice.toFixed(2)} ${service.currency}`;
													})()}
												</span>
											</div>
											{service.description && <p className="text-sm text-slate-600 mt-1">{service.description}</p>}
										</div>
										{canEdit && (
											<div className="flex items-center gap-2">
												<button onClick={() => handleEdit(service)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Editar">
													<Edit2 className="w-5 h-5" />
												</button>
												<button onClick={() => handleDelete(service.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
													<Trash2 className="w-5 h-5" />
												</button>
											</div>
										)}
									</div>
								)}
							</motion.div>
						))}
					</div>
				)}
			</motion.div>

			{/* Sección de combos de servicios */}
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-10 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
				<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
							<Stethoscope className="w-5 h-5 text-teal-600" />
							Combos de servicios
						</h2>
						<p className="text-xs sm:text-sm text-slate-600 mt-1">Agrupa varios servicios individuales en un paquete promocional con un precio especial.</p>
					</div>
					{services.length > 0 && <p className="text-xs text-slate-500">{canEdit ? 'Como Asistente de Citas puedes crear combos usando los servicios individuales configurados.' : 'Los combos son configurados por el médico o el asistente de citas y se muestran aquí para consulta.'}</p>}
				</div>

				{/* Botón para agregar combo */}
				{canEdit && services.length > 0 && !isAddingCombo && !editingComboId && (
					<div className="mb-6 flex justify-end">
						<button onClick={handleAddCombo} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1">
							<Plus className="w-4 h-4" />
							Agregar combo
						</button>
					</div>
				)}

				{/* Formulario para crear/editar combos - solo asistente de citas */}
				{canEdit && services.length > 0 && (isAddingCombo || editingComboId) && (
					<div className="mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50/60">
						<h3 className="text-sm font-semibold text-slate-900 mb-3">{isAddingCombo ? 'Crear nuevo combo' : 'Editar combo'}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Nombre del combo <span className="text-red-500">*</span>
								</label>
								<input type="text" value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="Ej: Paquete de control prenatal" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Precio promocional <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input type="text" value={comboPrice} onChange={(e) => setComboPrice(e.target.value)} placeholder="Ej: 80.00" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
									<select value={comboCurrency} onChange={(e) => setComboCurrency(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs">
										{CURRENCIES.map((c) => (
											<option key={c.value} value={c.value}>
												{c.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
						<div className="mb-4">
							<label className="block text-xs font-medium text-slate-700 mb-1">Descripción del combo (opcional)</label>
							<textarea value={comboDescription} onChange={(e) => setComboDescription(e.target.value)} rows={2} placeholder="Describe brevemente qué incluye este combo y en qué casos se recomienda." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none" />
						</div>
						<div className="mb-4">
							<label className="block text-xs font-medium text-slate-700 mb-2">
								Selecciona los servicios individuales que formarán parte del combo <span className="text-red-500">*</span>
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
								{services.map((service) => (
									<label key={service.id} className="flex items-start gap-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
										<input type="checkbox" className="mt-0.5" checked={comboServiceIds.includes(service.id)} onChange={() => toggleServiceInCombo(service.id)} />
										<span>
											<span className="font-semibold block">{service.name}</span>
											{service.description && <span className="text-[11px] text-slate-500 block truncate">{service.description}</span>}
										</span>
									</label>
								))}
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button onClick={handleCancelCombo} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1">
								<X className="w-4 h-4" />
								Cancelar
							</button>
							<button onClick={handleSaveCombo} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1">
								<Save className="w-4 h-4" />
								{isAddingCombo ? 'Guardar combo' : 'Actualizar combo'}
							</button>
						</div>
					</div>
				)}

				{combos.length === 0 ? (
					<div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">No hay combos configurados todavía.</div>
				) : (
					<div className="space-y-4">
						{combos.map((combo) => {
							const numericPrice = Number(typeof combo.price === 'string' ? combo.price.replace(',', '.') : combo.price);
							const includedServices = services.filter((s) => (combo.serviceIds || []).includes(s.id));

							const isEditing = editingComboId === combo.id;

							return (
								<div key={combo.id} className="border border-slate-200 rounded-xl p-4">
									{isEditing ? (
										<div className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<label className="block text-xs font-medium text-slate-700 mb-1">
														Nombre del combo <span className="text-red-500">*</span>
													</label>
													<input type="text" value={comboName} onChange={(e) => setComboName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-700 mb-1">
														Precio promocional <span className="text-red-500">*</span>
													</label>
													<div className="flex gap-2">
														<input type="text" value={comboPrice} onChange={(e) => setComboPrice(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
														<select value={comboCurrency} onChange={(e) => setComboCurrency(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs">
															{CURRENCIES.map((c) => (
																<option key={c.value} value={c.value}>
																	{c.label}
																</option>
															))}
														</select>
													</div>
												</div>
											</div>
											<div>
												<label className="block text-xs font-medium text-slate-700 mb-1">Descripción del combo (opcional)</label>
												<textarea value={comboDescription} onChange={(e) => setComboDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none" />
											</div>
											<div>
												<label className="block text-xs font-medium text-slate-700 mb-2">
													Selecciona los servicios individuales que formarán parte del combo <span className="text-red-500">*</span>
												</label>
												<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
													{services.map((service) => (
														<label key={service.id} className="flex items-start gap-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
															<input type="checkbox" className="mt-0.5" checked={comboServiceIds.includes(service.id)} onChange={() => toggleServiceInCombo(service.id)} />
															<span>
																<span className="font-semibold block">{service.name}</span>
																{service.description && <span className="text-[11px] text-slate-500 block truncate">{service.description}</span>}
															</span>
														</label>
													))}
												</div>
											</div>
											<div className="flex justify-end gap-2">
												<button onClick={handleCancelCombo} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
													<X className="w-4 h-4" />
													Cancelar
												</button>
												<button onClick={handleSaveCombo} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
													<Save className="w-4 h-4" />
													Actualizar combo
												</button>
											</div>
										</div>
									) : (
										<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1.5">
													<h3 className="text-sm font-semibold text-slate-900">{combo.name}</h3>
												</div>
												{combo.description && <p className="text-xs text-slate-600 mb-2">{combo.description}</p>}
												{includedServices.length > 0 && (
													<div className="mt-1">
														<p className="text-[11px] font-semibold text-slate-700 mb-1">Servicios incluidos:</p>
														<ul className="flex flex-wrap gap-1 text-[11px] text-slate-600">
															{includedServices.map((s) => (
																<li key={s.id} className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
																	{s.name}
																</li>
															))}
														</ul>
													</div>
												)}
											</div>
											<div className="flex items-center gap-3">
												<div className="flex flex-col items-end gap-1 min-w-[140px]">
													<span className="text-sm font-semibold text-teal-700">{Number.isNaN(numericPrice) ? '-' : `${numericPrice.toFixed(2)} ${combo.currency}`}</span>
												</div>
												{canEdit && (
													<div className="flex items-center gap-2">
														<button onClick={() => handleEditCombo(combo)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Editar combo">
															<Edit2 className="w-5 h-5" />
														</button>
														<button onClick={() => handleDeleteCombo(combo.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar combo">
															<Trash2 className="w-5 h-5" />
														</button>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</motion.div>
		</div>
	);
}
