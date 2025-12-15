'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
	iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
	shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapPickerProps {
	lat: number | null;
	lng: number | null;
	address: string;
	onLocationSelect: (lat: number, lng: number) => void;
	onAddressChange: (address: string) => void;
	inputClass?: string;
}

// Función para hacer reverse geocoding usando Nominatim (OpenStreetMap)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
			{
				headers: {
					'User-Agent': 'ASHIRA-Clinic-App/1.0',
				},
			}
		);
		
		if (!response.ok) {
			throw new Error('Error en reverse geocoding');
		}
		
		const data = await response.json();
		if (data.address) {
			// Construir dirección legible
			const parts = [];
			if (data.address.road) parts.push(data.address.road);
			if (data.address.house_number) parts.push(data.address.house_number);
			if (data.address.neighbourhood || data.address.suburb) {
				parts.push(data.address.neighbourhood || data.address.suburb);
			}
			if (data.address.city || data.address.town || data.address.village) {
				parts.push(data.address.city || data.address.town || data.address.village);
			}
			if (data.address.state) parts.push(data.address.state);
			if (data.address.country) parts.push(data.address.country);
			
			return parts.join(', ') || data.display_name || '';
		}
		return data.display_name || '';
	} catch (error) {
		console.warn('Error en reverse geocoding:', error);
		return '';
	}
}

export default function LocationMapPicker({ lat, lng, address, onLocationSelect, onAddressChange, inputClass }: LocationMapPickerProps) {
	// Centro por defecto en Venezuela (Caracas)
	const defaultCenter: [number, number] = [10.4806, -66.9036];
	
	// Estado interno para la posición del marcador
	const [internalPosition, setInternalPosition] = useState<[number, number] | null>(
		lat !== null && lng !== null ? [lat, lng] : null
	);
	
	// Ref para evitar re-renders innecesarios
	const isInitialized = useRef(false);
	const mapRef = useRef<L.Map | null>(null);

	// Inicializar posición solo una vez al montar
	useEffect(() => {
		if (isInitialized.current) return;
		
		if (lat !== null && lng !== null) {
			setInternalPosition([lat, lng]);
			isInitialized.current = true;
		} else if (typeof window !== 'undefined' && navigator.geolocation) {
			// Intentar obtener ubicación del usuario, pero si falla usar Venezuela
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
					setInternalPosition(userPos);
					onLocationSelect(userPos[0], userPos[1]);
					isInitialized.current = true;
				},
				() => {
					// Si falla geolocalización, usar centro de Venezuela
					setInternalPosition(defaultCenter);
					isInitialized.current = true;
				},
				{ timeout: 5000 }
			);
		} else {
			setInternalPosition(defaultCenter);
			isInitialized.current = true;
		}
	}, []); // Dependencias vacías - solo se ejecuta al montar

	// Actualizar posición solo si cambia desde props (no en cada render)
	useEffect(() => {
		if (lat !== null && lng !== null && 
			(internalPosition === null || internalPosition[0] !== lat || internalPosition[1] !== lng)) {
			setInternalPosition([lat, lng]);
			if (mapRef.current) {
				mapRef.current.setView([lat, lng], 15);
			}
		}
	}, [lat, lng]); // Solo cuando cambian lat/lng desde props

	// Callback para cuando se selecciona una ubicación en el mapa
	const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
		const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
		setInternalPosition(newPos);
		onLocationSelect(newPos[0], newPos[1]);
		
		// Hacer reverse geocoding para obtener la dirección
		const reverseGeocodedAddress = await reverseGeocode(newPos[0], newPos[1]);
		if (reverseGeocodedAddress) {
			onAddressChange(reverseGeocodedAddress);
		}
	}, [onLocationSelect, onAddressChange]);

	function LocationMarker() {
		const map = useMapEvents({
			click: handleMapClick,
		});

		// Guardar referencia del mapa
		useEffect(() => {
			mapRef.current = map;
		}, [map]);

		return internalPosition === null ? null : <Marker position={internalPosition} />;
	}

	const defaultInputClass = 'mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 hover:shadow-md';

	// Memoizar el center para evitar re-renders
	const mapCenter = useMemo(() => internalPosition || defaultCenter, [internalPosition]);

	return (
		<div className="space-y-3">
			<div className="h-64 w-full rounded-lg overflow-hidden border-2 border-slate-200">
				<MapContainer 
					center={mapCenter} 
					zoom={internalPosition ? 15 : 7} 
					style={{ height: '100%', width: '100%' }} 
					className="z-0"
					key={`map-${internalPosition?.[0]}-${internalPosition?.[1]}`}
				>
					<TileLayer 
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
					/>
					<LocationMarker />
				</MapContainer>
			</div>
			<input 
				type="text" 
				value={address} 
				onChange={(e) => onAddressChange(e.target.value)} 
				className={inputClass || defaultInputClass} 
				placeholder="Dirección completa (se actualiza automáticamente al seleccionar en el mapa)" 
			/>
			{internalPosition && (
				<p className="text-xs text-slate-500">
					Coordenadas seleccionadas: {internalPosition[0].toFixed(6)}, {internalPosition[1].toFixed(6)}
				</p>
			)}
		</div>
	);
}

