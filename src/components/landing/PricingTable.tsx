'use client';

import { Check, Minus } from 'lucide-react';
import { FadeUp, C } from './shared';

type Cell = boolean;

const features: { name: string; pacientes: Cell; medico: Cell; org: Cell }[] = [
  { name: 'Historial médico completo', pacientes: true, medico: true, org: true },
  { name: 'Agenda de citas online', pacientes: true, medico: true, org: true },
  { name: 'Recetas electrónicas', pacientes: true, medico: true, org: true },
  { name: 'Resultados de laboratorio', pacientes: true, medico: true, org: true },
  { name: 'Módulo de consultas + IA clínica', pacientes: false, medico: true, org: true },
  { name: 'Gestión equipo admin completo', pacientes: false, medico: true, org: true },
  { name: 'Página pública + facturación', pacientes: false, medico: true, org: true },
  { name: 'Multi-especialista', pacientes: false, medico: false, org: true },
  { name: 'Múltiples sedes', pacientes: false, medico: false, org: true },
  { name: 'Integraciones avanzadas', pacientes: false, medico: false, org: true },
  { name: 'Analytics empresarial', pacientes: false, medico: false, org: true },
  { name: 'Account Manager dedicado', pacientes: false, medico: false, org: true },
];

function CellIcon({ value }: { value: Cell }) {
  if (value) return <Check className="w-5 h-5 mx-auto" style={{ color: C.teal }} aria-label="Incluido" />;
  return <Minus className="w-5 h-5 mx-auto opacity-30" style={{ color: C.inkLight }} aria-label="No incluido" />;
}

export default function PricingTable() {
  return (
    <FadeUp className="mt-16">
      <h3 className="font-display text-xl sm:text-2xl font-extrabold text-center mb-8" style={{ color: C.ink }}>
        Comparativa por plan
      </h3>

      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left p-4 font-medium" style={{ color: C.inkMuted }}>Funcionalidad</th>
              <th className="p-4 font-display font-bold text-center" style={{ color: C.ink }}>Pacientes</th>
              <th className="p-4 font-display font-bold text-center border-x border-teal-200 bg-teal-50" style={{ color: C.tealDark }}>Médico</th>
              <th className="p-4 font-display font-bold text-center" style={{ color: C.ink }}>Organizaciones</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-4 font-medium" style={{ color: C.ink }}>{f.name}</td>
                <td className="p-4"><CellIcon value={f.pacientes} /></td>
                <td className="p-4 border-x border-teal-100 bg-teal-50/30"><CellIcon value={f.medico} /></td>
                <td className="p-4"><CellIcon value={f.org} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-6">
        {(['pacientes', 'medico', 'org'] as const).map((plan) => {
          const labels = { pacientes: 'Pacientes', medico: 'Médico / Consultorio', org: 'Organizaciones' };
          return (
            <div key={plan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="font-display font-bold text-lg mb-4" style={{ color: plan === 'medico' ? C.tealDark : C.ink }}>
                {labels[plan]}
              </h4>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: C.inkMuted }}>{f.name}</span>
                    <CellIcon value={f[plan]} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </FadeUp>
  );
}
