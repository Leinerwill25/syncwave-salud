// components/clinic/GoogleMapPicker.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Navigation, AlertCircle, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Importar estilos de Leaflet solo en el cliente
if (typeof window !== 'undefined') {
	require('leaflet/dist/leaflet.css');
	
	// Fix para los iconos de Leaflet en Next.js
	const L = require('leaflet');
	delete (L.Icon.Default.prototype as any)._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
		iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
		shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
	});
}

// Importar el componente del mapa dinámicamente (sin SSR)
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

interface GoogleMapPickerProps {
	onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
	initialLocation?: { lat: number; lng: number; address: string } | null;
}

export default function GoogleMapPicker({ onLocationSelect, initialLocation }: GoogleMapPickerProps) {
	const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(initialLocation || null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [loadingAddress, setLoadingAddress] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mapCenter, setMapCenter] = useState<[number, number]>(
		initialLocation ? [initialLocation.lat, initialLocation.lng] : [10.4806, -66.9036] // Caracas por defecto
	);
	const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
		initialLocation ? [initialLocation.lat, initialLocation.lng] : null
	);

	useEffect(() => {
		setMapLoaded(true);
	}, []);

	useEffect(() => {
		if (initialLocation && !selectedLocation) {
			setSelectedLocation(initialLocation);
			setMapCenter([initialLocation.lat, initialLocation.lng]);
			setMarkerPosition([initialLocation.lat, initialLocation.lng]);
		}
	}, [initialLocation]);

	const handleMapClick = useCallback(
		(lat: number, lng: number) => {
			// Siempre colocar marcador cuando se hace clic en el mapa
			setMarkerPosition([lat, lng]);
			setMapCenter([lat, lng]);
			reverseGeocode(lat, lng);
		},
		[]
	);

	const reverseGeocode = async (lat: number, lng: number) => {
		setLoadingAddress(true);
		setError(null);
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
				{
					headers: {
						'User-Agent': 'KAVIRA/1.0',
					},
				}
			);

			if (!response.ok) {
				throw new Error('Error en geocodificación inversa');
			}

			const data = await response.json();
			const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
			const location = { lat, lng, address };
			setSelectedLocation(location);
			onLocationSelect(location);
		} catch (err) {
			console.error('[MapPicker] Error en geocodificación inversa:', err);
			const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
			const location = { lat, lng, address };
			setSelectedLocation(location);
			onLocationSelect(location);
		} finally {
			setLoadingAddress(false);
		}
	};

	const handleCurrentLocation = () => {
		if (!navigator.geolocation) {
			alert('Tu navegador no soporta geolocalización');
			return;
		}

		setLoadingAddress(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				setMarkerPosition([lat, lng]);
				setMapCenter([lat, lng]);
				reverseGeocode(lat, lng);
			},
			(error) => {
				setLoadingAddress(false);
				alert('No se pudo obtener tu ubicación actual');
				console.error('Error de geolocalización:', error);
			}
		);
	};

	const clearLocation = () => {
		setMarkerPosition(null);
		setSelectedLocation(null);
		onLocationSelect({ lat: 0, lng: 0, address: '' });
	};

	const handleMarkerDrag = useCallback((e: any) => {
		const marker = e.target;
		const position = marker.getLatLng();
		const newPosition: [number, number] = [position.lat, position.lng];
		setMarkerPosition(newPosition);
		setMapCenter(newPosition);
		reverseGeocode(position.lat, position.lng);
	}, []);

	if (!mapLoaded) {
		return (
			<div className="space-y-4">
				<div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
					<div className="text-center">
						<Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
						<p className="text-sm font-medium text-slate-700">Cargando mapa...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Mensaje informativo */}
			<div className="p-4 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 border-2 border-blue-200 rounded-xl shadow-sm">
				<div className="flex items-start gap-3">
					<div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md flex-shrink-0">
						<Info className="w-5 h-5 text-white" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-bold text-blue-900 mb-1">Instrucciones para seleccionar la ubicación</p>
						<p className="text-sm text-blue-800 leading-relaxed">
							Haz clic en el mapa para colocar el marcador inicial, luego <strong>arrastra el punto rojo</strong> hasta la ubicación exacta de tu consultorio. 
							La dirección se actualizará automáticamente cuando muevas el marcador.
						</p>
					</div>
					<button
						type="button"
						onClick={handleCurrentLocation}
						className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2 flex-shrink-0"
						title="Usar mi ubicación actual"
					>
						<Navigation className="w-4 h-4" />
						<span className="text-sm font-semibold">Mi Ubicación</span>
					</button>
				</div>
			</div>

			{/* Mapa con Leaflet */}
			<div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg" style={{ zIndex: 1, isolation: 'isolate' }}>
				{typeof window !== 'undefined' && (
					<div style={{ position: 'relative', zIndex: 1 }}>
						<MapComponent
							center={mapCenter}
							markerPosition={markerPosition}
							onMapClick={handleMapClick}
							onMarkerDrag={handleMarkerDrag}
						/>
					</div>
				)}
				{loadingAddress && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-teal-200" style={{ zIndex: 100 }}>
						<div className="flex items-center gap-2">
							<Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
							<span className="text-sm text-slate-700">Obteniendo dirección...</span>
						</div>
					</div>
				)}
				{error && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-50 border-2 border-red-200 rounded-lg shadow-lg" style={{ zIndex: 100 }}>
						<div className="flex items-center gap-2">
							<AlertCircle className="w-4 h-4 text-red-600" />
							<span className="text-sm text-red-700">{error}</span>
						</div>
					</div>
				)}
				{!markerPosition && (
					<div className="absolute top-4 left-4 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-lg" style={{ zIndex: 100 }}>
						<div className="flex items-center gap-2">
							<MapPin className="w-4 h-4 text-blue-600" />
							<span className="text-sm text-blue-700 font-medium">Haz clic en el mapa para colocar el marcador</span>
						</div>
					</div>
				)}
			</div>

			{/* Ubicación seleccionada mejorada */}
			{selectedLocation && selectedLocation.address && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-5 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-2 border-teal-200 rounded-xl shadow-sm"
				>
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-start gap-3 flex-1">
							<div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg shadow-md">
								<MapPin className="w-5 h-5 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-bold text-teal-900 mb-2">Ubicación del Consultorio</p>
								<p className="text-sm text-teal-800 leading-relaxed mb-2">{selectedLocation.address}</p>
								<div className="flex items-center gap-4 text-xs text-teal-600">
									<span>
										<strong>Lat:</strong> {selectedLocation.lat.toFixed(6)}
									</span>
									<span>
										<strong>Lng:</strong> {selectedLocation.lng.toFixed(6)}
									</span>
								</div>
								<p className="text-xs text-teal-600 mt-2 italic">
									💡 Puedes arrastrar el marcador rojo en el mapa para ajustar la ubicación
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={clearLocation}
							className="p-2 text-teal-600 hover:text-red-600 hover:bg-white rounded-lg transition-all flex-shrink-0"
							title="Limpiar ubicación"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</motion.div>
			)}
		</div>
	);
}
