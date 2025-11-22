'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, UserPlus, Search, Loader2, X, Check } from 'lucide-react';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string;
	is_unregistered?: boolean;
	type?: string;
};

interface PatientSelectorProps {
	consultationId: string;
	currentPatientId: string | null;
	currentUnregisteredPatientId: string | null;
	currentPatientName: string;
	isUnregistered: boolean;
}

export default function PatientSelector({
	consultationId,
	currentPatientId,
	currentUnregisteredPatientId,
	currentPatientName,
	isUnregistered,
}: PatientSelectorProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [suggestions, setSuggestions] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const debounceRef = useRef<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Cerrar dropdown al hacer click fuera
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Buscar pacientes
	useEffect(() => {
		if (!searchTerm || searchTerm.length < 2) {
			setSuggestions([]);
			setOpen(false);
			return;
		}

		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/patients/search?identifier=${encodeURIComponent(searchTerm)}`);
				const data = await res.json();
				setSuggestions(data || []);
				setOpen(data && data.length > 0);
			} catch (err) {
				console.error('Error buscando pacientes:', err);
				setSuggestions([]);
				setOpen(false);
			} finally {
				setLoading(false);
			}
		}, 300);
	}, [searchTerm]);

	const handlePatientSelect = async (patient: Patient) => {
		const isUnregisteredPatient = patient.is_unregistered === true || patient.type === 'unregistered';
		
		setUpdating(true);
		setError(null);
		setSuccess(null);

		try {
			const payload: any = {};
			if (isUnregisteredPatient) {
				payload.unregistered_patient_id = patient.id;
				payload.patient_id = null; // Limpiar patient_id si cambiamos a no registrado
			} else {
				payload.patient_id = patient.id;
				payload.unregistered_patient_id = null; // Limpiar unregistered_patient_id si cambiamos a registrado
			}

			const res = await fetch(`/api/consultations/${consultationId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.error || 'Error al actualizar el paciente');
			}

			setSuccess(`Paciente actualizado: ${patient.firstName} ${patient.lastName}`);
			setSearchTerm('');
			setOpen(false);
			setSuggestions([]);

			// Recargar la página después de un breve delay para mostrar el mensaje
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (err: any) {
			console.error('Error actualizando paciente:', err);
			setError(err.message || 'Error al actualizar el paciente');
		} finally {
			setUpdating(false);
		}
	};

	return (
		<div ref={containerRef} className="relative">
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-slate-900">Paciente Asociado</h3>
					{isUnregistered && (
						<span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
							No Registrado
						</span>
					)}
				</div>

				{/* Paciente actual */}
				<div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className={`p-1.5 rounded-md ${isUnregistered ? 'bg-orange-100' : 'bg-green-100'}`}>
								{isUnregistered ? (
									<UserPlus size={16} className="text-orange-600" />
								) : (
									<UserCheck size={16} className="text-green-600" />
								)}
							</div>
							<div>
								<div className="font-medium text-slate-900">{currentPatientName || 'Sin paciente'}</div>
								<div className="text-xs text-slate-600">
									{isUnregistered ? 'Paciente no registrado' : 'Paciente registrado'}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Buscador */}
				<div className="relative">
					<label htmlFor="patient-search" className="block text-xs font-medium text-slate-700 mb-1">
						Buscar y cambiar paciente
					</label>
					<div className="relative">
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
							{loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
						</div>
						<input
							id="patient-search"
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Buscar por cédula, nombre o apellido..."
							className="w-full pl-10 pr-10 py-2 rounded-lg border border-blue-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
							disabled={updating}
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={() => {
									setSearchTerm('');
									setOpen(false);
									setSuggestions([]);
								}}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
							>
								<X size={16} />
							</button>
						)}
					</div>

					{/* Dropdown de sugerencias */}
					{open && suggestions.length > 0 && (
						<div className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-blue-200 bg-white shadow-xl overflow-hidden max-h-64 overflow-y-auto">
							<ul className="divide-y divide-blue-100">
								{suggestions.map((p) => {
									const isUnregisteredPatient = p.is_unregistered === true || p.type === 'unregistered';
									const isCurrentPatient =
										(isUnregisteredPatient && p.id === currentUnregisteredPatientId) ||
										(!isUnregisteredPatient && p.id === currentPatientId);

									return (
										<li
											key={p.id}
											role="option"
											tabIndex={0}
											onClick={() => !isCurrentPatient && handlePatientSelect(p)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !isCurrentPatient) {
													handlePatientSelect(p);
												}
											}}
											className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between ${
												isCurrentPatient ? 'bg-green-50' : ''
											}`}
										>
											<div className="flex items-center gap-3">
												<div className={`p-1.5 rounded-md ${isUnregisteredPatient ? 'bg-orange-100' : 'bg-green-100'}`}>
													{isUnregisteredPatient ? (
														<UserPlus size={14} className="text-orange-600" />
													) : (
														<UserCheck size={14} className="text-green-600" />
													)}
												</div>
												<div>
													<div className="font-medium text-slate-900">
														{p.firstName} {p.lastName}
													</div>
													{p.identifier && <div className="text-xs text-slate-700 mt-0.5">{p.identifier}</div>}
													<div className={`text-xs mt-0.5 ${isUnregisteredPatient ? 'text-orange-600' : 'text-green-600'}`}>
														{isUnregisteredPatient ? 'No registrado' : 'Registrado'}
													</div>
												</div>
											</div>
											{isCurrentPatient ? (
												<div className="flex items-center gap-1 text-xs text-green-600">
													<Check size={14} />
													<span>Actual</span>
												</div>
											) : (
												<div className="text-xs text-slate-600">Seleccionar</div>
											)}
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</div>

				{/* Mensajes de estado */}
				{error && (
					<div className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">{error}</div>
				)}
				{success && (
					<div className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs flex items-center gap-2">
						<Check size={14} />
						{success}
					</div>
				)}
				{updating && (
					<div className="p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs flex items-center gap-2">
						<Loader2 className="animate-spin" size={14} />
						Actualizando paciente...
					</div>
				)}
			</div>
		</div>
	);
}

