// components/medic/AlertsButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import AlertsModal from './AlertsModal';

export default function AlertsButton() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [alertCount, setAlertCount] = useState(0);
	const [criticalCount, setCriticalCount] = useState(0);

	useEffect(() => {
		// Esperar un poco para asegurar que la sesión esté establecida
		const timeoutId = setTimeout(() => {
			fetchAlertCounts();
		}, 500);

		// Actualizar cada 60 segundos
		const interval = setInterval(fetchAlertCounts, 60000);
		
		return () => {
			clearTimeout(timeoutId);
			clearInterval(interval);
		};
	}, []);

	const fetchAlertCounts = async () => {
		try {
			const res = await fetch('/api/medic/alerts', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (res.ok) {
				const data = await res.json();
				setAlertCount(data.counts?.total || 0);
				setCriticalCount(data.counts?.critical || 0);
			} else if (res.status === 401) {
				// Si no está autenticado, simplemente no mostrar alertas
				// No es un error crítico, el usuario puede no estar logueado aún
				setAlertCount(0);
				setCriticalCount(0);
			} else {
				console.warn('[AlertsButton] Error al cargar alertas:', res.status, res.statusText);
			}
		} catch (err) {
			// Solo loguear errores de red, no errores de autenticación
			if (err instanceof TypeError && err.message.includes('fetch')) {
				console.error('[AlertsButton] Error de red al cargar alertas:', err);
			}
			// No establecer valores por defecto en caso de error de red
		}
	};

	return (
		<>
			<button
				onClick={() => setIsModalOpen(true)}
				className={`group relative flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-4 rounded-full font-semibold text-sm transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-110 active:scale-95 ${
					criticalCount > 0
						? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 animate-pulse'
						: alertCount > 0
						? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
						: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
				}`}
				title="Ver alertas y recordatorios"
			>
				<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
				<span className="hidden md:inline">Alertas</span>
				{alertCount > 0 && (
					<span className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold min-w-[24px] flex items-center justify-center ${
						criticalCount > 0 ? 'bg-white text-red-600 ring-2 ring-red-300' : 'bg-white text-orange-600 ring-2 ring-orange-300'
					}`}>
						{alertCount > 99 ? '99+' : alertCount}
					</span>
				)}
			</button>
			<AlertsModal 
				isOpen={isModalOpen} 
				onClose={() => {
					setIsModalOpen(false);
					fetchAlertCounts(); // Actualizar conteo al cerrar
				}} 
			/>
		</>
	);
}

