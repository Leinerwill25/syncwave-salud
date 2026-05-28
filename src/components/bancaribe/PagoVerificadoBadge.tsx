'use client';

import React from 'react';
import { CheckCircle2, Clock, HelpCircle } from 'lucide-react';

interface Props {
  status: 'pending' | 'verified_bancaribe' | 'unverified' | string;
  reference?: string;
  amount?: number;
}

export function PagoVerificadoBadge({ status, reference, amount }: Props) {
  if (status === 'verified_bancaribe') {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold">Pago Verificado (Bancaribe)</p>
          {reference && (
            <p className="text-[10px] text-emerald-600">Ref: {reference}</p>
          )}
          {amount && (
            <p className="text-[10px] text-emerald-600">
              Bs. {amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
        <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold">Esperando Pago</p>
          <p className="text-[10px] text-amber-600">Pendiente de verificación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
      <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold">Sin Verificar</p>
        <p className="text-[10px] text-slate-400">No procesado por BaaS</p>
      </div>
    </div>
  );
}

export default PagoVerificadoBadge;
