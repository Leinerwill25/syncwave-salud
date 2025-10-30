'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CalendarDays, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

type KpiTitle = 'Pacientes Atendidos' | 'Citas Programadas' | 'Ingresos Generados';

interface KPI {
	title: KpiTitle;
	value: number | string;
	change: string;
	trend: 'up' | 'down' | 'neutral';
}

export default function KPISection() {
	const [kpis, setKpis] = useState<KPI[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// 🔑 Incluimos cookies de sesión con la solicitud
				const res = await fetch('/api/dashboard/medic/kpis', {
					cache: 'no-store',
					credentials: 'include', // ✅ Esto es clave
				});

				if (!res.ok) {
					console.error(`❌ Error HTTP ${res.status}:`, await res.text());
					setKpis([]);
					return;
				}

				const data = await res.json();

				if (Array.isArray(data)) {
					setKpis(data);
				} else {
					console.error('❌ Respuesta inesperada en KPIs:', data);
					setKpis([]);
				}
			} catch (error) {
				console.error('Error fetching KPIs:', error);
				setKpis([]);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const iconMap: Record<KpiTitle, any> = {
		'Pacientes Atendidos': Users,
		'Citas Programadas': CalendarDays,
		'Ingresos Generados': DollarSign,
	};

	const gradientMap: Record<KpiTitle, string> = {
		'Pacientes Atendidos': 'from-violet-500/90 to-indigo-600/90',
		'Citas Programadas': 'from-sky-500/90 to-blue-600/90',
		'Ingresos Generados': 'from-emerald-500/90 to-teal-600/90',
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="bg-white/70 border border-gray-100 shadow-sm rounded-2xl">
						<CardContent className="p-6 flex items-center gap-5">
							<div className="w-12 h-12 bg-gray-200 rounded-2xl" />
							<div className="space-y-2 w-full">
								<div className="h-3 bg-gray-200 rounded w-1/2"></div>
								<div className="h-5 bg-gray-300 rounded w-2/3"></div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{kpis.map((kpi, i) => {
				const Icon = iconMap[kpi.title];
				const gradient = gradientMap[kpi.title];

				return (
					<motion.div key={i} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
						<Card className="relative bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all rounded-2xl overflow-hidden">
							<CardContent className="p-6 flex items-center gap-5 relative z-10">
								<div className={`relative flex items-center justify-center bg-linear-to-br ${gradient} p-4 rounded-2xl text-white`}>
									<Icon className="w-6 h-6" />
									<div className={`absolute inset-0 rounded-2xl opacity-30 blur-md bg-linear-to-br ${gradient}`} />
								</div>

								<div className="flex flex-col justify-center">
									<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.title}</h3>
									<p className="text-3xl font-extrabold text-gray-900 mt-1 leading-none">{kpi.value}</p>
									<p className={`text-sm mt-2 font-semibold ${kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>{kpi.change}</p>
								</div>
							</CardContent>

							<div className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-[0.06]`} />
							<div className={`absolute bottom-0 left-0 w-full h-[3px] bg-linear-to-r ${gradient}`} />
						</Card>
					</motion.div>
				);
			})}
		</div>
	);
}
