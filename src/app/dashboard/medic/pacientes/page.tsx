// app/dashboard/patients/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load del componente pesado para mejorar tiempo de carga inicial
const PatientsGrid = dynamic(() => import('@/components/PatientsGrid'), {
	loading: () => (
		<div className="flex items-center justify-center min-h-[400px]">
			<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
		</div>
	),
	ssr: true, // Mantener SSR para SEO
});

export const metadata = {
	title: 'Pacientes | Dashboard',
	description: 'Visualiza, gestiona y consulta los pacientes registrados en el sistema.',
};

export default function PatientsPage() {
	return (
		<main className="relative min-h-screen overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm">
			{/* Fondo con gradiente clínico */}
			<div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-100 via-indigo-100 to-emerald-100 opacity-90" />

			{/* Overlay decorativo translúcido */}
			<div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-500/5 via-indigo-600/5 to-emerald-500/5" />

			{/* Contenido principal */}
			<div className="relative p-4 sm:p-6 md:p-12">
				{/* Main grid */}
				<section>
					<Suspense fallback={
						<div className="flex items-center justify-center min-h-[400px]">
							<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
						</div>
					}>
						<PatientsGrid perPage={10} />
					</Suspense>
				</section>
			</div>
		</main>
	);
}
