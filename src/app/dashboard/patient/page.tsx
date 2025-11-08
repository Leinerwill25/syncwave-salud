// src/app/(your-route)/page.tsx
import PatientChat from '@/components/patient/Chat';

const PatientDashboardPage = () => {
	return (
		<main className="min-h-screen bg-slate-50 p-6">
			<div className="max-w-5xl mx-auto">
				<header className="mb-6">
					<h1 className="text-2xl font-bold text-slate-900">Dashboard del Paciente</h1>
					<p className="mt-2 text-slate-600">Bienvenido a tu dashboard. Aquí podrás consultar tu información médica y recibir asesoramiento de nuestra IA.</p>
				</header>

				{/* Contenido principal del dashboard */}
				<section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					{/* ejemplo de cards o secciones, adapta según tu diseño */}
					<div className="col-span-2 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
						<h2 className="text-lg font-semibold text-slate-800 mb-2">Resumen clínico</h2>
						<p className="text-sm text-slate-600">Aquí puedes mostrar los datos relevantes del paciente: próximas citas, medicación, alergias, etc.</p>
					</div>

					<aside className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
						<h3 className="text-md font-medium text-slate-800 mb-2">Accesos rápidos</h3>
						<ul className="text-sm text-slate-600 space-y-2">
							<li>- Ver historial</li>
							<li>- Pruebas de laboratorio</li>
							<li>- Contactar con tu médico</li>
						</ul>
					</aside>
				</section>

				{/* Área adicional */}
				<section className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
					<h2 className="text-lg font-semibold text-slate-800 mb-3">Noticias y recomendaciones</h2>
					<p className="text-sm text-slate-600">Consejos cortos, artículos o recordatorios personalizados para el paciente.</p>
				</section>
			</div>

			{/* Widget de chat (burbuja flotante) */}
			{/* El componente PatientChat debe ser un client component que maneja la burbuja flotante y el panel */}
			<PatientChat />
		</main>
	);
};

export default PatientDashboardPage;
