// src/app/dashboard/nurse/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentNurseProfileSSR } from '@/lib/auth/nurse-auth-server';
import { NurseAffiliatedDashboard } from '@/components/nurse/dashboard/NurseAffiliatedDashboard';

export default async function NurseDashboardPage() {
  const nurseSession = await getCurrentNurseProfileSSR();

  if (!nurseSession) {
    redirect('/login?redirect=/dashboard/nurse');
  }

  // Si es independiente, redirigir a su ruta específica
  // Esto solo ocurre si entran directamente a /dashboard/nurse
  if (nurseSession.nurseType === 'independent') {
    redirect('/dashboard/nurse/independent');
  }

  // Para enfermeras afiliadas, mostrar el dashboard normal
  return <NurseAffiliatedDashboard />;
}
