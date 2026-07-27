// app/dashboard/pharmacy/products/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
	Pill,
	Plus,
	Search,
	Loader2,
	X,
	Edit2,
	Trash2,
	AlertTriangle,
	Eye,
	Globe,
	Info,
	Check,
	Upload,
	ChevronDown,
	ChevronUp,
	Package,
	DollarSign
} from 'lucide-react';
import axios from 'axios';

type Category = {
	id: string;
	name: string;
	emoji: string | null;
};

type Medication = {
	id: string;
	inn: string;
	concentration: string | null;
	pharmaceutical_form: string | null;
	therapeutic_class: string | null;
	is_controlled: boolean;
};

type Product = {
	id: string;
	name: string;
	medication_id: string | null;
	category_id: string | null;
	description: string | null;
	image_url: string | null;
	availability: 'in_stock' | 'out_of_stock';
	is_featured: boolean;
	currency: 'USD' | 'EUR' | 'BS' | null;
	price: number | null;
	bultos: number | null;
	units_per_bulto: number | null;
	stock_units: number | null;
	discount_pct: number | null;
	expiry_date: string | null;
	medication_catalog: Medication | null;
	pharmacy_categories: Category | null;
};

export default function ProductsPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [selectedAvailability, setSelectedAvailability] = useState('');

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	
	// Form fields
	const [name, setName] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [description, setDescription] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [availability, setAvailability] = useState<'in_stock' | 'out_of_stock'>('in_stock');
	const [isFeatured, setIsFeatured] = useState(false);
	const [currency, setCurrency] = useState<'USD' | 'EUR' | 'BS'>('USD');
	const [price, setPrice] = useState('');
	
	// Private inventory fields (collapsible)
	const [showInventoryFields, setShowInventoryFields] = useState(false);
	const [bultos, setBultos] = useState('');
	const [unitsPerBulto, setUnitsPerBulto] = useState('');
	const [stockUnits, setStockUnits] = useState('');
	const [discountPct, setDiscountPct] = useState('');
	const [expiryDate, setExpiryDate] = useState('');

	// Settings & Audit notes
	const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(false);
	const [auditNote, setAuditNote] = useState('');

	// Reception Modal State
	const [isReceptionOpen, setIsReceptionOpen] = useState(false);
	const [receptionProduct, setReceptionProduct] = useState<Product | null>(null);
	const [invoicedQty, setInvoicedQty] = useState('');
	const [receivedQty, setReceivedQty] = useState('');
	const [rejectedQty, setRejectedQty] = useState(0);
	const [rejectionReason, setRejectionReason] = useState('');
	const [receptionSubmitting, setReceptionSubmitting] = useState(false);

	// Autocomplete Molecule State
	const [moleculeQuery, setMoleculeQuery] = useState('');
	const [moleculeSuggestions, setMoleculeSuggestions] = useState<Medication[]>([]);
	const [selectedMolecule, setSelectedMolecule] = useState<Medication | null>(null);
	const [searchingMolecules, setSearchingMolecules] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const suggestionRef = useRef<HTMLDivElement>(null);

	// Image uploading state
	const [uploadingImage, setUploadingImage] = useState(false);

	useEffect(() => {
		fetchData();
	}, []);

	// Click outside molecule suggestions
	useEffect(() => {
		const inv = Number(invoicedQty || 0);
		const rec = Number(receivedQty || 0);
		if (rec < inv) {
			setRejectedQty(inv - rec);
		} else {
			setRejectedQty(0);
			setRejectionReason('');
		}
	}, [invoicedQty, receivedQty]);

	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	async function fetchData() {
		try {
			setLoading(true);
			setError(null);
			const [prodRes, catRes, siteRes] = await Promise.all([
				axios.get('/api/pharmacy/products'),
				axios.get('/api/pharmacy/categories'),
				axios.get('/api/pharmacy/site')
			]);

			if (prodRes.data?.success && Array.isArray(prodRes.data?.data)) {
				setProducts(prodRes.data.data);
			}
			if (catRes.data?.success && Array.isArray(catRes.data?.data)) {
				setCategories(catRes.data.data);
			}
			if (siteRes.data?.success && siteRes.data?.data) {
				setInventoryTrackingEnabled(!!siteRes.data.data.inventory_tracking_enabled);
			}
		} catch (err: any) {
			console.error('Error fetching products/categories/site:', err);
			setError(err?.response?.data?.message || 'Error al cargar los productos');
		} finally {
			setLoading(false);
		}
	}

	// Fetch molecules for autocomplete
	useEffect(() => {
		if (moleculeQuery.trim().length < 2) {
			setMoleculeSuggestions([]);
			return;
		}

		const delayDebounce = setTimeout(async () => {
			try {
				setSearchingMolecules(true);
				const res = await axios.get(`/api/pharmacy/catalog/search?q=${encodeURIComponent(moleculeQuery)}`);
				if (res.data?.success && Array.isArray(res.data?.data)) {
					setMoleculeSuggestions(res.data.data);
					setShowSuggestions(true);
				}
			} catch (err) {
				console.error('Error searching molecules:', err);
			} finally {
				setSearchingMolecules(false);
			}
		}, 300);

		return () => clearTimeout(delayDebounce);
	}, [moleculeQuery]);

	// Direct stock toggle from table
	async function toggleAvailability(product: Product) {
		const newStatus = product.availability === 'in_stock' ? 'out_of_stock' : 'in_stock';
		try {
			// Update locally first for instant feedback
			setProducts(prev =>
				prev.map(p => (p.id === product.id ? { ...p, availability: newStatus } : p))
			);

			const payload = {
				name: product.name,
				medication_id: product.medication_id,
				category_id: product.category_id,
				description: product.description,
				image_url: product.image_url,
				availability: newStatus,
				is_featured: product.is_featured,
				currency: product.currency,
				price: product.price,
				bultos: product.bultos,
				units_per_bulto: product.units_per_bulto,
				stock_units: product.stock_units,
				discount_pct: product.discount_pct,
				expiry_date: product.expiry_date,
				audit_note: `Cambio rápido de disponibilidad a ${newStatus === 'in_stock' ? 'En Stock' : 'Agotado'}`
			};

			const res = await axios.put(`/api/pharmacy/products/${product.id}`, payload);
			if (!res.data?.success) {
				// Revert if error
				setProducts(prev =>
					prev.map(p => (p.id === product.id ? product : p))
				);
			}
		} catch (err) {
			console.error('Error toggling product stock status:', err);
			// Revert on catch
			setProducts(prev =>
				prev.map(p => (p.id === product.id ? product : p))
			);
		}
	}

	function handleOpenCreate() {
		setEditingProduct(null);
		setName('');
		setCategoryId('');
		setDescription('');
		setImageUrl('');
		setAvailability('in_stock');
		setIsFeatured(false);
		setCurrency('USD');
		setPrice('');
		
		// Reset inventory
		setBultos('');
		setUnitsPerBulto('');
		setStockUnits('');
		setDiscountPct('');
		setExpiryDate('');
		setShowInventoryFields(false);

		// Reset molecule search
		setMoleculeQuery('');
		setSelectedMolecule(null);
		setMoleculeSuggestions([]);
		
		setIsModalOpen(true);
	}

	function handleOpenEdit(prod: Product) {
		setEditingProduct(prod);
		setName(prod.name);
		setCategoryId(prod.category_id || '');
		setDescription(prod.description || '');
		setImageUrl(prod.image_url || '');
		setAvailability(prod.availability);
		setIsFeatured(prod.is_featured);
		setCurrency(prod.currency || 'USD');
		setPrice(prod.price !== null ? String(prod.price) : '');

		// Inventory
		setBultos(prod.bultos !== null ? String(prod.bultos) : '');
		setUnitsPerBulto(prod.units_per_bulto !== null ? String(prod.units_per_bulto) : '');
		setStockUnits(prod.stock_units !== null ? String(prod.stock_units) : '');
		setDiscountPct(prod.discount_pct !== null ? String(prod.discount_pct) : '');
		setExpiryDate(prod.expiry_date || '');
		
		// If some inventory fields are filled, keep section expanded
		if (prod.bultos || prod.units_per_bulto || prod.stock_units || prod.expiry_date) {
			setShowInventoryFields(true);
		} else {
			setShowInventoryFields(false);
		}

		// Molecule setup
		if (prod.medication_catalog) {
			setSelectedMolecule(prod.medication_catalog);
			setMoleculeQuery(prod.medication_catalog.inn);
		} else {
			setSelectedMolecule(null);
			setMoleculeQuery('');
		}
		setMoleculeSuggestions([]);

		setAuditNote('');
		setIsModalOpen(true);
	}

	async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setUploadingImage(true);
		setError(null);

		const formData = new FormData();
		formData.append('file', files[0]);
		formData.append('photo_type', 'products');

		try {
			const res = await axios.post('/api/clinic/upload-photo', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});
			if (res.data?.url) {
				setImageUrl(res.data.url);
			}
		} catch (err: any) {
			console.error('Error uploading image:', err);
			setError(err?.response?.data?.error || 'Error al subir la imagen.');
		} finally {
			setUploadingImage(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setSubmitting(true);
		setError(null);

		const payload: any = {
			name: name.trim(),
			medication_id: selectedMolecule?.id || null,
			category_id: categoryId || null,
			description: description.trim() || null,
			image_url: imageUrl || null,
			availability,
			is_featured: isFeatured,
			currency,
			price: price ? Number(price) : null,
			bultos: bultos ? Number(bultos) : null,
			units_per_bulto: unitsPerBulto ? Number(unitsPerBulto) : null,
			stock_units: stockUnits ? Number(stockUnits) : null,
			discount_pct: discountPct ? Number(discountPct) : null,
			expiry_date: expiryDate || null
		};

		if (editingProduct) {
			payload.audit_note = auditNote.trim();
		}

		try {
			if (editingProduct) {
				// Update
				const res = await axios.put(`/api/pharmacy/products/${editingProduct.id}`, payload);
				if (res.data?.success) {
					setProducts(prev =>
						prev.map(p => (p.id === editingProduct.id ? res.data.data : p))
					);
					setIsModalOpen(false);
				}
			} else {
				// Create
				const res = await axios.post('/api/pharmacy/products', payload);
				if (res.data?.success) {
					setProducts(prev => [res.data.data, ...prev]);
					setIsModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error('Error saving product:', err);
			setError(err?.response?.data?.message || 'Error al guardar el producto');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(prodId: string, prodName: string) {
		if (!confirm(`¿Estás seguro de que deseas eliminar "${prodName}" del inventario?`)) {
			return;
		}

		try {
			setError(null);
			const res = await axios.delete(`/api/pharmacy/products/${prodId}`);
			if (res.data?.success) {
				setProducts(prev => prev.filter(p => p.id !== prodId));
			}
		} catch (err: any) {
			console.error('Error deleting product:', err);
			setError(err?.response?.data?.message || 'Error al eliminar el producto');
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
			setShowSuggestions(false);
		}
	}

	async function handleReceptionSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!receptionProduct) return;
		
		const inv = Number(invoicedQty);
		const rec = Number(receivedQty);
		
		if (isNaN(inv) || inv <= 0 || isNaN(rec) || rec <= 0) {
			setError('Las cantidades deben ser mayores que cero');
			return;
		}
		
		if (rec > inv) {
			setError('La cantidad recibida no puede superar la facturada');
			return;
		}
		
		if (rec < inv && !rejectionReason.trim()) {
			setError('El motivo del rechazo es obligatorio para faltantes');
			return;
		}
		
		setReceptionSubmitting(true);
		setError(null);
		
		try {
			const res = await axios.post('/api/pharmacy/receptions', {
				product_id: receptionProduct.id,
				invoiced_qty: inv,
				received_qty: rec,
				rejected_qty: inv - rec,
				rejection_reason: inv - rec > 0 ? rejectionReason.trim() : null
			});
			
			if (res.data?.success) {
				// Update product stock and bultos locally
				setProducts(prev =>
					prev.map(p => {
						if (p.id === receptionProduct.id) {
							const currentStock = Number(p.stock_units || 0);
							const newStock = currentStock + rec;
							const unitsPerBulto = p.units_per_bulto ? Number(p.units_per_bulto) : 0;
							const newBultos = unitsPerBulto > 0 ? Math.floor(newStock / unitsPerBulto) : null;
							return {
								...p,
								stock_units: newStock,
								bultos: newBultos
							};
						}
						return p;
					})
				);
				setIsReceptionOpen(false);
			}
		} catch (err: any) {
			console.error('Error recording reception:', err);
			setError(err?.response?.data?.message || 'Error al procesar la recepción');
		} finally {
			setReceptionSubmitting(false);
		}
	}

	function selectMolecule(mol: Medication) {
		setSelectedMolecule(mol);
		setMoleculeQuery(mol.inn);
		setShowSuggestions(false);

		// Prefill description or name if empty
		if (!description.trim()) {
			setDescription(`Presentación de: ${mol.inn} ${mol.concentration || ''} en ${mol.pharmaceutical_form || ''}`);
		}
	}

	function removeSelectedMolecule() {
		setSelectedMolecule(null);
		setMoleculeQuery('');
		setMoleculeSuggestions([]);
	}

	const filteredProducts = products.filter(p => {
		const matchesSearch =
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(p.medication_catalog && p.medication_catalog.inn.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

		const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
		const matchesAvailability = selectedAvailability ? p.availability === selectedAvailability : true;

		return matchesSearch && matchesCategory && matchesAvailability;
	});

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
						<Pill className="w-8 h-8 text-purple-600 shrink-0" />
						Catálogo e Inventario
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Administra tus medicamentos e inventario. Tienes stock rápido y vinculación al vademécum nacional.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleOpenCreate}
						className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-lg shadow-purple-900/10 transition-all text-sm cursor-pointer shrink-0"
					>
						<Plus className="w-4 h-4" />
						Nuevo Producto
					</button>
				</div>
			</div>

			{/* Main Grid */}
			<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-6">
				{/* Search, Filter & Stats */}
				<div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Buscar por nombre comercial, principio activo o descripción..."
							className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
						/>
					</div>
					<div className="flex flex-wrap gap-2.5 items-center">
						{/* Category selector */}
						<select
							value={selectedCategory}
							onChange={e => setSelectedCategory(e.target.value)}
							className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
						>
							<option value="">Todas las Categorías</option>
							{categories.map(c => (
								<option key={c.id} value={c.id}>
									{c.emoji || '📦'} {c.name}
								</option>
							))}
						</select>

						{/* Stock status selector */}
						<select
							value={selectedAvailability}
							onChange={e => setSelectedAvailability(e.target.value)}
							className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
						>
							<option value="">Todo el Stock</option>
							<option value="in_stock">En Stock</option>
							<option value="out_of_stock">Agotados</option>
						</select>

						<div className="text-xs text-slate-400 font-medium ml-2">
							{filteredProducts.length} de {products.length} productos
						</div>
					</div>
				</div>

				{/* Error Alert */}
				{error && (
					<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 animate-in slide-in-from-top duration-300">
						<Info className="w-4 h-4 shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				{/* Products list */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
						<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
						<p className="text-sm font-medium">Cargando inventario...</p>
					</div>
				) : filteredProducts.length === 0 ? (
					<div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
						<Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
						<h3 className="text-slate-700 font-bold text-base">No se encontraron productos</h3>
						<p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
							{searchQuery || selectedCategory || selectedAvailability 
								? 'Prueba limpiando los filtros o realizando otra búsqueda.' 
								: 'Empieza registrando medicamentos con el botón de Nueva Farmacia.'
							}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto -mx-5 sm:mx-0">
						<table className="w-full text-left border-collapse text-sm">
							<thead>
								<tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider bg-slate-50/50">
									<th className="py-3 px-5 rounded-l-xl">Imagen</th>
									<th className="py-3 px-3">Producto / Nombre Comercial</th>
									<th className="py-3 px-3">Principio Activo</th>
									<th className="py-3 px-3">Categoría</th>
									<th className="py-3 px-3">Precio</th>
									<th className="py-3 px-3">Disponibilidad (Stock)</th>
									<th className="py-3 px-5 rounded-r-xl text-right">Acciones</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredProducts.map(prod => {
									const isControlled = prod.medication_catalog?.is_controlled || false;
									return (
										<tr key={prod.id} className="hover:bg-slate-50/40 group transition-colors">
											<td className="py-3 px-5">
												<div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center overflow-hidden border border-purple-100/50 shrink-0">
													{prod.image_url ? (
														<img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
													) : (
														<Pill className="w-4 h-4 text-purple-600" />
													)}
												</div>
											</td>
											<td className="py-3 px-3">
												<span className="font-bold text-slate-800 text-sm block">{prod.name}</span>
												{prod.is_featured && (
													<span className="inline-flex items-center text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded mt-0.5">
														Destacado
													</span>
												)}
											</td>
											<td className="py-3 px-3">
												{prod.medication_catalog ? (
													<div className="space-y-0.5">
														<span className="font-semibold text-slate-700 block text-xs">
															{prod.medication_catalog.inn}
														</span>
														<div className="flex flex-wrap items-center gap-1.5">
															<span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
																{prod.medication_catalog.concentration || ''}
															</span>
															{isControlled && (
																<span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 rounded">
																	<AlertTriangle className="w-2.5 h-2.5" />
																	Controlado
																</span>
															)}
														</div>
													</div>
												) : (
													<span className="text-slate-300 italic text-xs">Sin vincular</span>
												)}
											</td>
											<td className="py-3 px-3">
												{prod.pharmacy_categories ? (
													<span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 font-semibold px-2 py-0.5 rounded-lg border border-slate-100 text-xs">
														<span>{prod.pharmacy_categories.emoji || '📦'}</span>
														<span>{prod.pharmacy_categories.name}</span>
													</span>
												) : (
													<span className="text-slate-300 italic text-xs">Sin categoría</span>
												)}
											</td>
											<td className="py-3 px-3 font-extrabold text-slate-800 text-sm">
												{prod.price !== null ? `${prod.currency || 'USD'} ${Number(prod.price).toFixed(2)}` : <span className="text-slate-300 italic">S/P</span>}
											</td>
											<td className="py-3 px-3">
												<button
													type="button"
													onClick={() => toggleAvailability(prod)}
													className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full cursor-pointer border transition-all hover:scale-105 active:scale-95 ${prod.availability === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'}`}
												>
													{prod.availability === 'in_stock' ? 'En Stock' : 'Agotado'}
												</button>
											</td>
											<td className="py-3 px-5 text-right whitespace-nowrap">
												<div className="flex items-center justify-end gap-1.5">
													{inventoryTrackingEnabled && (
														<button
															type="button"
															onClick={() => {
																setReceptionProduct(prod);
																setInvoicedQty('');
																setReceivedQty('');
																setRejectedQty(0);
																setRejectionReason('');
																setIsReceptionOpen(true);
															}}
															className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
															title="Recibir mercancía"
														>
															<Package className="w-4 h-4" />
														</button>
													)}
													<button
														type="button"
														onClick={() => handleOpenEdit(prod)}
														className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
														title="Editar producto"
													>
														<Edit2 className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => handleDelete(prod.id, prod.name)}
														className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
														title="Eliminar producto"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
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
					<div className="relative bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-full">
						<button
							type="button"
							disabled={submitting}
							onClick={() => setIsModalOpen(false)}
							className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
						>
							<X className="w-5 h-5" />
						</button>

						<h2 className="text-lg font-bold text-slate-900 pr-10">
							{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
						</h2>
						<p className="text-xs text-slate-500 mt-1">
							{editingProduct ? 'Modifica los parámetros del producto seleccionado.' : 'Registra un nuevo medicamento comercial y vincúlalo al vademécum.'}
						</p>

						<form onSubmit={handleSubmit} className="mt-6 space-y-4 overflow-y-auto pr-1">
							{/* Commercial Name & Category */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Nombre Comercial <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={name}
										onChange={e => setName(e.target.value)}
										placeholder="Ej: Losar Plus"
										required
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Categoría
									</label>
									<select
										value={categoryId}
										onChange={e => setCategoryId(e.target.value)}
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									>
										<option value="">Ninguna</option>
										{categories.map(c => (
											<option key={c.id} value={c.id}>
												{c.emoji || '📦'} {c.name}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Molecule Lookup (Vademécum Autocomplete) */}
							<div className="relative">
								<label className="block text-xs font-semibold text-slate-700 mb-1.5">
									Vincular al Vademécum (Principio Activo)
								</label>
								
								{selectedMolecule ? (
									<div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between gap-4">
										<div>
											<span className="text-xs font-bold text-purple-900 uppercase block">{selectedMolecule.inn}</span>
											<span className="text-[10px] text-purple-600 block">
												{selectedMolecule.concentration || ''} • {selectedMolecule.pharmaceutical_form || ''} • {selectedMolecule.therapeutic_class || ''}
											</span>
											{selectedMolecule.is_controlled && (
												<span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded mt-1">
													<AlertTriangle className="w-2.5 h-2.5 animate-bounce" /> Medicamento Controlado (No se mostrará en el buscador público)
												</span>
											)}
										</div>
										<button
											type="button"
											onClick={removeSelectedMolecule}
											className="p-1.5 bg-white text-purple-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm border border-purple-100 transition cursor-pointer"
											title="Desvincular molécula"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									</div>
								) : (
									<div className="relative">
										<input
											type="text"
											value={moleculeQuery}
											onChange={e => setMoleculeQuery(e.target.value)}
											onFocus={() => setShowSuggestions(true)}
											placeholder="Escribe principio activo (ej: Losartan, Ibuprofeno)..."
											className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
										/>
										{searchingMolecules && (
											<div className="absolute right-3.5 top-1/2 -translate-y-1/2">
												<Loader2 className="w-4 h-4 animate-spin text-purple-600" />
											</div>
										)}
										
										{/* Autocomplete Suggestions */}
										{showSuggestions && moleculeSuggestions.length > 0 && (
											<div ref={suggestionRef} className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in slide-in-from-top-1.5 duration-200">
												{moleculeSuggestions.map(mol => (
													<div
														key={mol.id}
														onClick={() => selectMolecule(mol)}
														className="p-3 hover:bg-purple-50/50 cursor-pointer flex items-center justify-between gap-4 transition-colors"
													>
														<div>
															<span className="font-bold text-slate-800 text-xs block">{mol.inn}</span>
															<span className="text-[10px] text-slate-400">
																{mol.concentration || ''} • {mol.pharmaceutical_form || ''} • {mol.therapeutic_class || ''}
															</span>
														</div>
														{mol.is_controlled && (
															<span className="text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1 rounded uppercase tracking-wider">
																Controlado
															</span>
														)}
													</div>
												))}
											</div>
										)}
									</div>
								)}
							</div>

							{/* Description */}
							<div>
								<label className="block text-xs font-semibold text-slate-700 mb-1.5">
									Descripción del Producto
								</label>
								<textarea
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder="Indica componentes, indicaciones de uso comercial..."
									rows={3}
									className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition resize-none"
								/>
							</div>

							{/* Image Upload, Price, Currency & Stock Status */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* Price & Currency */}
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Precio Venta
									</label>
									<div className="relative">
										<div className="absolute left-3 top-1/2 -translate-y-1/2">
											<select
												value={currency}
												onChange={e => setCurrency(e.target.value as any)}
												className="bg-transparent border-none text-slate-600 text-xs font-bold focus:outline-none pr-1 cursor-pointer"
											>
												<option value="USD">$</option>
												<option value="EUR">€</option>
												<option value="BS">Bs</option>
											</select>
										</div>
										<input
											type="number"
											value={price}
											onChange={e => setPrice(e.target.value)}
											placeholder="0.00"
											step="0.01"
											className="w-full pl-14 pr-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
										/>
									</div>
								</div>

								{/* Availability Toggle */}
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Disponibilidad inicial
									</label>
									<select
										value={availability}
										onChange={e => setAvailability(e.target.value as any)}
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									>
										<option value="in_stock">En Stock</option>
										<option value="out_of_stock">Agotado</option>
									</select>
								</div>

								{/* Featured & Site Checkbox */}
								<div className="flex flex-col justify-end pb-1.5">
									<label className="flex items-center gap-2 cursor-pointer py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
										<input
											type="checkbox"
											checked={isFeatured}
											onChange={e => setIsFeatured(e.target.checked)}
											className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
										/>
										<span className="text-xs font-bold text-slate-700">Producto Destacado</span>
									</label>
								</div>
							</div>

							{/* Image File Selector */}
							<div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
								<div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
									{imageUrl ? (
										<img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
									) : (
										<Upload className="w-6 h-6 text-slate-300" />
									)}
								</div>
								<div className="flex-1 w-full text-center sm:text-left space-y-1">
									<h4 className="text-xs font-bold text-slate-800">Fotografía del Producto</h4>
									<p className="text-[10px] text-slate-400">Archivos JPG, PNG o WEBP. Máximo 5MB.</p>
								</div>
								<div className="relative shrink-0 w-full sm:w-auto">
									<input
										type="file"
										accept="image/*"
										onChange={handleImageUpload}
										disabled={uploadingImage}
										className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
									/>
									<button
										type="button"
										disabled={uploadingImage}
										className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
									>
										{uploadingImage ? (
											<>
												<Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
												Subiendo...
											</>
										) : (
											<>
												<Upload className="w-3.5 h-3.5" />
												Subir Foto
											</>
										)}
									</button>
								</div>
							</div>

							{/* Private Stock Details (Collapsible Section) */}
							<div className="border border-slate-100 rounded-2xl overflow-hidden">
								<button
									type="button"
									onClick={() => setShowInventoryFields(!showInventoryFields)}
									className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 transition text-slate-700"
								>
									<span className="text-xs font-bold flex items-center gap-1.5">
										<Package className="w-4 h-4 text-purple-600" />
										Información Privada de Inventario (Opcional)
									</span>
									{showInventoryFields ? (
										<ChevronUp className="w-4 h-4 text-slate-400" />
									) : (
										<ChevronDown className="w-4 h-4 text-slate-400" />
									)}
								</button>

								{showInventoryFields && (
									<div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
										<div>
											<label className="block text-[10px] font-bold text-slate-500 mb-1">
												Total Bultos
											</label>
											<input
												type="number"
												value={bultos}
												onChange={e => setBultos(e.target.value)}
												placeholder="Ej: 10"
												className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold text-slate-500 mb-1">
												Unidades por Bulto
											</label>
											<input
												type="number"
												value={unitsPerBulto}
												onChange={e => setUnitsPerBulto(e.target.value)}
												placeholder="Ej: 24"
												className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold text-slate-500 mb-1">
												Total Unidades Stock
											</label>
											<input
												type="number"
												value={stockUnits}
												onChange={e => setStockUnits(e.target.value)}
												placeholder="Ej: 240"
												className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold text-slate-500 mb-1">
												Descuento Comercial (%)
											</label>
											<input
												type="number"
												value={discountPct}
												onChange={e => setDiscountPct(e.target.value)}
												placeholder="Ej: 5"
												max={100}
												className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold text-slate-500 mb-1">
												Fecha de Vencimiento
											</label>
											<input
												type="date"
												value={expiryDate}
												onChange={e => setExpiryDate(e.target.value)}
												className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
											/>
										</div>
										<div className="sm:col-span-3">
											<p className="text-[10px] text-slate-400 italic">
												Nota: Esta información es de carácter privado interno para tu farmacia y jamás se mostrará al público.
											</p>
										</div>
									</div>
								)}
							</div>

							{editingProduct && (
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Nota de Auditoría (Obligatoria) <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={auditNote}
										onChange={e => setAuditNote(e.target.value)}
										placeholder="Ej: Ajuste de precio por inflación / Corrección de nombre"
										required
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
							)}

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

			{/* Reception Modal */}
			{isReceptionOpen && receptionProduct && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
					<div
						className="absolute inset-0"
						onClick={() => !receptionSubmitting && setIsReceptionOpen(false)}
					/>
					<div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-full">
						<button
							type="button"
							disabled={receptionSubmitting}
							onClick={() => setIsReceptionOpen(false)}
							className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
						>
							<X className="w-5 h-5" />
						</button>

						<h2 className="text-lg font-bold text-slate-900 pr-10 flex items-center gap-2">
							<Package className="w-5 h-5 text-emerald-600" />
							Recibir Mercancía
						</h2>
						<p className="text-xs text-slate-500 mt-1">
							Registra la entrada de stock para <strong>{receptionProduct.name}</strong>.
						</p>

						<form onSubmit={handleReceptionSubmit} className="mt-6 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Cant. Facturada <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										value={invoicedQty}
										onChange={e => setInvoicedQty(e.target.value)}
										placeholder="Ej: 100"
										required
										min="1"
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-300 transition"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Cant. Recibida <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										value={receivedQty}
										onChange={e => setReceivedQty(e.target.value)}
										placeholder="Ej: 95"
										required
										min="1"
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-300 transition"
									/>
								</div>
							</div>

							{Number(receivedQty || 0) > Number(invoicedQty || 0) && (
								<p className="text-xs text-rose-600 font-semibold">
									La cantidad recibida no puede ser mayor que la facturada.
								</p>
							)}

							{rejectedQty > 0 && (
								<div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
									<p className="text-xs text-amber-800 font-bold">
										Se detectó un faltante de {rejectedQty} unidades.
									</p>
									<div>
										<label className="block text-[11px] font-bold text-amber-900 mb-1">
											Motivo del Rechazo / Faltante <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={rejectionReason}
											onChange={e => setRejectionReason(e.target.value)}
											placeholder="Ej: Envases rotos / Faltó en la caja"
											required
											className="w-full px-3 py-2 border border-amber-200 rounded-xl bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
										/>
									</div>
								</div>
							)}

							{/* Actions */}
							<div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
								<button
									type="button"
									disabled={receptionSubmitting}
									onClick={() => setIsReceptionOpen(false)}
									className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold transition cursor-pointer disabled:opacity-50"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={receptionSubmitting || !invoicedQty || !receivedQty || Number(receivedQty) > Number(invoicedQty) || (rejectedQty > 0 && !rejectionReason.trim())}
									className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-950/10 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
								>
									{receptionSubmitting ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Procesando...
										</>
									) : (
										'Registrar Recepción'
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
