// components/clinic/LeafletMapPicker.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Search, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Importar estilos de Leaflet
import 'leaflet/dist/leaflet.css';

// Importar componentes de react-leaflet dinámicamente (solo en cliente)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then((mod) => mod.useMapEvents), { ssr: false });

// Componente para manejar eventos del mapa
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
	if (typeof window === 'undefined') return null;
	
	const MapClickComponent = () => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const map = useMapEvents({
			click: (e) => {
				onClick(e.latlng.lat, e.latlng.lng);
			},
		});
		return null;
	};
	
	// Importar useMapEvents dinámicamente
	const { useMapEvents: useMapEventsHook } = require('react-leaflet');
	const map = useMapEventsHook({
		click: (e: any) => {
			onClick(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

interface LeafletMapPickerProps {
	onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
	initialLocation?: { lat: number; lng: number; address: string } | null;
}

export default function LeafletMapPicker({ onLocationSelect, initialLocation }: LeafletMapPickerProps) {
	const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(
		initialLocation || null
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [mapLoaded, setMapLoaded] = useState(false);
	const [loadingAddress, setLoadingAddress] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
		initialLocation ? [initialLocation.lat, initialLocation.lng] : null
	);
	const [isClient, setIsClient] = useState(false);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapRef = useRef<any>(null);

	// Detectar si estamos en el cliente
	useEffect(() => {
		setIsClient(true);
		
		// Configurar iconos de Leaflet
		if (typeof window !== 'undefined') {
			import('leaflet').then((L) => {
				import('leaflet/dist/images/marker-icon.png').then((icon) => {
					import('leaflet/dist/images/marker-shadow.png').then((iconShadow) => {
						const DefaultIcon = L.default.icon({
							iconUrl: icon.default.src || icon.default,
							shadowUrl: iconShadow.default.src || iconShadow.default,
							iconSize: [25, 41],
							iconAnchor: [12, 41],
							popupAnchor: [1, -34],
							shadowSize: [41, 41],
						});
						L.default.Marker.prototype.options.icon = DefaultIcon;
					});
				});
			});
		}
	}, []);

	// Sincronizar initialLocation
	useEffect(() => {
		if (initialLocation && !selectedLocation) {
			setSelectedLocation(initialLocation);
			setMarkerPosition([initialLocation.lat, initialLocation.lng]);
		}
	}, [initialLocation]);

	// Función para buscar direcciones usando Nominatim
	const searchAddress = useCallback(async (query: string) => {
		if (!query.trim()) {
			setSearchResults([]);
			setShowSearchResults(false);
			return;
		}

		// Limpiar timeout anterior
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		// Debounce: esperar 500ms antes de buscar
		searchTimeoutRef.current = setTimeout(async () => {
			try {
				// Usar Nominatim API pública (con límites de uso)
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ve&addressdetails=1`,
					{
						headers: {
							'User-Agent': 'SyncWave-Salud/1.0', // Requerido por Nominatim
						},
					}
				);

				if (!response.ok) {
					throw new Error('Error en la búsqueda');
				}

				const data = await response.json();
				setSearchResults(data);
				setShowSearchResults(true);
			} catch (err) {
				console.error('[LeafletMapPicker] Error buscando dirección:', err);
				setError('Error al buscar la dirección. Por favor intenta de nuevo.');
			}
		}, 500);
	}, []);

	// Función para geocodificación inversa (coordenadas -> dirección)
	const reverseGeocode = useCallback(async (lat: number, lng: number) => {
		setLoadingAddress(true);
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
				{
					headers: {
						'User-Agent': 'SyncWave-Salud/1.0',
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
			console.error('[LeafletMapPicker] Error en geocodificación inversa:', err);
			const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
			const location = { lat, lng, address };
			setSelectedLocation(location);
			onLocationSelect(location);
		} finally {
			setLoadingAddress(false);
		}
	}, [onLocationSelect]);

	// Manejar selección de resultado de búsqueda
	const handleSelectSearchResult = useCallback(
		(result: any) => {
			const lat = parseFloat(result.lat);
			const lng = parseFloat(result.lon);
			const address = result.display_name || result.name || '';

			setMarkerPosition([lat, lng]);
			setSelectedLocation({ lat, lng, address });
			onLocationSelect({ lat, lng, address });
			setSearchQuery('');
			setShowSearchResults(false);
			setSearchResults([]);
		},
		[onLocationSelect]
	);

	// Manejar click en el mapa
	const handleMapClick = useCallback(
		(lat: number, lng: number) => {
			setMarkerPosition([lat, lng]);
			reverseGeocode(lat, lng);
		},
		[reverseGeocode]
	);

	// Manejar arrastre del marcador
	const handleMarkerDragEnd = useCallback(
		(e: any) => {
			const { lat, lng } = e.target.getLatLng();
			setMarkerPosition([lat, lng]);
			reverseGeocode(lat, lng);
		},
		[reverseGeocode]
	);

	// Obtener ubicación actual
	const handleCurrentLocation = useCallback(() => {
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
				reverseGeocode(lat, lng);
			},
			(error) => {
				setLoadingAddress(false);
				alert('No se pudo obtener tu ubicación actual');
				console.error('Error de geolocalización:', error);
			}
		);
	}, [reverseGeocode]);

	// Limpiar ubicación
	const clearLocation = useCallback(() => {
		setMarkerPosition(null);
		setSelectedLocation(null);
		setSearchQuery('');
		onLocationSelect({ lat: 0, lng: 0, address: '' });
	}, [onLocationSelect]);

	// Centro por defecto (Caracas, Venezuela)
	const defaultCenter: [number, number] = selectedLocation
		? [selectedLocation.lat, selectedLocation.lng]
		: [10.4806, -66.9036];

	const defaultZoom = selectedLocation ? 16 : 11;

	if (!isClient || typeof window === 'undefined') {
		return (
			<div className="space-y-4">
				<div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg h-[500px] bg-slate-100 flex items-center justify-center">
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
			{/* Búsqueda con autocomplete */}
			<div className="relative">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value);
						searchAddress(e.target.value);
					}}
					onFocus={() => {
						if (searchResults.length > 0) {
							setShowSearchResults(true);
						}
					}}
					onBlur={() => {
						// Delay para permitir click en resultados
						setTimeout(() => setShowSearchResults(false), 200);
					}}
					placeholder="Buscar dirección o lugar (ej: Av. Principal, Caracas)"
					className="w-full pl-12 pr-32 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 shadow-sm transition-all"
				/>
				<button
					type="button"
					onClick={handleCurrentLocation}
					className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-md"
					title="Usar mi ubicación actual"
				>
					<Navigation className="w-4 h-4" />
				</button>

				{/* Resultados de búsqueda */}
				{showSearchResults && searchResults.length > 0 && (
					<div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
						{searchResults.map((result, index) => (
							<button
								key={index}
								type="button"
								onMouseDown={(e) => {
									e.preventDefault(); // Prevenir blur del input
									handleSelectSearchResult(result);
								}}
								className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-slate-100 last:border-b-0"
							>
								<div className="flex items-start gap-2">
									<MapPin className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold text-slate-900 truncate">{result.display_name}</p>
										{result.address && (
											<p className="text-xs text-slate-500 mt-0.5">
												{result.address.city || result.address.town || result.address.village || ''}
												{result.address.state ? `, ${result.address.state}` : ''}
											</p>
										)}
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Mapa Leaflet */}
			<div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
				{isClient && MapContainer && (
					<MapContainer
						center={defaultCenter}
						zoom={defaultZoom}
						style={{ height: '500px', width: '100%' }}
						whenReady={() => setMapLoaded(true)}
						ref={mapRef}
					>
						{TileLayer && (
							<TileLayer
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
						)}
						{markerPosition && Marker && (
							<Marker
								position={markerPosition}
								draggable={true}
								eventHandlers={{
									dragend: handleMarkerDragEnd,
								}}
							>
								{Popup && <Popup>Ubicación del consultorio</Popup>}
							</Marker>
						)}
						<MapClickHandler onClick={handleMapClick} />
					</MapContainer>
				)}
				{!mapLoaded && (
					<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 z-10">
						<div className="text-center">
							<Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
							<p className="text-sm font-medium text-slate-700">Cargando mapa...</p>
						</div>
					</div>
				)}
				{error && (
					<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-amber-50 z-10">
						<div className="text-center p-6">
							<AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
							<p className="text-sm font-bold text-red-900 mb-2">Error</p>
							<p className="text-xs text-red-700">{error}</p>
						</div>
					</div>
				)}
				{loadingAddress && mapLoaded && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-teal-200 z-20">
						<div className="flex items-center gap-2">
							<Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
							<span className="text-sm text-slate-700">Obteniendo dirección...</span>
						</div>
					</div>
				)}
			</div>

			{/* Ubicación seleccionada */}
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
