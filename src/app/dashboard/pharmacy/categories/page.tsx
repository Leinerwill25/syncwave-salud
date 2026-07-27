// app/dashboard/pharmacy/categories/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
	Tags,
	Plus,
	Edit2,
	Trash2,
	Search,
	Loader2,
	X,
	Info,
	Check
} from 'lucide-react';
import axios from 'axios';

type Category = {
	id: string;
	name: string;
	description: string | null;
	emoji: string | null;
	is_featured: boolean;
	created_at: string;
};

export default function CategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [error, setError] = useState<string | null>(null);

	// Form/Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [emoji, setEmoji] = useState('💊');
	const [isFeatured, setIsFeatured] = useState(false);

	useEffect(() => {
		fetchCategories();
	}, []);

	async function fetchCategories() {
		try {
			setLoading(true);
			setError(null);
			const res = await axios.get('/api/pharmacy/categories');
			if (res.data?.success && Array.isArray(res.data?.data)) {
				setCategories(res.data.data);
			} else {
				throw new Error('Formato de datos no válido');
			}
		} catch (err: any) {
			console.error('Error fetching categories:', err);
			setError(err?.response?.data?.message || 'Error al cargar las categorías');
		} finally {
			setLoading(false);
		}
	}

	function handleOpenCreate() {
		setEditingCategory(null);
		setName('');
		setDescription('');
		setEmoji('💊');
		setIsFeatured(false);
		setIsModalOpen(true);
	}

	function handleOpenEdit(cat: Category) {
		setEditingCategory(cat);
		setName(cat.name);
		setDescription(cat.description || '');
		setEmoji(cat.emoji || '💊');
		setIsFeatured(cat.is_featured);
		setIsModalOpen(true);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setSubmitting(true);
		setError(null);

		const payload = {
			name: name.trim(),
			description: description.trim() || null,
			emoji: emoji.trim() || null,
			is_featured: isFeatured
		};

		try {
			if (editingCategory) {
				// Update
				const res = await axios.put(`/api/pharmacy/categories/${editingCategory.id}`, payload);
				if (res.data?.success) {
					setCategories(prev =>
						prev.map(c => (c.id === editingCategory.id ? res.data.data : c))
					);
					setIsModalOpen(false);
				}
			} else {
				// Create
				const res = await axios.post('/api/pharmacy/categories', payload);
				if (res.data?.success) {
					setCategories(prev => [res.data.data, ...prev]);
					setIsModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error('Error saving category:', err);
			setError(err?.response?.data?.message || 'Error al guardar la categoría');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(catId: string, catName: string) {
		if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${catName}"? Esto desvinculará sus productos asociados.`)) {
			return;
		}

		try {
			setError(null);
			const res = await axios.delete(`/api/pharmacy/categories/${catId}`);
			if (res.data?.success) {
				setCategories(prev => prev.filter(c => c.id !== catId));
			}
		} catch (err: any) {
			console.error('Error deleting category:', err);
			setError(err?.response?.data?.message || 'Error al eliminar la categoría');
		}
	}

	const filteredCategories = categories.filter(c =>
		c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
						<Tags className="w-8 h-8 text-purple-600 shrink-0" />
						Categorías de Productos
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Crea y edita las líneas de productos para organizar tu catálogo de cara al público.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-lg shadow-purple-900/10 transition-all text-sm cursor-pointer shrink-0"
				>
					<Plus className="w-4 h-4" />
					Nueva Categoría
				</button>
			</div>

			{/* Main Content Card */}
			<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-6">
				{/* Search & Stats */}
				<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
					<div className="relative w-full sm:max-w-md">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Buscar categorías por nombre o descripción..."
							className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
						/>
					</div>
					<div className="text-xs text-slate-400 font-medium self-end sm:self-auto">
						Mostrando {filteredCategories.length} de {categories.length} categorías
					</div>
				</div>

				{/* Error Alert */}
				{error && (
					<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 animate-in slide-in-from-top duration-300">
						<Info className="w-4 h-4 shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				{/* Categories Table/List */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
						<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
						<p className="text-sm font-medium">Cargando categorías...</p>
					</div>
				) : filteredCategories.length === 0 ? (
					<div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
						<Tags className="w-10 h-10 text-slate-300 mx-auto mb-3" />
						<h3 className="text-slate-700 font-bold text-base">No se encontraron categorías</h3>
						<p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
							{searchQuery ? 'Prueba refinando la búsqueda o con otros términos.' : 'Comienza agregando tu primera categoría usando el botón de arriba.'}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto -mx-5 sm:mx-0">
						<table className="w-full text-left border-collapse text-sm">
							<thead>
								<tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider bg-slate-50/50">
									<th className="py-3 px-5 rounded-l-xl">Emoji</th>
									<th className="py-3 px-3">Nombre</th>
									<th className="py-3 px-3">Descripción</th>
									<th className="py-3 px-3">Destacada</th>
									<th className="py-3 px-5 rounded-r-xl text-right">Acciones</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredCategories.map(cat => (
									<tr key={cat.id} className="hover:bg-slate-50/40 group transition-colors">
										<td className="py-4 px-5">
											<span className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl shadow-sm border border-purple-100/50 shrink-0">
												{cat.emoji || '📦'}
											</span>
										</td>
										<td className="py-4 px-3 font-semibold text-slate-800">
											{cat.name}
										</td>
										<td className="py-4 px-3 text-slate-500 max-w-xs truncate">
											{cat.description || <span className="text-slate-300 italic">Sin descripción</span>}
										</td>
										<td className="py-4 px-3">
											{cat.is_featured ? (
												<span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
													<Check className="w-3 h-3" /> Sí
												</span>
											) : (
												<span className="text-xs text-slate-400">No</span>
											)}
										</td>
										<td className="py-4 px-5 text-right whitespace-nowrap">
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() => handleOpenEdit(cat)}
													className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
													title="Editar categoría"
												>
													<Edit2 className="w-4 h-4" />
												</button>
												<button
													type="button"
													onClick={() => handleDelete(cat.id, cat.name)}
													className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
													title="Eliminar categoría"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Create/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
					<div
						className="absolute inset-0"
						onClick={() => !submitting && setIsModalOpen(false)}
					/>
					<div className="relative bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-full">
						<button
							type="button"
							disabled={submitting}
							onClick={() => setIsModalOpen(false)}
							className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
						>
							<X className="w-5 h-5" />
						</button>

						<h2 className="text-lg font-bold text-slate-900 pr-10">
							{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
						</h2>
						<p className="text-xs text-slate-500 mt-1">
							{editingCategory ? 'Modifica los detalles de la categoría actual.' : 'Rellena los datos para añadir una nueva categoría a tu catálogo.'}
						</p>

						<form onSubmit={handleSubmit} className="mt-6 space-y-4 overflow-y-auto pr-1">
							{/* Emoji & Name row */}
							<div className="grid grid-cols-4 gap-4">
								<div className="col-span-1">
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Emoji
									</label>
									<input
										type="text"
										value={emoji}
										onChange={e => setEmoji(e.target.value)}
										placeholder="💊"
										maxLength={4}
										required
										className="w-full text-center py-2.5 border-2 border-slate-200 rounded-xl bg-white text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
								<div className="col-span-3">
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Nombre
									</label>
									<input
										type="text"
										value={name}
										onChange={e => setName(e.target.value)}
										placeholder="Ej: Analgésicos"
										required
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
							</div>

							{/* Description */}
							<div>
								<label className="block text-xs font-semibold text-slate-700 mb-1.5">
									Descripción
								</label>
								<textarea
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder="Describe qué tipos de productos pertenecen a esta categoría..."
									rows={3}
									className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition resize-none"
								/>
							</div>

							{/* Featured Switch */}
							<label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/70 transition">
								<input
									type="checkbox"
									checked={isFeatured}
									onChange={e => setIsFeatured(e.target.checked)}
									className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
								/>
								<div>
									<h4 className="text-xs font-bold text-slate-800">Categoría Destacada</h4>
									<p className="text-[10px] text-slate-500 mt-0.5">Se priorizará en los filtros rápidos en el sitio web público.</p>
								</div>
							</label>

							{/* Actions */}
							<div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
								<button
									type="button"
									disabled={submitting}
									onClick={() => setIsModalOpen(false)}
									className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold transition cursor-pointer disabled:opacity-50"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={submitting || !name.trim()}
									className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-900/10 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
								>
									{submitting ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Guardando...
										</>
									) : (
										'Guardar'
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
