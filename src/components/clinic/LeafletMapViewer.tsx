'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Importar Leaflet dinámicamente solo en el cliente
const LeafletMapViewer = dynamic(() => import('./LeafletMapViewerClient'), {
	ssr: false,
	loading: () => (
		<div className="w-full h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
				<p className="text-slate-600 font-medium">Cargando mapa...</p>
			</div>
		</div>
	),
});

export default LeafletMapViewer;

