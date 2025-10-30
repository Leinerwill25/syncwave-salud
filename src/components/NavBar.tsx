// components/PublicNavBar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicNavBar() {
	const [open, setOpen] = useState(false);
	const mobileRef = useRef<HTMLDivElement | null>(null);

	// close mobile menu on outside click or on ESC
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setOpen(false);
		}
		function onClick(e: MouseEvent) {
			if (!mobileRef.current) return;
			if (open && !mobileRef.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('keydown', onKey);
		document.addEventListener('click', onClick);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('click', onClick);
		};
	}, [open]);

	const navLinks = [
		{ href: '#servicios', label: 'Servicios' },
		{ href: '#paquetes', label: 'Paquetes' },
		{ href: '#estrategias', label: 'Estrategias' },
		{ href: '#contacto', label: 'Contacto' },
	];

	return (
		<header className="sticky top-0 z-50">
			{/* animated gradient halo behind the bar (soft, low-contrast) */}
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[1200px] h-24 -z-10 rounded-3xl blur-3xl opacity-30 animate-nav-gradient"
				style={{
					background: 'linear-gradient(90deg, rgba(74,144,226,0.18) 0%, rgba(142,124,195,0.14) 50%, rgba(74,144,226,0.12) 100%)',
				}}
			/>

			{/* navbar surface: translucent white to keep legibility on varied backgrounds */}
			<div className="backdrop-blur-sm bg-white/60 border-b" style={{ borderColor: 'rgba(44,62,80,0.06)' }}>
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="flex h-20 items-center justify-between">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-4 no-underline" aria-label="Inicio - Syncwave">
							<div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
								<Image src="/3.png" alt="Syncwave" fill sizes="48px" className="object-contain" />
							</div>

							<div className="flex flex-col leading-tight">
								<span className="font-semibold text-[#2C3E50] text-base">Syncwave</span>
								<span className="text-xs text-[#2C3E50]/65 -mt-0.5">• Calidad De Vida •</span>
							</div>
						</Link>

						{/* Desktop nav links */}
						<nav className="hidden md:flex md:items-center md:gap-8" aria-label="Navegación principal">
							{navLinks.map((l) => (
								<Link key={l.href} href={l.href} className="relative px-3 py-2 text-sm font-medium text-[#2C3E50]/88 hover:text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 rounded">
									<span className="group relative inline-block">
										{l.label}
										<span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-linear-to-r from-[#4A90E2] via-[#7BAEE8] to-[#8E7CC3] transition-all group-hover:w-full rounded" />
									</span>
								</Link>
							))}
						</nav>

						{/* Actions */}
						<div className="flex items-center gap-4">
							<div className="hidden md:flex md:items-center md:gap-4">
								<Link
									href="/login"
									className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
									style={{
										borderColor: 'rgba(44,62,80,0.06)',
										color: '#4A90E2',
										background: 'transparent',
									}}>
									Iniciar Sesión
								</Link>

								<Link
									href="/register"
									className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold shadow transform transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
									style={{
										background: 'linear-gradient(90deg,#4A90E2 0%, #8E7CC3 100%)',
										boxShadow: '0 8px 26px rgba(74,144,226,0.12), 0 2px 8px rgba(142,124,195,0.06)',
										color: '#ffffff',
									}}
									aria-label="Registrarse en Syncwave">
									Registrarse
								</Link>
							</div>

							{/* Mobile menu button */}
							<button className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[#2C3E50] hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" aria-expanded={open} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((s) => !s)}>
								<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
									{open ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />}
								</svg>
							</button>
						</div>
					</div>
				</div>

				{/* Mobile panel with backdrop */}
				<div ref={mobileRef} className={`md:hidden fixed inset-x-4 top-20 z-50 transform-gpu transition-all duration-300 ease-in-out ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-98 pointer-events-none'}`} aria-hidden={!open}>
					{/* backdrop */}
					<div className={`fixed inset-0 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} aria-hidden="true" style={{ background: 'rgba(44,62,80,0.08)' }} />

					<div className="relative mx-auto max-w-md">
						<div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl" style={{ border: '1px solid rgba(44,62,80,0.04)' }}>
							<div className="px-6 py-5">
								<div className="flex flex-col gap-4">
									{navLinks.map((l) => (
										<Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base font-medium text-[#2C3E50] hover:bg-[#F5F7FA] transition">
											{l.label}
										</Link>
									))}

									<div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'rgba(44,62,80,0.04)' }}>
										<Link href="/login" onClick={() => setOpen(false)} className="w-full text-center px-4 py-3 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgba(44,62,80,0.06)', color: '#4A90E2', background: 'transparent' }}>
											Iniciar Sesión
										</Link>

										<Link href="/register" onClick={() => setOpen(false)} className="w-full text-center px-4 py-3 rounded-lg text-sm font-semibold shadow" style={{ background: 'linear-gradient(90deg,#4A90E2 0%, #8E7CC3 100%)', color: '#fff' }}>
											Registrarse
										</Link>
									</div>

									<div className="pt-3 text-sm text-[#2C3E50]/70">
										<p>
											¿Necesitas ayuda?{' '}
											<Link href="/contacto" className="text-[#4A90E2] underline">
												Contáctanos
											</Link>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Keyframes for animated halo */}
			<style jsx>{`
				@keyframes navGradient {
					0% {
						transform: translateX(-50%) rotate(0deg) scale(1);
					}
					50% {
						transform: translateX(-50%) rotate(180deg) scale(1.02);
					}
					100% {
						transform: translateX(-50%) rotate(360deg) scale(1);
					}
				}
				.animate-nav-gradient {
					animation: navGradient 12s linear infinite;
				}
			`}</style>
		</header>
	);
}
