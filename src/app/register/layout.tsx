import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Registro - ASHIRA',
	description: 'Únete a ASHIRA. Crea tu cuenta como médico, especialista independiente o paciente y comienza a transformar la atención en salud en Venezuela.',
	keywords: 'registro, crear cuenta, ASHIRA, médico, paciente, consultorio privado, plataforma médica, Venezuela',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
