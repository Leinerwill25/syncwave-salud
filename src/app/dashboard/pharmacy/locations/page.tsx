// app/dashboard/pharmacy/locations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
	MapPin,
	Plus,
	Search,
	Loader2,
	X,
	Edit2,
	Trash2,
	Info,
	Check,
	Clock,
	ExternalLink
} from 'lucide-react';
import axios from 'axios';

// Dynamically import map picker since it uses Leaflet (which needs window object)
const LocationMapPicker = dynamic(() => import('@/components/LocationMapPicker'), {
	ssr: false,
	loading: () => (
		<div className="h-64 w-full rounded-lg bg-slate-50 flex items-center justify-center border-2 border-slate-200 text-slate-400 text-xs">
			<Loader2 className="w-5 h-5 animate-spin mr-2" />
			Cargando Mapa Interactivo...
		</div>
	)
});

type Location = {
	id: string;
	name: string;
	address: string | null;
	schedule: string | null;
	lat: number | null;
	lng: number | null;
	maps_url: string | null;
	is_active: boolean;
	created_at: string;
};

export default function LocationsPage() {
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [error, setError] = useState<string | null>(null);

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingLocation, setEditingLocation] = useState<Location | null>(null);

	// Form fields
	const [name, setName] = useState('');
	const [address, setAddress] = useState('');
	const [schedule, setSchedule] = useState('');
	const [lat, setLat] = useState<number | null>(null);
	const [lng, setLng] = useState<number | null>(null);
	const [mapsUrl, setMapsUrl] = useState('');
	const [isActive, setIsActive] = useState(true);

	useEffect(() => {
		fetchLocations();
	}, []);

	async function fetchLocations() {
		try {
			setLoading(true);
			setError(null);
			const res = await axios.get('/api/pharmacy/locations');
			if (res.data?.success && Array.isArray(res.data?.data)) {
				setLocations(res.data.data);
			} else {
				throw new Error('Formato de datos no válido');
			}
		} catch (err: any) {
			console.error('Error fetching locations:', err);
			setError(err?.response?.data?.message || 'Error al cargar las sucursales');
		} finally {
			setLoading(false);
		}
	}

	function handleOpenCreate() {
		setEditingLocation(null);
		setName('');
		setAddress('');
		setSchedule('');
		setLat(null);
		setLng(null);
		setMapsUrl('');
		setIsActive(true);
		setIsModalOpen(true);
	}

	function handleOpenEdit(loc: Location) {
		setEditingLocation(loc);
		setName(loc.name);
		setAddress(loc.address || '');
		setSchedule(loc.schedule || '');
		setLat(loc.lat);
		setLng(loc.lng);
		setMapsUrl(loc.maps_url || '');
		setIsActive(loc.is_active);
		setIsModalOpen(true);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setSubmitting(true);
		setError(null);

		const payload = {
			name: name.trim(),
			address: address.trim() || null,
			schedule: schedule.trim() || null,
			lat,
			lng,
			maps_url: mapsUrl.trim() || null,
			is_active: isActive
		};

		try {
			if (editingLocation) {
				const res = await axios.put(`/api/pharmacy/locations/${editingLocation.id}`, payload);
				if (res.data?.success) {
					setLocations(prev =>
						prev.map(l => (l.id === editingLocation.id ? res.data.data : l))
					);
					setIsModalOpen(false);
				}
			} else {
				const res = await axios.post('/api/pharmacy/locations', payload);
				if (res.data?.success) {
					setLocations(prev => [...prev, res.data.data]);
					setIsModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error('Error saving location:', err);
			setError(err?.response?.data?.message || 'Error al guardar la sucursal');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(locId: string, locName: string) {
		if (!confirm(`¿Estás seguro de que deseas eliminar la sucursal "${locName}"?`)) {
			return;
		}

		try {
			setError(null);
			const res = await axios.delete(`/api/pharmacy/locations/${locId}`);
			if (res.data?.success) {
				setLocations(prev => prev.filter(l => l.id !== locId));
			}
		} catch (err: any) {
			console.error('Error deleting location:', err);
			setError(err?.response?.data?.message || 'Error al eliminar la sucursal');
		}
	}

	const filteredLocations = locations.filter(l =>
		l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
						<MapPin className="w-8 h-8 text-purple-600 shrink-0" />
						Sedes y Sucursales
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Administra las sedes físicas de tu farmacia. Los pacientes podrán ver los horarios de atención y ubicarlas mediante GPS.
					</p>
				</div>
				<button
					type="button"
					onClick={handleOpenCreate}
					className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-lg shadow-purple-900/10 transition-all text-sm cursor-pointer shrink-0"
				>
					<Plus className="w-4 h-4" />
					Nueva Sucursal
				</button>
			</div>

			{/* Info Alert on synchronization */}
			<div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 text-xs sm:text-sm flex items-start gap-2.5">
				<Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
				<div>
					<span className="font-bold">Sincronización Automática:</span> Modificar los datos de tu sede principal (o la que contenga la palabra &apos;Principal&apos; o &apos;Matriz&apos; en su nombre) actualizará automáticamente tu dirección operativa principal en el directorio del paciente.
				</div>
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
							placeholder="Buscar sucursales por nombre o dirección..."
							className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
						/>
					</div>
					<div className="text-xs text-slate-400 font-medium self-end sm:self-auto">
						Mostrando {filteredLocations.length} de {locations.length} sucursales
					</div>
				</div>

				{/* Error Alert */}
				{error && (
					<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 animate-in slide-in-from-top duration-300">
						<Info className="w-4 h-4 shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				{/* Locations Grid */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
						<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
						<p className="text-sm font-medium">Cargando sucursales...</p>
					</div>
				) : filteredLocations.length === 0 ? (
					<div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
						<MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
						<h3 className="text-slate-700 font-bold text-base">No se encontraron sucursales</h3>
						<p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
							{searchQuery ? 'Prueba refinando la búsqueda o con otros términos.' : 'Comienza añadiendo una sucursal física para tu farmacia.'}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
						{filteredLocations.map(loc => (
							<div key={loc.id} className="bg-slate-50/40 rounded-2xl border border-slate-100 p-5 hover:shadow-md transition duration-300 flex flex-col justify-between gap-4">
								<div className="space-y-3">
									<div className="flex justify-between items-start gap-3">
										<div>
											<h3 className="font-bold text-slate-900 text-base">{loc.name}</h3>
											<span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${loc.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
												{loc.is_active ? 'Activa' : 'Pausada'}
											</span>
										</div>
										<div className="flex gap-1 shrink-0">
											<button
												type="button"
												onClick={() => handleOpenEdit(loc)}
												className="p-2 bg-white text-slate-500 hover:text-purple-600 hover:shadow-sm border border-slate-200 rounded-xl transition cursor-pointer"
												title="Editar sucursal"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(loc.id, loc.name)}
												className="p-2 bg-white text-slate-500 hover:text-rose-600 hover:shadow-sm border border-slate-200 rounded-xl transition cursor-pointer"
												title="Eliminar sucursal"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>

									<p className="text-xs text-slate-600 leading-relaxed font-medium">
										<span className="font-bold text-slate-700 block mb-0.5">Dirección:</span>
										{loc.address || <span className="text-slate-300 italic">No especificada</span>}
									</p>

									{loc.schedule && (
										<div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/70 border border-slate-100/50 p-2.5 rounded-xl">
											<Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
											<span className="font-medium">{loc.schedule}</span>
										</div>
									)}
								</div>

								{/* Map coords check */}
								{(loc.lat && loc.lng) ? (
									<div className="pt-3 border-t border-slate-100/70 flex items-center justify-between text-xs text-slate-400">
										<span className="font-medium">GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
										<a
											href={loc.maps_url || `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 font-bold text-purple-600 hover:text-purple-700 transition"
										>
											Ver Mapa
											<ExternalLink className="w-3 h-3" />
										</a>
									</div>
								) : (
									<div className="pt-3 border-t border-slate-100/70 text-xs text-slate-300 italic">
										Sin coordenadas GPS asignadas
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Create/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
					<div
						className="absolute inset-0"
						onClick={() => !submitting && setIsModalOpen(false)}
					/>
					<div className="relative bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[90vh]">
						<button
							type="button"
							disabled={submitting}
							onClick={() => setIsModalOpen(false)}
							className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
						>
							<X className="w-5 h-5" />
						</button>

						<h2 className="text-lg font-bold text-slate-900 pr-10">
							{editingLocation ? 'Editar Sucursal' : 'Nueva Sucursal'}
						</h2>
						<p className="text-xs text-slate-500 mt-1">
							{editingLocation ? 'Actualiza los datos y ubicación GPS de esta sede.' : 'Añade una nueva sede física con geolocalización en tiempo real.'}
						</p>

						<form onSubmit={handleSubmit} className="mt-6 space-y-4 overflow-y-auto pr-1 flex-1">
							{/* Name */}
							<div>
								<label className="block text-xs font-semibold text-slate-700 mb-1.5">
									Nombre de la Sucursal <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={name}
									onChange={e => setName(e.target.value)}
									placeholder="Ej: Sucursal Centro / Sede Principal"
									required
									className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
								/>
							</div>

							{/* Schedule & Maps link */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Horario de Atención
									</label>
									<input
										type="text"
										value={schedule}
										onChange={e => setSchedule(e.target.value)}
										placeholder="Ej: Lunes a Sábado 8:00 AM - 9:00 PM"
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-slate-700 mb-1.5">
										Enlace Personalizado Google Maps (Opcional)
									</label>
									<input
										type="url"
										value={mapsUrl}
										onChange={e => setMapsUrl(e.target.value)}
										placeholder="https://maps.google.com/..."
										className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
									/>
								</div>
							</div>

							{/* Location Map Picker (GPS coordinates & Reverse Geocode Address) */}
							<div>
								<label className="block text-xs font-semibold text-slate-700 mb-1.5">
									Ubicación GPS y Dirección Física
								</label>
								<p className="text-[10px] text-slate-500 mb-2">Haz clic en el mapa interactivo para fijar el marcador y reverse-geocodificar la dirección.</p>
								<LocationMapPicker
									lat={lat}
									lng={lng}
									address={address}
									onLocationSelect={(latitude, longitude) => {
										setLat(latitude);
										setLng(longitude);
									}}
									onAddressChange={setAddress}
									inputClass="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 transition"
								/>
							</div>

							{/* Active Switch */}
							<label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
								<input
									type="checkbox"
									checked={isActive}
									onChange={e => setIsActive(e.target.checked)}
									className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
								/>
								<div>
									<h4 className="text-xs font-bold text-slate-800">Sucursal Habilitada</h4>
									<p className="text-[10px] text-slate-500 mt-0.5">Si está inactiva, no se mostrará a los pacientes en el portal público.</p>
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
