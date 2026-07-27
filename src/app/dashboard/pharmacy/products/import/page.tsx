// app/dashboard/pharmacy/products/import/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	Upload,
	ArrowLeft,
	ArrowRight,
	Table,
	Check,
	Loader2,
	AlertTriangle,
	Info,
	FileText,
	Database,
	CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

type Category = {
	id: string;
	name: string;
};

type MatchedMolecule = {
	id: string;
	inn: string;
	concentration: string | null;
	pharmaceutical_form: string | null;
	is_controlled: boolean;
};

type RowPreview = string[];

export default function BulkImportPage() {
	const router = useRouter();
	const [categories, setCategories] = useState<Category[]>([]);
	const [loadingCats, setLoadingCats] = useState(true);
	
	// Steps: 1 = upload, 2 = map columns, 3 = match & review, 4 = complete
	const [step, setStep] = useState(1);
	
	// Step 1: File Upload
	const [csvText, setCsvText] = useState('');
	const [fileName, setFileName] = useState('');
	const [csvRows, setCsvRows] = useState<string[][]>([]);
	const [error, setError] = useState<string | null>(null);

	// Step 2: Mapping
	const [headers, setHeaders] = useState<string[]>([]);
	const [mapping, setMapping] = useState<Record<string, string>>({
		name: '',
		price: '',
		currency: '',
		description: '',
		molecule: '',
	});
	
	// Step 3: Review & Matches
	const [parsedProducts, setParsedProducts] = useState<Array<{
		name: string;
		price: number | null;
		currency: string;
		description: string;
		moleculeQuery: string;
		matchedMolecule: MatchedMolecule | null;
		category_id: string;
	}>>([]);
	const [matchingProgress, setMatchingProgress] = useState(false);
	const [savingProgress, setSavingProgress] = useState(false);

	// Global defaults
	const [defaultCategoryId, setDefaultCategoryId] = useState('');
	const [defaultAvailability, setDefaultAvailability] = useState<'in_stock' | 'out_of_stock'>('in_stock');

	useEffect(() => {
		loadCategories();
	}, []);

	async function loadCategories() {
		try {
			setLoadingCats(true);
			const res = await axios.get('/api/pharmacy/categories');
			if (res.data?.success && Array.isArray(res.data?.data)) {
				setCategories(res.data.data);
			}
		} catch (err) {
			console.error('Error loading categories:', err);
		} finally {
			setLoadingCats(false);
		}
	}

	// Resilient CSV parser
	function parseCSV(text: string): string[][] {
		const lines: string[][] = [];
		let row: string[] = [];
		let inQuotes = false;
		let value = '';

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const nextChar = text[i + 1];

			if (char === '"') {
				if (inQuotes && nextChar === '"') {
					value += '"';
					i++; // skip next quote
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				row.push(value.trim());
				value = '';
			} else if ((char === '\r' || char === '\n') && !inQuotes) {
				if (char === '\r' && nextChar === '\n') {
					i++;
				}
				row.push(value.trim());
				lines.push(row);
				row = [];
				value = '';
			} else {
				value += char;
			}
		}
		if (value || row.length > 0) {
			row.push(value.trim());
			lines.push(row);
		}

		// Filter out empty lines
		return lines.filter(r => r.length > 0 && r.some(cell => cell.trim() !== ''));
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setFileName(file.name);
		setError(null);

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			if (!text) {
				setError('El archivo está vacío.');
				return;
			}
			setCsvText(text);
			const rows = parseCSV(text);
			if (rows.length < 2) {
				setError('El CSV debe contener al menos una cabecera y una fila de datos.');
				return;
			}
			setCsvRows(rows);
			setHeaders(rows[0]);
			
			// Auto guess mappings based on header name
			const initialMapping: Record<string, string> = {
				name: '',
				price: '',
				currency: '',
				description: '',
				molecule: '',
			};
			
			rows[0].forEach((header, idx) => {
				const lower = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
				if (lower.includes('nom') || lower.includes('product') || lower.includes('articulo') || lower.includes('comercial')) {
					initialMapping.name = String(idx);
				} else if (lower.includes('pre') || lower.includes('cost') || lower.includes('val')) {
					initialMapping.price = String(idx);
				} else if (lower.includes('mon') || lower.includes('curr') || lower.includes('div')) {
					initialMapping.currency = String(idx);
				} else if (lower.includes('desc') || lower.includes('indic') || lower.includes('det')) {
					initialMapping.description = String(idx);
				} else if (lower.includes('mol') || lower.includes('act') || lower.includes('princ') || lower.includes('vadem')) {
					initialMapping.molecule = String(idx);
				}
			});
			setMapping(initialMapping);
			setStep(2);
		};
		reader.readAsText(file);
	}

	async function proceedToStep3() {
		if (!mapping.name) {
			setError('El mapeo de la columna "Nombre Comercial" es obligatorio.');
			return;
		}

		setError(null);
		setMatchingProgress(true);

		// Extract names from mapping
		const nameIdx = Number(mapping.name);
		const priceIdx = mapping.price ? Number(mapping.price) : -1;
		const currencyIdx = mapping.currency ? Number(mapping.currency) : -1;
		const descIdx = mapping.description ? Number(mapping.description) : -1;
		const molIdx = mapping.molecule ? Number(mapping.molecule) : -1;

		const dataRows = csvRows.slice(1);
		
		// Collect names to batch-query matches
		const namesToMatch: string[] = [];
		dataRows.forEach((row) => {
			const molVal = molIdx !== -1 ? row[molIdx] : '';
			const nameVal = row[nameIdx] || '';
			// Use molecule name for search, fallback to commercial name
			const queryVal = molVal?.trim() || nameVal?.trim();
			if (queryVal && !namesToMatch.includes(queryVal)) {
				namesToMatch.push(queryVal);
			}
		});

		try {
			// Call batch matcher API
			const matchRes = await axios.post('/api/pharmacy/catalog/bulk-match', {
				names: namesToMatch
			});

			const matchDict: Record<string, MatchedMolecule | null> = matchRes.data?.matches || {};

			const mappedItems = dataRows.map((row) => {
				const nameVal = row[nameIdx] || 'Sin Nombre';
				const molVal = molIdx !== -1 ? row[molIdx] : '';
				const queryVal = molVal?.trim() || nameVal?.trim();
				const match = matchDict[queryVal] || null;

				let parsedPrice: number | null = null;
				if (priceIdx !== -1 && row[priceIdx]) {
					const val = parseFloat(row[priceIdx].replace(/[^0-9.]/g, ''));
					if (!isNaN(val)) parsedPrice = val;
				}

				return {
					name: nameVal,
					price: parsedPrice,
					currency: (currencyIdx !== -1 ? row[currencyIdx] : '') || 'USD',
					description: (descIdx !== -1 ? row[descIdx] : '') || '',
					moleculeQuery: molVal || '',
					matchedMolecule: match,
					category_id: defaultCategoryId
				};
			});

			setParsedProducts(mappedItems);
			setStep(3);
		} catch (err: any) {
			console.error('Error matching catalog:', err);
			setError('Ocurrió un error al buscar sugerencias de vademécum.');
		} finally {
			setMatchingProgress(false);
		}
	}

	async function saveImport() {
		if (parsedProducts.length === 0) return;

		setSavingProgress(true);
		setError(null);

		// Format into API rows
		const productsPayload = parsedProducts.map(p => ({
			name: p.name,
			medication_id: p.matchedMolecule?.id || null,
			category_id: p.category_id || null,
			description: p.description || null,
			availability: defaultAvailability,
			price: p.price,
			currency: p.currency || 'USD'
		}));

		try {
			const res = await axios.post('/api/pharmacy/products/bulk', {
				products: productsPayload
			});

			if (res.data?.success) {
				setStep(4);
			}
		} catch (err: any) {
			console.error('Error importing bulk:', err);
			setError(err?.response?.data?.message || 'Error al guardar la importación.');
		} finally {
			setSavingProgress(false);
		}
	}

	function handleCategoryChange(idx: number, catId: string) {
		setParsedProducts(prev =>
			prev.map((item, i) => (i === idx ? { ...item, category_id: catId } : item))
		);
	}

	function handleRemoveMatch(idx: number) {
		setParsedProducts(prev =>
			prev.map((item, i) => (i === idx ? { ...item, matchedMolecule: null } : item))
		);
	}

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Breadcrumb / Back Link */}
			<div className="flex items-center gap-2">
				<Link
					href="/dashboard/pharmacy/products"
					className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
				>
					<ArrowLeft className="w-5 h-5" />
				</Link>
				<div>
					<span className="text-xs text-slate-400 font-medium">Volver a Inventario</span>
					<h1 className="text-xl font-bold text-slate-900">Importación Masiva de Productos</h1>
				</div>
			</div>

			{/* Step Indicator */}
			<div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 max-w-xl mx-auto shadow-sm">
				<div className="flex items-center gap-2">
					<div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
						1
					</div>
					<span className={`text-xs font-bold ${step === 1 ? 'text-purple-700' : 'text-slate-500'}`}>Carga</span>
				</div>
				<div className="w-10 h-0.5 bg-slate-200" />
				<div className="flex items-center gap-2">
					<div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
						2
					</div>
					<span className={`text-xs font-bold ${step === 2 ? 'text-purple-700' : 'text-slate-500'}`}>Mapeo</span>
				</div>
				<div className="w-10 h-0.5 bg-slate-200" />
				<div className="flex items-center gap-2">
					<div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
						3
					</div>
					<span className={`text-xs font-bold ${step === 3 ? 'text-purple-700' : 'text-slate-500'}`}>Revisión</span>
				</div>
			</div>

			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 max-w-2xl mx-auto">
					<Info className="w-4 h-4 shrink-0 mt-0.5" />
					<span>{error}</span>
				</div>
			)}

			{/* Step 1: Upload File */}
			{step === 1 && (
				<div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 max-w-2xl mx-auto shadow-sm space-y-6">
					<div className="text-center space-y-2">
						<FileText className="w-12 h-12 text-purple-600 mx-auto" />
						<h3 className="text-lg font-bold text-slate-800">Cargar listado de productos</h3>
						<p className="text-xs text-slate-500 max-w-md mx-auto">
							Sube un archivo delimitado por comas (.csv) exportado desde tu sistema de facturación o inventario.
						</p>
					</div>

					<div className="border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-2xl p-10 text-center transition relative cursor-pointer group bg-slate-50/50 hover:bg-purple-50/20">
						<input
							type="file"
							accept=".csv"
							onChange={handleFileChange}
							className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
						/>
						<Upload className="w-8 h-8 text-slate-400 group-hover:text-purple-500 mx-auto mb-2.5 transition" />
						<span className="text-xs font-bold text-slate-700 block">Selecciona tu archivo CSV</span>
						<span className="text-[10px] text-slate-400 mt-1 block">O arrastra el archivo aquí</span>
					</div>

					<div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-2">
						<p className="font-bold text-slate-600">Recomendaciones para el archivo:</p>
						<ul className="list-disc pl-4 space-y-1">
							<li>La primera fila debe contener los nombres de las columnas (cabeceras).</li>
							<li>Debe contener al menos el nombre del producto (ej: Paracetamol 500mg).</li>
							<li>Si incluyes precios, asegúrate de que sean numéricos.</li>
						</ul>
					</div>
				</div>
			)}

			{/* Step 2: Mapping Columns */}
			{step === 2 && (
				<div className="bg-white rounded-2xl p-6 border border-slate-100 max-w-3xl mx-auto shadow-sm space-y-6">
					<div>
						<h3 className="text-lg font-bold text-slate-800">Relacionar columnas de tu CSV</h3>
						<p className="text-xs text-slate-500 mt-0.5">Asigna qué columna del archivo cargado representa cada campo de producto.</p>
					</div>

					{/* Mapping form */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Nombre Comercial <span className="text-red-500">*</span>
							</label>
							<select
								value={mapping.name}
								onChange={e => setMapping(prev => ({ ...prev, name: e.target.value }))}
								className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
							>
								<option value="">Selecciona la columna...</option>
								{headers.map((h, i) => (
									<option key={i} value={i}>{h}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Precio Venta
							</label>
							<select
								value={mapping.price}
								onChange={e => setMapping(prev => ({ ...prev, price: e.target.value }))}
								className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
							>
								<option value="">Ninguna (Dejar vacío)</option>
								{headers.map((h, i) => (
									<option key={i} value={i}>{h}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Moneda (USD, EUR, BS)
							</label>
							<select
								value={mapping.currency}
								onChange={e => setMapping(prev => ({ ...prev, currency: e.target.value }))}
								className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
							>
								<option value="">Por defecto (USD)</option>
								{headers.map((h, i) => (
									<option key={i} value={i}>{h}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Descripción / Componentes
							</label>
							<select
								value={mapping.description}
								onChange={e => setMapping(prev => ({ ...prev, description: e.target.value }))}
								className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
							>
								<option value="">Ninguna</option>
								{headers.map((h, i) => (
									<option key={i} value={i}>{h}</option>
								))}
							</select>
						</div>

						<div className="md:col-span-2">
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Principio Activo (para vincular automáticamente)
							</label>
							<select
								value={mapping.molecule}
								onChange={e => setMapping(prev => ({ ...prev, molecule: e.target.value }))}
								className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
							>
								<option value="">Buscar usando Nombre Comercial</option>
								{headers.map((h, i) => (
									<option key={i} value={i}>{h}</option>
								))}
							</select>
						</div>
					</div>

					{/* File Preview */}
					<div className="space-y-2 border-t border-slate-100 pt-5">
						<span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
							<Table className="w-4 h-4 text-purple-600" />
							Vista previa de las primeras filas del archivo
						</span>
						<div className="overflow-x-auto rounded-xl border border-slate-150 max-h-40">
							<table className="w-full text-left text-[11px] border-collapse bg-slate-50/50">
								<thead>
									<tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
										{headers.map((h, idx) => (
											<th key={idx} className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{csvRows.slice(1, 4).map((row, rIdx) => (
										<tr key={rIdx} className="bg-white border-b border-slate-100 text-slate-600">
											{headers.map((_, hIdx) => (
												<td key={hIdx} className="py-2 px-3 border-r border-slate-150 whitespace-nowrap">{row[hIdx] || ''}</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-between items-center border-t border-slate-100 pt-4">
						<button
							type="button"
							onClick={() => setStep(1)}
							className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
						>
							Atrás
						</button>
						<button
							type="button"
							disabled={matchingProgress || !mapping.name}
							onClick={proceedToStep3}
							className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
						>
							{matchingProgress ? (
								<>
									<Loader2 className="w-4.5 h-4.5 animate-spin" />
									Analizando catálogo...
								</>
							) : (
								<>
									Continuar
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</div>
				</div>
			)}

			{/* Step 3: Review Matches & Save */}
			{step === 3 && (
				<div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h3 className="text-lg font-bold text-slate-800">Revisión de sugerencias y clasificación</h3>
							<p className="text-xs text-slate-500 mt-0.5">Revisa la vinculación automática al catálogo y asigna categorías finales.</p>
						</div>
						
						{/* Default Category selector */}
						<div className="flex items-center gap-2">
							<label className="text-xs font-bold text-slate-600">Categoría por Defecto:</label>
							<select
								value={defaultCategoryId}
								onChange={e => {
									setDefaultCategoryId(e.target.value);
									// Apply default category to all items that don't have one
									setParsedProducts(prev => prev.map(p => ({ ...p, category_id: e.target.value })));
								}}
								className="px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
							>
								<option value="">Ninguna</option>
								{categories.map(c => (
									<option key={c.id} value={c.id}>{c.name}</option>
								))}
							</select>
						</div>
					</div>

					{/* List review */}
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
									<th className="py-2.5 px-4 rounded-l-lg">Nombre del Producto</th>
									<th className="py-2.5 px-3">Precio Sugerido</th>
									<th className="py-2.5 px-3">Categoría</th>
									<th className="py-2.5 px-3">Vincular Vademécum</th>
									<th className="py-2.5 px-4 rounded-r-lg text-right">Quitar Enlace</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{parsedProducts.map((p, idx) => {
									const isControlled = p.matchedMolecule?.is_controlled || false;
									return (
										<tr key={idx} className="hover:bg-slate-50/30 transition-colors">
											<td className="py-3 px-4 font-bold text-slate-800">
												{p.name}
												{p.description && (
													<span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.description}</span>
												)}
											</td>
											<td className="py-3 px-3 font-semibold text-slate-700">
												{p.price !== null ? `${p.currency || 'USD'} ${p.price.toFixed(2)}` : 'S/P'}
											</td>
											<td className="py-3 px-3">
												<select
													value={p.category_id}
													onChange={e => handleCategoryChange(idx, e.target.value)}
													className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
												>
													<option value="">Ninguna</option>
													{categories.map(c => (
														<option key={c.id} value={c.id}>{c.name}</option>
													))}
												</select>
											</td>
											<td className="py-3 px-3">
												{p.matchedMolecule ? (
													<div className="space-y-0.5">
														<span className="font-bold text-purple-700 block uppercase text-[10px]">
															{p.matchedMolecule.inn}
														</span>
														<div className="flex items-center gap-1.5">
															<span className="text-[9px] text-slate-400">{p.matchedMolecule.concentration || ''}</span>
															{isControlled && (
																<span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1 rounded uppercase tracking-wider">
																	<AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
																	Controlado
																</span>
															)}
														</div>
													</div>
												) : (
													<span className="text-slate-300 italic text-[11px]">Sin vinculación automática</span>
												)}
											</td>
											<td className="py-3 px-4 text-right">
												{p.matchedMolecule && (
													<button
														type="button"
														onClick={() => handleRemoveMatch(idx)}
														className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-2 py-1 rounded border border-rose-100/50 transition cursor-pointer"
													>
														Desvincular
													</button>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Defaults bottom */}
					<div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col sm:flex-row gap-5 justify-between items-center">
						<div className="flex gap-4 items-center">
							<label className="text-xs font-bold text-slate-600 flex items-center gap-1">
								Disponibilidad Inicial:
							</label>
							<select
								value={defaultAvailability}
								onChange={e => setDefaultAvailability(e.target.value as any)}
								className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
							>
								<option value="in_stock">En Stock</option>
								<option value="out_of_stock">Agotado</option>
							</select>
						</div>
						<div className="text-xs text-slate-400 italic">
							Nota: Los productos marcados como &quot;Controlados&quot; se vincularán al vademécum pero se ocultarán del buscador público automáticamente.
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-between items-center border-t border-slate-100 pt-4">
						<button
							type="button"
							onClick={() => setStep(2)}
							className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
						>
							Atrás
						</button>
						<button
							type="button"
							disabled={savingProgress || parsedProducts.length === 0}
							onClick={saveImport}
							className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-lg transition disabled:opacity-50 cursor-pointer"
						>
							{savingProgress ? (
								<>
									<Loader2 className="w-4.5 h-4.5 animate-spin" />
									Importando {parsedProducts.length} productos...
								</>
							) : (
								<>
									<Database className="w-4 h-4" />
									Guardar e Importar
								</>
							)}
						</button>
					</div>
				</div>
			)}

			{/* Step 4: Complete */}
			{step === 4 && (
				<div className="bg-white rounded-2xl p-10 border border-slate-100 max-w-xl mx-auto shadow-sm text-center space-y-6">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
						<CheckCircle2 className="w-10 h-10 animate-bounce" />
					</div>
					<div className="space-y-2">
						<h3 className="text-xl font-bold text-slate-800">¡Importación Exitosa!</h3>
						<p className="text-xs text-slate-500 max-w-sm mx-auto">
							Se han cargado y clasificado correctamente los productos de tu archivo en el catálogo comercial de la farmacia.
						</p>
					</div>
					<div className="pt-4 flex justify-center gap-3">
						<Link
							href="/dashboard/pharmacy/products"
							className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition"
						>
							Ir al Inventario
						</Link>
						<button
							type="button"
							onClick={() => {
								setFileName('');
								setCsvRows([]);
								setParsedProducts([]);
								setStep(1);
							}}
							className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer"
						>
							Importar Otro Archivo
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
