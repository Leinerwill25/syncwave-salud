'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';

interface ICD11Code {
	code: string;
	title: string;
	description?: string;
	parent?: string;
	level?: number;
}

interface ICD11SearchProps {
	onSelect: (code: ICD11Code) => void;
	selectedCode?: ICD11Code | null;
	placeholder?: string;
	className?: string;
}

export default function ICD11Search({ onSelect, selectedCode, placeholder = 'Buscar código CIE-11...', className = '' }: ICD11SearchProps) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<ICD11Code[]>([]);
	const [loading, setLoading] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Cerrar resultados al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowResults(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Búsqueda con debounce
	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		if (query.trim().length < 2) {
			setResults([]);
			setShowResults(false);
			return;
		}

		setLoading(true);
		setError(null);

		searchTimeoutRef.current = setTimeout(async () => {
			try {
				const response = await fetch(`/api/icd11/search?q=${encodeURIComponent(query)}`);
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || 'Error al buscar');
				}

				setResults(data.results || []);
				setShowResults(true);
			} catch (err: any) {
				setError(err.message || 'Error al buscar códigos CIE-11');
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [query]);

	const handleSelect = (code: ICD11Code) => {
		onSelect(code);
		setQuery(`${code.code} - ${code.title}`);
		setShowResults(false);
		setResults([]);
	};

	const handleClear = () => {
		setQuery('');
		setResults([]);
		setShowResults(false);
		onSelect({ code: '', title: '' });
	};

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			{/* Input de búsqueda */}
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<Search className="h-5 w-5 text-slate-400" />
				</div>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => {
						if (results.length > 0) {
							setShowResults(true);
						}
					}}
					placeholder={placeholder}
					className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
				/>
				{loading && (
					<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
						<Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
					</div>
				)}
				{!loading && query && (
					<button
						type="button"
						onClick={handleClear}
						className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-slate-600 dark:hover:text-slate-300"
					>
						<X className="h-5 w-5 text-slate-400" />
					</button>
				)}
			</div>

			{/* Código seleccionado */}
			{selectedCode && selectedCode.code && !query && (
				<div className="mt-2 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-2">
								<span className="font-mono font-semibold text-teal-700 dark:text-teal-300">{selectedCode.code}</span>
								<Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
							</div>
							<p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{selectedCode.title}</p>
							{selectedCode.description && (
								<p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{selectedCode.description}</p>
							)}
						</div>
						<button
							type="button"
							onClick={handleClear}
							className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}

			{/* Resultados de búsqueda */}
			{showResults && results.length > 0 && (
				<div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
					{results.map((result, index) => (
						<button
							key={`${result.code}-${index}`}
							type="button"
							onClick={() => handleSelect(result)}
							className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{result.code}</span>
										{selectedCode?.code === result.code && (
											<Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
										)}
									</div>
									<p className="text-sm text-slate-900 dark:text-slate-100 mt-1">{result.title}</p>
									{result.description && (
										<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{result.description}</p>
									)}
								</div>
							</div>
						</button>
					))}
				</div>
			)}

			{/* Mensaje de error */}
			{error && (
				<div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			)}

			{/* Mensaje cuando no hay resultados */}
			{showResults && !loading && query.length >= 2 && results.length === 0 && !error && (
				<div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4">
					<p className="text-sm text-slate-500 dark:text-slate-400 text-center">No se encontraron resultados</p>
				</div>
			)}
		</div>
	);
}

