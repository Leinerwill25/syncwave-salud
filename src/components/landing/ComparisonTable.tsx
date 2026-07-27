'use client';

import { Check, Minus } from 'lucide-react';
import { FadeUp, ASHIRA } from './shared';

type Cell = boolean | 'partial';

const features: { name: string; pacientes: Cell; medico: Cell; org: Cell }[] = [
  { name: 'Historial médico completo', pacientes: true, medico: true, org: true },
  { name: 'Agenda de citas online', pacientes: true, medico: true, org: true },
  { name: 'Recetas electrónicas', pacientes: true, medico: true, org: true },
  { name: 'Resultados de laboratorio', pacientes: true, medico: true, org: true },
  { name: 'Módulo de consultas', pacientes: false, medico: true, org: true },
  { name: 'Dashboard de pacientes', pacientes: false, medico: true, org: true },
  { name: 'Facturación integrada', pacientes: false, medico: true, org: true },
  { name: 'Soporte prioritario', pacientes: false, medico: true, org: true },
  { name: 'Multi-especialista', pacientes: false, medico: false, org: true },
  { name: 'Múltiples sedes', pacientes: false, medico: false, org: true },
  { name: 'Integraciones avanzadas', pacientes: false, medico: false, org: true },
  { name: 'Analytics empresarial', pacientes: false, medico: false, org: true },
  { name: 'Account Manager dedicado', pacientes: false, medico: false, org: true },
];

function CellIcon({ value }: { value: Cell }) {
  if (value === true) return <Check className="w-5 h-5 mx-auto" style={{ color: ASHIRA.tealDeep }} aria-label="Incluido" />;
  return <Minus className="w-5 h-5 mx-auto text-slate-300" aria-label="No incluido" />;
}

export default function ComparisonTable() {
  return (
    <FadeUp className="mt-16">
      <h3 className="font-display text-xl sm:text-2xl font-extrabold text-center mb-8" style={{ color: ASHIRA.ink }}>
        Comparativa detallada de planes
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left p-4 font-semibold" style={{ color: ASHIRA.ink }}>Funcionalidad</th>
              <th className="p-4 font-display font-bold text-center" style={{ color: ASHIRA.ink }}>Pacientes</th>
              <th className="p-4 font-display font-bold text-center" style={{ color: ASHIRA.tealDeep }}>Médico / Consultorio</th>
              <th className="p-4 font-display font-bold text-center" style={{ color: ASHIRA.ink }}>Organizaciones</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f.name} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                <td className="p-4 font-medium" style={{ color: ASHIRA.ink }}>{f.name}</td>
                <td className="p-4"><CellIcon value={f.pacientes} /></td>
                <td className="p-4 bg-teal-50/30"><CellIcon value={f.medico} /></td>
                <td className="p-4"><CellIcon value={f.org} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-6">
        {(['pacientes', 'medico', 'org'] as const).map((plan) => {
          const labels = { pacientes: 'Pacientes', medico: 'Médico / Consultorio', org: 'Organizaciones' };
          return (
            <div key={plan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="font-display font-bold text-lg mb-4" style={{ color: plan === 'medico' ? ASHIRA.tealDeep : ASHIRA.ink }}>
                {labels[plan]}
              </h4>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                    <span style={{ color: ASHIRA.inkSoft }}>{f.name}</span>
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
