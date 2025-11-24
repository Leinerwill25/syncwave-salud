import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro - Syncwave Salud',
  description: 'Únete a Syncwave Salud. Crea tu cuenta como médico, especialista independiente o paciente y comienza a transformar la atención en salud en Venezuela.',
  keywords: 'registro, crear cuenta, Syncwave Salud, médico, paciente, consultorio privado, plataforma médica, Venezuela',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
