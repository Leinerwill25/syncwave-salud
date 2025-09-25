// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../../public/globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Syncwave',
	description: 'Diseño, desarrollo y marketing para empresas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body className="antialiased bg-[#F5F7FA] text-[#2C3E50]">
				{/* Navbar dinámico */}
				<NavbarSwitcher />

				{/* Espaciado para que el contenido no quede oculto bajo la navbar */}
				<main className="min-h-screen pt-16">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">{children}</div>
				</main>
			</body>
		</html>
	);
}
