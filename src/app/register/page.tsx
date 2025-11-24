// src/app/register/page.tsx
import RegisterForm from '@/components/RegisterForm';
import { HeartPulse } from 'lucide-react';

export default function RegisterPage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				{/* Header elegante */}
				<div className="text-center mb-10">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg mb-6">
						<HeartPulse className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent mb-4">
						Bienvenido a Syncwave Salud
					</h1>
					<p className="text-lg text-slate-600 max-w-2xl mx-auto">
						Únete a nuestra plataforma de gestión médica. Crea tu cuenta en minutos y comienza a transformar la atención en salud.
					</p>
				</div>
				<RegisterForm />
			</div>
		</main>
	);
}
