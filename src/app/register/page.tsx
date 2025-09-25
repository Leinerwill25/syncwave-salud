// src/app/register/page.tsx
import RegisterForm from '@/components/RegisterForm';

export default function RegisterPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-white p-6">
			<div className="w-full max-w-2xl">
				<h1 className="text-3xl font-bold text-center mb-6 text-sky-700">Registro en Syncwave Salud</h1>
				<p className="text-center text-gray-600 mb-8">Completa el formulario para crear tu cuenta y comenzar a usar la plataforma.</p>
				<RegisterForm />
			</div>
		</main>
	);
}
