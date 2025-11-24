// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../../public/globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import ConditionalMain from '@/components/ConditionalMain';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Syncwave Salud - Plataforma Integral de Salud para Venezuela',
	description: 'Plataforma tecnológica que une farmacias, laboratorios, consultorios privados y clínicas para brindar una atención médica más eficiente, accesible y de calidad a todos los venezolanos. Gestión de pacientes, historial médico digital, citas y recetas electrónicas.',
	keywords: 'salud digital, plataforma médica, Venezuela, consultorios, clínicas, farmacias, laboratorios, historial médico, citas médicas, telemedicina',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body className="antialiased bg-[#F5F7FA] text-[#2C3E50] overflow-x-hidden">
				{/* Navbar dinámico */}
				<NavbarSwitcher />

				{/* Main con padding condicional */}
				<ConditionalMain>
					{children}
				</ConditionalMain>
			</body>
		</html>
	);
}
