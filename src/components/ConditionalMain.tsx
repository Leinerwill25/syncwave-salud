'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalMain({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? '/';
	
	// Solo agregar padding-top para páginas del dashboard
	// Las landing pages no necesitan padding porque ya tienen su propio espaciado
	const isDashboard = pathname.startsWith('/dashboard');
	const isLanding = pathname.startsWith('/landing') || pathname === '/';
	
	const paddingClass = isDashboard ? 'pt-16' : isLanding ? '' : 'pt-16';
	
	return (
		<main className={`min-h-screen ${paddingClass}`}>
			{children}
		</main>
	);
}

