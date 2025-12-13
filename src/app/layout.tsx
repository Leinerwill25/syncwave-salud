// app/layout.tsx
import type { Metadata } from 'next';
import '../../public/globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import ConditionalMain from '@/components/ConditionalMain';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
	title: 'KAVIRA - Plataforma Integral de Salud Digital para Venezuela | Dra. Carwin Silva - Ginecóloga Especialista',
	description: 'KAVIRA es la plataforma tecnológica líder que conecta consultorios privados, clínicas, farmacias y laboratorios en Venezuela. Dra. Carwin Silva, ginecóloga especialista en ginecología regenerativa, funcional y estética, embajadora oficial. Gestión integral de pacientes, historial médico digital, citas online, recetas electrónicas y resultados de laboratorio. Transforma tu práctica médica con tecnología de vanguardia.',
	keywords: 'KAVIRA, plataforma salud digital Venezuela, gestión médica digital, historial médico electrónico, citas médicas online, recetas electrónicas, laboratorios clínicos Venezuela, farmacias digitales, telemedicina Venezuela, software médico, sistema gestión clínica, plataforma médica integral, salud digital Venezuela, consultorios médicos digitales, clínicas digitales, Dra. Carwin Silva, Doctora Carwin Silva, Ginecóloga Venezuela, Ginecólogo Venezuela, Ginecología Caracas, Ginecología Estética, Ginecología Regenerativa, Ginecología Funcional, Consulta Ginecológica, Salud Femenina, Medicina Funcional Ginecología, Ginecólogo Especialista Venezuela',
	openGraph: {
		title: 'KAVIRA - Plataforma Integral de Salud Digital | Dra. Carwin Silva - Ginecóloga Especialista',
		description: 'Conecta consultorios, clínicas, farmacias y laboratorios en un ecosistema unificado de salud digital. Dra. Carwin Silva, ginecóloga especialista en Venezuela, embajadora oficial de KAVIRA.',
		type: 'website',
		locale: 'es_VE',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'KAVIRA - Plataforma Integral de Salud Digital | Dra. Carwin Silva',
		description: 'Transforma tu práctica médica con la plataforma tecnológica más completa del sector salud. Ginecóloga especialista Dra. Carwin Silva, embajadora oficial.',
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es" className="overflow-x-hidden">
			<body className="antialiased bg-[#F5F7FA] text-[#2C3E50] overflow-x-hidden w-full max-w-full">
				{/* Navbar dinámico */}
				<NavbarSwitcher />

				{/* Main con padding condicional */}
				<ConditionalMain>{children}</ConditionalMain>

				{/* Toaster para notificaciones */}
				<Toaster position="top-right" richColors />
			</body>
		</html>
	);
}
