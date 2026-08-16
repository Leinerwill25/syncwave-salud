'use client';

import React, { useEffect, useState, Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const Ballpit = dynamic<any>(
	() => import('@appletosolutions/reactbits').then((mod) => mod.Ballpit as any),
	{ ssr: false }
);

class BallpitErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error: unknown) {
		console.warn('[Ballpit] disabled after render error:', error);
	}

	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}

/**
 * Fondo decorativo solo en desktop.
 * En móvil no se monta: WebGL/Three.js suele lanzar excepciones y tumba toda la página de login.
 */
export default function BallpitClientWrapper(props: any) {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		const sync = () => setEnabled(mq.matches);
		sync();
		mq.addEventListener?.('change', sync);
		return () => mq.removeEventListener?.('change', sync);
	}, []);

	if (!enabled) return null;

	return (
		<BallpitErrorBoundary>
			<div
				className={`absolute inset-0 w-full h-full overflow-hidden ${props.className ?? ''}`}
				style={props.style}
			>
				<div className="absolute inset-0 -z-10 pointer-events-none">
					<Ballpit
						{...props}
						count={150}
						colors={['#FFFFFF', '#4A90E2', '#8E7CC3', '#27AE60', '#9CA3AF']}
						ambientIntensity={1}
						gravity={0.1}
						friction={0.8}
						wallBounce={0.95}
						ambientColor={16777215}
						displayCursor={0}
						followCursor={true}
						style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
					/>
				</div>
			</div>
		</BallpitErrorBoundary>
	);
}
