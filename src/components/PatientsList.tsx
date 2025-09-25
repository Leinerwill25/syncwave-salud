// components/PatientsList.tsx
'use client';

import React from 'react';
import Link from 'next/link';

type Patient = {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	dob?: string | Date | null;
	gender?: string | null;
	phone?: string | null;
	createdAt?: string | Date | null;
};

function initials(name?: string | null) {
	if (!name) return '—';
	return name
		.split(' ')
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

function fmtDate(d?: string | Date | null) {
	if (!d) return '—';
	try {
		return new Date(String(d)).toLocaleDateString();
	} catch {
		return '—';
	}
}

/**
 * PatientsList
 * - elegante, corporativo y minimalista
 * - tarjeta con encabezado, contador y lista compacta
 * - cada elemento muestra avatar, nombre, id y fecha de registro
 */
export default function PatientsList({ patients }: { patients: Patient[] }) {
	// safe fallback
	const list = Array.isArray(patients) ? patients : [];

	if (list.length === 0) {
		return (
			<div className="rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm p-5 text-center">
				<div className="text-sm font-semibold text-slate-900">Pacientes recientes</div>
				<p className="mt-2 text-xs text-slate-500">No hay pacientes recientes.</p>
				<div className="mt-4 flex justify-center">
					<Link href="/dashboard/patients/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-medium shadow-sm hover:scale-[1.01] transition">
						Agregar paciente
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm overflow-hidden">
			<div className="flex items-center justify-between p-4 border-b border-slate-100">
				<div>
					<h3 className="text-sm font-semibold text-slate-900">Pacientes recientes</h3>
					<p className="text-xs text-slate-500 mt-1">Últimos pacientes añadidos o con actividad reciente</p>
				</div>
				<div className="text-xs text-slate-500">
					{list.length} {list.length === 1 ? 'paciente' : 'pacientes'}
				</div>
			</div>

			<ul className="divide-y divide-slate-100">
				{list.map((p) => {
					const name = `${p.firstName ?? ''}${p.lastName ? ' ' + p.lastName : ''}`.trim() || 'Nombre no disponible';
					return (
						<li key={p.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition-colors" role="listitem">
							<div className="flex items-center gap-4 min-w-0">
								<div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gradient-to-br from-slate-100 to-white border border-slate-100 flex items-center justify-center text-slate-800 font-semibold">{initials(name)}</div>

								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<div className="text-sm font-medium text-slate-900 truncate">{name}</div>
									</div>
									<div className="text-xs text-slate-500 mt-1 truncate">
										Registrado: {fmtDate(p.createdAt)} {p.phone ? `• ${p.phone}` : ''}
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="hidden sm:flex flex-col text-right">
									<span className="text-xs text-slate-500">Última actividad</span>
									<span className="text-sm font-medium text-slate-800">{fmtDate(p.createdAt)}</span>
								</div>

								<div className="flex items-center gap-2">
									<Link href={`/dashboard/patients/${p.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-100 bg-white text-sm text-slate-700 hover:shadow-sm transition" aria-label={`Ver paciente ${name}`}>
										Ver
									</Link>
								</div>
							</div>
						</li>
					);
				})}
			</ul>

			<div className="p-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
				<div>Mostrar todos los pacientes</div>
				<Link href="/dashboard/patients" className="text-sky-600 hover:underline text-sm">
					Ver lista completa
				</Link>
			</div>
		</div>
	);
}
