'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Edit2, Trash2, Loader2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';

type PaymentMethod = {
	id: string;
	name: string;
	description: string | null;
	is_active: boolean;
	created_at: string;
};

export default function PaymentMethodsPage() {
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);

	// Form states
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');

	useEffect(() => {
		loadPaymentMethods();
	}, []);

	const loadPaymentMethods = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/role-users/payment-methods', {
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar métodos de pago');
			}

			setPaymentMethods(data.paymentMethods || []);
		} catch (err: any) {
			console.error('Error cargando métodos de pago:', err);
			setError(err.message || 'Error al cargar métodos de pago');
		} finally {
			setLoading(false);
		}
	};

	const handleAdd = () => {
		setIsAdding(true);
		setFormName('');
		setFormDescription('');
		setError(null);
		setSuccess(null);
	};

	const handleEdit = (method: PaymentMethod) => {
		setEditingId(method.id);
		setFormName(method.name);
		setFormDescription(method.description || '');
		setIsAdding(false);
		setError(null);
		setSuccess(null);
	};

	const handleCancel = () => {
		setIsAdding(false);
		setEditingId(null);
		setFormName('');
		setFormDescription('');
		setError(null);
		setSuccess(null);
	};

	const handleSave = async () => {
		if (!formName.trim()) {
			setError('El nombre es requerido');
			return;
		}

		try {
			setError(null);
			setSuccess(null);

			if (isAdding) {
				// Crear nuevo
				const res = await fetch('/api/role-users/payment-methods', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim() || null,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al crear método de pago');
				}

				setSuccess('Método de pago creado exitosamente');
				setIsAdding(false);
			} else if (editingId) {
				// Actualizar existente
				const res = await fetch(`/api/role-users/payment-methods/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim() || null,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || 'Error al actualizar método de pago');
				}

				setSuccess('Método de pago actualizado exitosamente');
				setEditingId(null);
			}

			setFormName('');
			setFormDescription('');
			await loadPaymentMethods();

			// Limpiar mensaje de éxito después de 3 segundos
			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('Error guardando método de pago:', err);
			setError(err.message || 'Error al guardar método de pago');
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm('¿Está seguro de que desea eliminar este método de pago?')) {
			return;
		}

		try {
			setError(null);
			const res = await fetch(`/api/role-users/payment-methods/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al eliminar método de pago');
			}

			setSuccess('Método de pago eliminado exitosamente');
			await loadPaymentMethods();

			setTimeout(() => setSuccess(null), 3000);
		} catch (err: any) {
			console.error('Error eliminando método de pago:', err);
			setError(err.message || 'Error al eliminar método de pago');
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
								<CreditCard className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Métodos de Pago</h1>
								<p className="text-sm sm:text-base text-slate-600 mt-1.5">Gestiona los métodos de pago personalizados para tu consultorio</p>
							</div>
						</div>
					</div>

					{!isAdding && !editingId && (
						<button
							onClick={handleAdd}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-md hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
						>
							<Plus className="w-5 h-5" />
							<span>Agregar Método</span>
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

			{/* Add/Edit Form */}
			{(isAdding || editingId) && (
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
					<h2 className="text-lg font-semibold text-slate-900 mb-4">{isAdding ? 'Agregar Método de Pago' : 'Editar Método de Pago'}</h2>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Nombre <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="Ej: Transferencia, Pago Móvil, Efectivo"
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Descripción (opcional)</label>
							<textarea
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Información adicional sobre el método de pago"
								rows={3}
								className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
							/>
						</div>

						<div className="flex items-center gap-3 pt-2">
							<button
								onClick={handleSave}
								className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
							>
								<Save className="w-4 h-4" />
								Guardar
							</button>
							<button
								onClick={handleCancel}
								className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
							>
								<X className="w-4 h-4" />
								Cancelar
							</button>
						</div>
					</div>
				</motion.div>
			)}

			{/* List */}
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
				{loading ? (
					<div className="p-8 sm:p-10">
						<div className="flex items-center gap-3 text-slate-600">
							<Loader2 className="animate-spin w-5 h-5" />
							<span className="font-medium">Cargando métodos de pago...</span>
						</div>
					</div>
				) : paymentMethods.length === 0 ? (
					<div className="p-12 sm:p-16 text-center">
						<div className="mx-auto mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center text-teal-600 shadow-lg">
							<CreditCard size={32} />
						</div>
						<p className="text-xl font-semibold text-slate-900 mb-2">No hay métodos de pago configurados</p>
						<p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">Agrega métodos de pago personalizados para usar en las consultas.</p>
						<button
							onClick={handleAdd}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold shadow-md hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all"
						>
							<Plus className="w-5 h-5" />
							Agregar Primer Método
						</button>
					</div>
				) : (
					<div className="divide-y divide-slate-200">
						{paymentMethods.map((method, index) => (
							<motion.div
								key={method.id}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.05 }}
								className="p-4 sm:p-6 hover:bg-slate-50 transition-colors"
							>
								{editingId === method.id ? (
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-slate-700 mb-2">
												Nombre <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={formName}
												onChange={(e) => setFormName(e.target.value)}
												className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
											<textarea
												value={formDescription}
												onChange={(e) => setFormDescription(e.target.value)}
												rows={2}
												className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
											/>
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
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<h3 className="text-lg font-semibold text-slate-900">{method.name}</h3>
											{method.description && <p className="text-sm text-slate-600 mt-1">{method.description}</p>}
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => handleEdit(method)}
												className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
												title="Editar"
											>
												<Edit2 className="w-5 h-5" />
											</button>
											<button
												onClick={() => handleDelete(method.id)}
												className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
												title="Eliminar"
											>
												<Trash2 className="w-5 h-5" />
											</button>
										</div>
									</div>
								)}
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	);
}

