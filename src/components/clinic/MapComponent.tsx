// components/clinic/MapComponent.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Icon } from 'leaflet';

interface MapComponentProps {
	center: [number, number];
	markerPosition: [number, number] | null;
	onMapClick: (lat: number, lng: number) => void;
	onMarkerDrag: (e: any) => void;
}

// Crear icono personalizado más visible (rojo para destacar)
const createCustomIcon = (): Icon => {
	return L.icon({
		iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
		shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41],
		tooltipAnchor: [16, -28],
	});
};

// Componente para manejar clicks en el mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
	useMapEvents({
		click: (e) => {
			onMapClick(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

// Componente para centrar el mapa cuando cambia la ubicación
function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
	const map = useMap();
	const isFirstRender = useRef(true);

	useEffect(() => {
		// Solo animar si no es el primer render
		if (!isFirstRender.current) {
			map.flyTo(center, zoom, {
				duration: 0.8,
			});
		} else {
			map.setView(center, zoom);
			isFirstRender.current = false;
		}
	}, [map, center, zoom]);

	return null;
}

export default function MapComponent({ center, markerPosition, onMapClick, onMarkerDrag }: MapComponentProps) {
	const customIcon = createCustomIcon();
	const zoom = markerPosition ? 16 : 11;

	return (
		<MapContainer
			center={center}
			zoom={zoom}
			style={{ height: '500px', width: '100%', position: 'relative', zIndex: 1 }}
			scrollWheelZoom={true}
			zoomControl={true}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{markerPosition && (
				<Marker
					position={markerPosition}
					draggable={true}
					icon={customIcon}
					eventHandlers={{
						dragend: onMarkerDrag,
					}}
				>
					<Popup>
						<div className="text-sm font-semibold text-slate-900">
							Ubicación del Consultorio
						</div>
						<div className="text-xs text-slate-600 mt-1">
							Arrastra el marcador para ajustar la ubicación
						</div>
					</Popup>
				</Marker>
			)}
			<MapClickHandler onMapClick={onMapClick} />
			<MapCenter center={center} zoom={zoom} />
		</MapContainer>
	);
}
