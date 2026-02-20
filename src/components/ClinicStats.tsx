/** @refactored ASHIRA Clinic Dashboard - ClinicStats */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Users, Activity, Phone, Building2 } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

type Org = {
	id?: string;
	name?: string;
	type?: string;
	address?: string | null;
	phone?: string | null;
	specialistCount?: number | null;
	sede_count?: number | null;
	planId?: string | null;
};

type Props = {
	organization: Org | null;
	specialistsCount: number;
	recentPatientsCount: number;
};

export default function ClinicStats({ organization, specialistsCount, recentPatientsCount }: Props) {
	// defensivos / fallback
	const capacityTotal = organization?.specialistCount ?? Math.max(1, specialistsCount || 1);
	const safeCapacity = capacityTotal <= 0 ? 1 : capacityTotal;
	const specialistsPct = isFinite((specialistsCount / safeCapacity) * 100)
		? Math.round((specialistsCount / safeCapacity) * 100)
		: 0;

	const stats = [
		{
			title: 'Plan activo',
			value: organization?.planId ?? 'Sin plan',
			subtitle: 'Suscripción vigente de la clínica',
			icon: CreditCard,
			variant: 'info' as const,
		},
		{
			title: 'Especialistas',
			value: specialistsCount,
			subtitle: `${specialistsPct}% de capacidad (${organization?.specialistCount ?? '—'} máx.)`,
			icon: Users,
			variant: 'success' as const,
			trend: specialistsPct > 0 ? { value: specialistsPct, isPositive: true, label: 'capacidad' } : undefined,
		},
		{
			title: 'Pacientes recientes',
			value: recentPatientsCount,
			subtitle: 'Interacciones en el periodo',
			icon: Activity,
			variant: 'default' as const,
		},
		{
			title: 'Sedes',
			value: organization?.sede_count ?? '—',
			subtitle: organization?.phone ?? 'Sin teléfono registrado',
			icon: Building2,
			variant: 'warning' as const,
		},
	];

	return (
		<section className="w-full" aria-label="Estadísticas de la clínica">
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
				{stats.map((stat, index) => (
					<motion.div
						key={stat.title}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: index * 0.05 }}
					>
						<StatCard
							title={stat.title}
							value={stat.value}
							subtitle={stat.subtitle}
							icon={stat.icon}
							variant={stat.variant}
							trend={stat.trend}
						/>
					</motion.div>
				))}
			</div>
		</section>
	);
}
