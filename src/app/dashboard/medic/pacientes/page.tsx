// app/dashboard/patients/page.tsx
import PatientsGrid from '@/components/PatientsGrid';

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
			<div className="relative p-6 md:p-12">
				{/* Main grid */}
				<section>
					<PatientsGrid perPage={10} />
				</section>
			</div>
		</main>
	);
}
