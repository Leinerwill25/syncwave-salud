// src/app/register/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import BallpitClientWrapper from '@/components/Ballpit';

export default function RegisterPage() {
	const [count, setCount] = useState(200);
	const bgRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function handleResizeCount() {
			const w = window.innerWidth;
			if (w < 640) setCount(60);
			else if (w < 1024) setCount(120);
			else setCount(200);
		}
		handleResizeCount();
		window.addEventListener('resize', handleResizeCount);
		return () => window.removeEventListener('resize', handleResizeCount);
	}, []);

	useEffect(() => {
		const container = bgRef.current;
		if (!container) return;

		const resizeCanvasToViewport = () => {
			window.dispatchEvent(new Event('resize'));
			const canv = container.querySelector('canvas') as HTMLCanvasElement | null;
			if (canv) {
				canv.width = window.innerWidth;
				canv.height = window.innerHeight;
				canv.style.width = '100%';
				canv.style.height = '100%';
				canv.style.position = 'absolute';
				canv.style.top = '0';
				canv.style.left = '0';
				canv.style.inset = '0';
				canv.style.display = 'block';
				canv.style.pointerEvents = 'none';
			}
		};

		resizeCanvasToViewport();
		const t1 = window.setTimeout(resizeCanvasToViewport, 80);
		const t2 = window.setTimeout(resizeCanvasToViewport, 400);

		const mo = new MutationObserver((mutations) => {
			for (const m of mutations) {
				for (const node of Array.from(m.addedNodes)) {
					if (node instanceof HTMLCanvasElement || (node instanceof HTMLElement && node.querySelector && node.querySelector('canvas'))) {
						resizeCanvasToViewport();
						return;
					}
				}
			}
		});

		mo.observe(container, { childList: true, subtree: true });
		window.addEventListener('resize', resizeCanvasToViewport);

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			mo.disconnect();
			window.removeEventListener('resize', resizeCanvasToViewport);
		};
	}, []);

	return (
		<main className="flex min-h-screen items-center justify-center bg-white rounded-3xl p-6">
			{/* --- Fondo Ballpit: fixed para cubrir todo el viewport --- */}
			<div id="ballpit-bg" ref={bgRef} className="fixed inset-0 z-0" aria-hidden="true">
				{/* contenedor directo full-screen */}
				<div className="absolute inset-0 w-full h-full">
					<BallpitClientWrapper />
				</div>

				{/* overlay sutil */}
				<div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/5" />
			</div>

			{/* --- Formulario --- */}
			<LoginForm />

			{/* Forzamos estilos globales para cualquier canvas dentro de #ballpit-bg */}
			<style jsx global>{`
				#ballpit-bg {
					position: fixed;
					inset: 0;
					width: 100%;
					height: 100%;
				}

				#ballpit-bg canvas {
					position: absolute !important;
					top: 0 !important;
					left: 0 !important;
					width: 100% !important;
					height: 100% !important;
					display: block !important;
					pointer-events: none !important;
				}
			`}</style>
		</main>
	);
}
