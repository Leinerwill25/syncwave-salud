// src/app/register/page.tsx
import RegisterForm from '@/components/RegisterForm';
import { HeartPulse } from 'lucide-react';

export default function RegisterPage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 py-6 sm:py-8 lg:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				{/* Header elegante */}
				<div className="text-center mb-6 sm:mb-8 lg:mb-10">
					<div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg mb-4 sm:mb-6">
						<HeartPulse className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
					</div>
					<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
						Bienvenido a Syncwave Salud
					</h1>
					<p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto px-2">
						Únete a nuestra plataforma de gestión médica. Crea tu cuenta en minutos y comienza a transformar la atención en salud.
					</p>
				</div>
				<RegisterForm />
			</div>
		</main>
	);
}
