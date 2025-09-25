// components/BallpitClient.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const Ballpit = dynamic<any>(() => import('@appletosolutions/reactbits').then((mod) => mod.Ballpit as any), { ssr: false });

export default function BallpitClientWrapper(props: any) {
	// permitimos que el padre controle el posicionamiento; por defecto lo dejamos full-inset
	return (
		<div className={`absolute inset-0 w-full h-full overflow-hidden ${props.className ?? ''}`} style={props.style}>
			{/* colocamos el ballpit absolutamente y detrás del contenido */}
			<div className="absolute inset-0 -z-10 pointer-events-none">
				{/* Si la librería acepta estilos, se los pasamos para reforzar tamaño */}
				<Ballpit {...props} count={150} colors={['#FFFFFF', '#4A90E2', '#8E7CC3', '#27AE60', '#9CA3AF']} ambientIntensity={1} gravity={0.1} friction={0.8} wallBounce={0.95} ambientColor={16777215} displayCursor={0} followCursor={true} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
			</div>
		</div>
	);
}
