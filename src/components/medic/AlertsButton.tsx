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
		fetchAlertCounts();
		// Actualizar cada 60 segundos
		const interval = setInterval(fetchAlertCounts, 60000);
		return () => clearInterval(interval);
	}, []);

	const fetchAlertCounts = async () => {
		try {
			const res = await fetch('/api/medic/alerts', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setAlertCount(data.counts?.total || 0);
				setCriticalCount(data.counts?.critical || 0);
			}
		} catch (err) {
			console.error('Error cargando conteo de alertas:', err);
		}
	};

	return (
		<>
			<button
				onClick={() => setIsModalOpen(true)}
				className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg ${
					criticalCount > 0
						? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 animate-pulse'
						: alertCount > 0
						? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
						: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
				}`}
				title="Ver alertas y recordatorios"
			>
				<AlertTriangle className="w-5 h-5" />
				<span className="hidden sm:inline">Alertas</span>
				{alertCount > 0 && (
					<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
						criticalCount > 0 ? 'bg-white text-red-600' : 'bg-white text-orange-600'
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

