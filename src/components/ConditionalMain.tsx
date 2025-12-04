'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? '/';
	
	// Solo agregar padding-top para páginas que no son dashboard ni landing
	// Los dashboards manejan su propio padding en sus layouts
	// Las landing pages no necesitan padding porque ya tienen su propio espaciado
	// Las páginas públicas de consultorios (/c/) tampoco necesitan padding
	const isDashboard = pathname.startsWith('/dashboard');
	const isLanding = pathname.startsWith('/landing') || pathname === '/';
	const isLoginOrRegister = pathname.startsWith('/login') || pathname.startsWith('/register');
	const isPublicConsultorio = pathname.startsWith('/c/');
	
	// No agregar padding a dashboards, landing pages, login, register o páginas públicas de consultorios
	const paddingClass = (isDashboard || isLanding || isLoginOrRegister || isPublicConsultorio) ? '' : 'pt-16';
	
	return (
		<main className={`min-h-screen ${paddingClass} overflow-x-hidden w-full max-w-full`}>
			{children}
		</main>
	);
}

