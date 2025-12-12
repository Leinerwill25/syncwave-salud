import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro - KAVIRA',
  description: 'Únete a KAVIRA. Crea tu cuenta como médico, especialista independiente o paciente y comienza a transformar la atención en salud en Venezuela.',
  keywords: 'registro, crear cuenta, KAVIRA, médico, paciente, consultorio privado, plataforma médica, Venezuela',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
