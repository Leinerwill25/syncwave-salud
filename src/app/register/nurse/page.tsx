// src/app/register/nurse/page.tsx
// ─── Registro de Enfermera Independiente ──────────────────
import { NurseRegisterStepper } from '@/components/nurse/auth/NurseRegisterStepper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro — Enfermera Independiente · ASHIRA',
  description: 'Crea tu cuenta de enfermera independiente en la red ASHIRA Software.',
};

export default function NurseRegisterPage() {
  return <NurseRegisterStepper />;
}
