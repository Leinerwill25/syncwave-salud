'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, ClipboardList, Loader2, FileText, X } from 'lucide-react';
import PrescriptionForm from '@/components/medic/PrescriptionForm';

// ---------- Contenido de la página ----------
function PrescriptionsContent() {
	const searchParams = useSearchParams();
	const supabase = createSupabaseBrowserClient();
	const [prescriptions, setPrescriptions] = useState<any[]>([]);
	const [patients, setPatients] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);

	// Detectar parámetros de URL (id del paciente, diagnóstico e indicaciones)
	useEffect(() => {
		const patientIdParam = searchParams.get('patient_id');
		if (patientIdParam) {
			setShowForm(true);
		}
	}, [searchParams]);

	const initialFormData = useMemo(() => ({
		patientId: searchParams.get('patient_id') || '',
		notes: `${searchParams.get('diagnosis') ? `Diagnóstico: ${searchParams.get('diagnosis')}\n` : ''}${searchParams.get('indications') ? `Indicaciones: ${searchParams.get('indications')}` : ''}`
	}), [searchParams]);

	useEffect(() => {
		const fetchData = async () => {
			// Intentar obtener desde caché primero
			const cacheKey = 'prescriptions-cache';
			const cached = sessionStorage.getItem(cacheKey);
			if (cached) {
				try {
					const cachedData = JSON.parse(cached);
					const cacheAge = Date.now() - cachedData.timestamp;
					// Usar caché si tiene menos de 30 segundos
					if (cacheAge < 30000) {
						setPrescriptions(cachedData.prescriptions || []);
						setPatients(cachedData.patients || []);
						setLoading(false);
						// Cargar en background para actualizar
						fetchDataInBackground();
						return;
					}
				} catch {}
			}

			await fetchDataInBackground();
		};

		const fetchDataInBackground = async () => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 segundos timeout

				const [presRes, patRes, unregisteredRes] = await Promise.all([
					fetch('/api/medic/prescriptions', { signal: controller.signal }),
					supabase.from('patient').select('id, firstName, lastName, identifier'),
					supabase.from('unregisteredpatients').select('id, first_name, last_name, identification')
				]);

				clearTimeout(timeoutId);

				const presData = await presRes.json();
				const prescriptionsData = presData.prescriptions ?? [];
				setPrescriptions(prescriptionsData);
				
				// Combinar pacientes registrados y no registrados
				const registeredPatients = (patRes.data ?? []).map((p: any) => ({
					...p,
					isUnregistered: false
				}));
				const unregisteredPatients = (unregisteredRes.data ?? []).map((p: any) => ({
					id: p.id,
					firstName: p.first_name,
					lastName: p.last_name,
					identifier: p.identification,
					isUnregistered: true
				}));
				
				const allPatients = [...registeredPatients, ...unregisteredPatients];
				setPatients(allPatients);
				
				// Guardar en caché
				sessionStorage.setItem('prescriptions-cache', JSON.stringify({
					prescriptions: prescriptionsData,
					patients: allPatients,
					timestamp: Date.now()
				}));
			} catch (err: any) {
				if (err.name !== 'AbortError') {
					console.error('Error cargando datos:', err);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [supabase]);

	const patientMap = useMemo(() => {
		const map: Record<string, { name: string; isUnregistered: boolean }> = {};
		patients.forEach((p) => {
			map[p.id] = {
				name: `${p.firstName} ${p.lastName}`,
				isUnregistered: p.isUnregistered || false
			};
		});
		return map;
	}, [patients]);
	
	// Obtener información de pacientes no registrados desde las prescripciones
	const unregisteredPatientMap = useMemo(() => {
		const map: Record<string, { name: string }> = {};
		prescriptions.forEach((prescription: any) => {
			if (prescription.unregistered_patient_id && !map[prescription.unregistered_patient_id]) {
				// Buscar en la lista de pacientes no registrados
				const unregisteredPatient = patients.find((p: any) => p.id === prescription.unregistered_patient_id && p.isUnregistered);
				if (unregisteredPatient) {
					map[prescription.unregistered_patient_id] = {
						name: `${unregisteredPatient.firstName} ${unregisteredPatient.lastName}`
					};
				}
			}
		});
		return map;
	}, [prescriptions, patients]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-[70vh] text-gray-500">
				<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando datos...
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4 sm:p-6 md:p-8 lg:p-10">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 md:mb-10">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Recetas Médicas</h1>
					<p className="text-gray-600 text-xs sm:text-sm mt-1">Administra, crea y visualiza las recetas de tus pacientes.</p>
				</div>
				<div className="flex items-center gap-3">
					<button 
						onClick={() => setShowForm(!showForm)}
						className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 ${
							showForm 
								? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
								: 'bg-indigo-600 text-white hover:bg-indigo-700'
						}`}
					>
						{showForm ? <X size={18} /> : <PlusCircle size={18} />}
						{showForm ? 'Cerrar Formulario' : 'Nueva Receta'}
					</button>
					<div className="hidden md:flex items-center gap-2 text-indigo-600 p-2 bg-indigo-50 rounded-lg">
						<ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
					</div>
				</div>
			</motion.div>

			{/* Formulario de creación (Condicional) */}
			<AnimatePresence>
				{showForm && (
					<motion.div 
						initial={{ opacity: 0, height: 0 }} 
						animate={{ opacity: 1, height: 'auto' }} 
						exit={{ opacity: 0, height: 0 }}
						className="mb-10 overflow-hidden"
					>
						<PrescriptionForm 
							patients={patients} 
							onCreated={(newPresc) => {
								setPrescriptions([newPresc, ...prescriptions]);
								setShowForm(false);
							}} 
							onCancel={() => setShowForm(false)}
							initialData={initialFormData}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-1 gap-6 sm:gap-8 md:gap-10">
				{/* Lista de recetas */}
				<div className="lg:col-span-2">
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
						<div className="flex items-center gap-2 mb-6">
							<FileText className="w-5 h-5 text-indigo-600" />
							<h2 className="text-xl font-semibold text-gray-900">Recetas recientes</h2>
						</div>

						{prescriptions.length === 0 ? (
							<p className="text-gray-500 text-sm">No hay recetas registradas aún.</p>
						) : (
							<ul className="space-y-4">
								{prescriptions.map((r) => (
									<motion.li key={r.id} whileHover={{ scale: 1.01 }} className="p-5 border border-gray-100 rounded-xl shadow-sm bg-gradient-to-r from-violet-50 to-indigo-50 hover:shadow-md transition">
										<div className="flex justify-between">
											<div>
												<h4 className="font-semibold text-gray-800">
													Paciente: {
														r.unregistered_patient_id 
															? (unregisteredPatientMap[r.unregistered_patient_id]?.name || patientMap[r.unregistered_patient_id]?.name || 'Paciente No Registrado')
															: (patientMap[r.patient_id]?.name || 'Desconocido')
													}
													{r.unregistered_patient_id && (
														<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
															No Registrado
														</span>
													)}
												</h4>
												<p className="text-xs text-gray-500 mb-2">Emitida el {new Date(r.issued_at).toLocaleString()}</p>

												{r.notes && <p className="text-sm text-gray-700 italic mb-2">“{r.notes}”</p>}

												<div>
													<span className="text-sm font-medium text-gray-800">Medicamentos:</span>
													<ul className="list-disc ml-5 mt-1 text-sm text-gray-700">
														{(r.prescription_item ?? []).map((it: any) => (
															<li key={it.id}>
																{it.name}
																{it.dosage ? ` · ${it.dosage}` : ''}
																{it.quantity ? ` · x${it.quantity}` : ''}
															</li>
														))}
													</ul>
												</div>
											</div>

											<div className="text-right text-xs">
												<div className={`px-3 py-1 rounded-full font-semibold ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</div>
												<div className="mt-2 text-gray-400">{new Date(r.created_at).toLocaleDateString()}</div>
											</div>
										</div>
									</motion.li>
								))}
							</ul>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	);
}

// Ventana de Suspense para parámetros de búsqueda
export default function PrescriptionsPage() {
	return (
		<Suspense fallback={
			<div className="flex justify-center items-center h-[70vh] text-gray-500">
				<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando módulo de recetas...
			</div>
		}>
			<PrescriptionsContent />
		</Suspense>
	);
}
