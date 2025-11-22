'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet en Next.js
if (typeof window !== 'undefined') {
	delete (L.Icon.Default.prototype as any)._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
		iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
		shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
	});
}

interface Location {
	lat: number;
	lng: number;
	address?: string;
}

interface LeafletMapViewerClientProps {
	location: Location;
	address?: string;
}

export default function LeafletMapViewerClient({ location, address }: LeafletMapViewerClientProps) {
	const mapRef = useRef<L.Map | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const markerRef = useRef<L.Marker | null>(null);

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return;

		// Crear mapa
		const map = L.map(containerRef.current, {
			center: [location.lat, location.lng],
			zoom: 15,
			scrollWheelZoom: true,
		});

		// Agregar capa de OpenStreetMap
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19,
		}).addTo(map);

		// Agregar marcador
		const marker = L.marker([location.lat, location.lng], {
			icon: L.icon({
				iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
				iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
				shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				tooltipAnchor: [16, -28],
				shadowSize: [41, 41],
			}),
		}).addTo(map);

		// Agregar popup con dirección si está disponible
		if (address || location.address) {
			marker.bindPopup(`<div class="p-2"><strong>${address || location.address}</strong></div>`).openPopup();
		}

		mapRef.current = map;
		markerRef.current = marker;

		// Cleanup
		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		};
	}, [location, address]);

	return (
		<div
			ref={containerRef}
			className="w-full h-80 rounded-xl overflow-hidden border-2 border-purple-200 shadow-lg"
			style={{ zIndex: 1 }}
		/>
	);
}

