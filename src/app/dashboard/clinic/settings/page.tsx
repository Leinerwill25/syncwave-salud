'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, CreditCard, Database, CalendarDays, Check, X, Users, Mail, CreditCard as CC } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Revisión final: enfoque en estructura y legibilidad
 * - Más espacio en blanco y ritmo vertical
 * - Jerarquía clara (títulos, subtítulos, contenido)
 * - Alineación consistente y tarjetas con alturas y paddings homogéneos
 * - Componentes reutilizables y semánticos
 *
 * Usa Tailwind para estilos; ajusta variables/colors si tu proyecto tiene tokens de marca.
 */

interface ClinicProfile {
	id: string;
	organization_id?: string;
	legal_name?: string | null;
	trade_name?: string | null;
	offices_count?: number | null;
	specialties?: string[] | null;
	updated_at?: string | null;
	specialistCount?: number;
	storagePerSpecialistMB?: number;
	invitesAvailable?: number;
	subscriptionEndDate?: string;
	planHistory?: { date: string; specialists: number }[];
	storageHistory?: { date: string; storageMB: number }[];
	plan?: Plan | null;
}

interface Plan {
	id: string;
	name: string;
	minSpecialists: number;
	maxSpecialists: number;
	monthlyPrice: number;
	quarterlyPrice?: number | null;
	annualPrice?: number | null;
	description?: string | null;
}

/* -------------------------
   Small presentational components
   ------------------------- */

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<div>
			<h2 className="text-lg lg:text-xl font-semibold text-slate-900">{title}</h2>
			{subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
		</div>
	);
}

function KPI({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
	return (
		<div
			className="
        flex flex-col justify-between
        w-full h-full
        rounded-2xl border border-slate-100 bg-white
        p-5 shadow-sm hover:shadow-md
        transition-all duration-200 ease-in-out
      ">
			{/* Encabezado con ícono y label */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					{icon && <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-50 text-sky-700">{icon}</div>}
					<span className="text-sm font-medium text-slate-500 tracking-wide">{label}</span>
				</div>
			</div>

			{/* Valor principal */}
			<div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>

			{/* Hint (texto descriptivo) */}
			{hint && <div className="mt-1 text-xs text-slate-400 font-medium">{hint}</div>}
		</div>
	);
}

function StatCard({ title, value, subtitle }: { title: string; value: React.ReactNode; subtitle?: string }) {
	return (
		<div className="p-4 rounded-xl bg-white ring-1 ring-slate-100 shadow-sm min-h-[110px] flex flex-col justify-between">
			<div className="text-xs text-slate-400">{title}</div>
			<div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
			{subtitle && <div className="text-sm text-slate-500 mt-3">{subtitle}</div>}
		</div>
	);
}

function PlanDetailCard({ plan }: { plan?: Plan | null }) {
	return (
		<div className="p-5 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 h-full flex flex-col">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="text-xs text-slate-400">Detalle — plan actual</div>
					<div className="text-lg font-semibold text-slate-900 mt-1">{plan?.name ?? 'Gratis'}</div>
				</div>

				<div className="text-right">
					<div className="text-teal-700 font-bold">{plan ? (plan.monthlyPrice > 0 ? `$${plan.monthlyPrice.toFixed(2)}/mes` : 'Gratis') : 'Gratis'}</div>
					<div className="text-xs text-slate-400 mt-1">{plan ? `${plan.minSpecialists}–${plan.maxSpecialists} especialistas` : 'Limitado'}</div>
				</div>
			</div>

			<hr className="my-4 border-slate-100" />

			<ul className="text-sm text-slate-600 space-y-4 mt-auto">
				<li className="flex items-start gap-3">
					<span className="mt-1 text-teal-500">
						<Check className="w-4 h-4" />
					</span>
					<div>
						<div className="font-medium text-slate-800">Acceso al dashboard</div>
						<div className="text-xs text-slate-500">Panel centralizado con todas las funciones</div>
					</div>
				</li>

				<li className="flex items-start gap-3">
					<span className="mt-1 text-teal-500">
						<Check className="w-4 h-4" />
					</span>
					<div>
						<div className="font-medium text-slate-800">Export CSV</div>
						<div className="text-xs text-slate-500">Exporta datos clínicos para auditoría</div>
					</div>
				</li>

				<li className="flex items-start gap-3">
					<span className="mt-1 text-teal-500">
						<Check className="w-4 h-4" />
					</span>
					<div>
						<div className="font-medium text-slate-800">Soporte por email</div>
						<div className="text-xs text-slate-500">Respuesta en 24–48 hrs según plan</div>
					</div>
				</li>
			</ul>
		</div>
	);
}

function RecommendedCard({ plan, onUpgrade, disabled }: { plan?: Plan | null; onUpgrade: () => void; disabled?: boolean }) {
	return (
		<div className="p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-white shadow-md ring-1 ring-slate-100 h-full flex flex-col justify-between">
			<div>
				<div className="text-xs text-slate-400">Recomendado</div>
				<div className="mt-1 text-lg font-semibold text-slate-900">{plan?.name}</div>

				<div className="mt-4 flex items-baseline gap-3">
					<div className="text-2xl font-extrabold text-teal-700 leading-none">{plan ? `$${plan.monthlyPrice.toFixed(2)}` : '-'}</div>
					<div className="text-sm text-slate-500">/mes</div>
				</div>

				<div className="text-xs text-slate-400 mt-1">{plan ? `${plan.minSpecialists}–${plan.maxSpecialists} especialistas` : ''}</div>

				<p className="mt-3 text-sm text-slate-600 leading-relaxed">{plan?.description}</p>
			</div>

			<div className="mt-6">
				<Button onClick={onUpgrade} disabled={disabled} className="w-full bg-gradient-to-r from-sky-600 to-teal-500 text-white shadow">
					Actualizar al recomendado
				</Button>
				<div className="mt-2 text-xs text-slate-400">Actualizar te llevará al checkout seguro.</div>
			</div>
		</div>
	);
}

/* -------------------------
   Page component
   ------------------------- */

export default function ClinicSettingsPage(): React.ReactElement {
	const supabase = createSupabaseBrowserClient();

	const [loading, setLoading] = useState<boolean>(true);
	const [clinic, setClinic] = useState<ClinicProfile | null>(null);
	const [form, setForm] = useState<Partial<ClinicProfile>>({});
	const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
	const [recommendedPlan, setRecommendedPlan] = useState<Plan | null>(null);
	const [extraInvites, setExtraInvites] = useState<number>(0);
	const [upgrading, setUpgrading] = useState<boolean>(false);
	const [showConfirmUpgrade, setShowConfirmUpgrade] = useState<boolean>(false);

	useEffect(() => {
		fetchClinic();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchClinic = async () => {
		try {
			setLoading(true);
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			const res = await fetch('/api/clinic/profile', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al cargar la clínica.');

			const normalized: ClinicProfile = {
				id: data?.clinicProfile?.id ?? data?.organization?.id ?? '',
				legal_name: data?.organization?.name ?? null,
				specialistCount: data?.specialistCount ?? data?.organization?.specialistCount ?? 0,
				storagePerSpecialistMB: data?.storagePerSpecialistMB ?? 500,
				invitesAvailable: data?.invitesAvailable ?? 0,
				subscriptionEndDate: data?.subscription?.endDate ?? null,
				planHistory: data?.planHistory ?? [],
				plan: data?.plan ?? null,
				storageHistory: data?.storageHistory ?? [],
				updated_at: data?.updated_at ?? data?.clinicProfile?.updated_at ?? null,
			};

			setClinic(normalized);
			setForm(normalized);
			setCurrentPlan(data?.plan ?? null);
			setRecommendedPlan(calcRecommendedPlan(normalized.specialistCount ?? 0));
		} catch (err: any) {
			console.error('Error al cargar clínica:', err);
			toast.error(err?.message ?? 'No se pudo cargar la información.');
		} finally {
			setLoading(false);
		}
	};

	const calcRecommendedPlan = (specialistCount: number): Plan => {
		if (specialistCount < 10)
			return {
				id: 'small',
				name: 'Pequeña (<10)',
				minSpecialists: 1,
				maxSpecialists: 9,
				monthlyPrice: 29.99,
				description: 'Ideal para consultorios y clínicas pequeñas. Funcionalidades esenciales y soporte básico.',
			};
		if (specialistCount >= 10 && specialistCount <= 20)
			return {
				id: '10-20',
				name: 'Mediana (10–20)',
				minSpecialists: 10,
				maxSpecialists: 20,
				monthlyPrice: 69.99,
				description: 'Reportes, integraciones básicas y soporte prioritario.',
			};
		if (specialistCount >= 21 && specialistCount <= 50)
			return {
				id: '21-50',
				name: 'Intermedia (21–50)',
				minSpecialists: 21,
				maxSpecialists: 50,
				monthlyPrice: 99.99,
				description: 'Integraciones avanzadas, alertas y SLA mejorado.',
			};
		if (specialistCount >= 51 && specialistCount <= 100)
			return {
				id: '51-100',
				name: 'Enterprise (51–100)',
				minSpecialists: 51,
				maxSpecialists: 100,
				monthlyPrice: 149.99,
				description: 'API, soporte dedicado y acuerdos de nivel de servicio.',
			};
		return {
			id: 'custom',
			name: 'Sobredimensionado — Contáctanos',
			minSpecialists: specialistCount,
			maxSpecialists: specialistCount,
			monthlyPrice: 0,
			description: 'Cotización personalizada para grandes operaciones.',
		};
	};

	useEffect(() => {
		if (!clinic) return;
		setRecommendedPlan(calcRecommendedPlan(clinic.specialistCount ?? 0));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clinic?.specialistCount]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value, type } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
		}));
	};

	const handleSave = async () => {
		try {
			setLoading(true);
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			const res = await fetch('/api/clinic/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ ...form, extraInvites }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al guardar los cambios.');

			toast.success('Información actualizada correctamente.');
			setClinic((prev) => ({ ...(prev ?? {}), ...data }));
		} catch (err: any) {
			console.error('Error al guardar clínica:', err);
			toast.error(err?.message ?? 'No se pudo guardar la información.');
		} finally {
			setLoading(false);
		}
	};

	const isFreePlan = useMemo(() => {
		if (!currentPlan) return true;
		return Number(currentPlan.monthlyPrice) === 0;
	}, [currentPlan]);

	const handleStartUpgrade = () => {
		if (!recommendedPlan) return toast.error('No hay plan recomendado calculado.');
		setShowConfirmUpgrade(true);
	};

	const handleConfirmUpgrade = async () => {
		try {
			setUpgrading(true);
			setShowConfirmUpgrade(false);

			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({
					planSlug: recommendedPlan?.id,
					billingPeriod: 'monthly',
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al crear suscripción.');

			if (data?.checkoutUrl) {
				window.location.href = data.checkoutUrl;
				return;
			}

			toast.success('Proceso de actualización iniciado. Serás redirigido al checkout.');
		} catch (err: any) {
			console.error('Error al iniciar upgrade:', err);
			toast.error(err?.message ?? 'No se pudo iniciar la actualización.');
		} finally {
			setUpgrading(false);
		}
	};

	if (loading)
		return (
			<div className="flex items-center justify-center h-[70vh]">
				<Loader2 className="w-12 h-12 animate-spin text-sky-600" />
			</div>
		);

	if (!clinic) return <div className="text-center py-12 text-slate-500">No se encontró información de la clínica.</div>;

	/* Layout notes:
     - Container max-w para mantener la lectura cómoda
     - Grid principal: contenido principal (2/3) + sidebar (1/3)
     - Espaciado vertical generoso para evitar agrupamiento
  */

	return (
		<motion.div className="p-8 space-y-8 max-w-7xl mx-auto" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
			{/* Header */}
			<header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
				<div className="flex-1 min-w-0">
					<h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">{clinic.legal_name ?? 'Mi Clínica'}</h1>
					<p className="mt-2 text-sm text-slate-500 max-w-2xl">Panel de administración — configura perfil, suscripción y recursos por especialista.</p>

					<div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
						<KPI label="Especialistas" value={<span className="text-slate-900">{clinic.specialistCount ?? 0}</span>} hint="Activos / permitidos" icon={<Users className="w-4 h-4" />} />
						<KPI label="Invitaciones" value={<span className="text-slate-900">{clinic.invitesAvailable ?? 0}</span>} hint="Disponibles" icon={<Mail className="w-4 h-4" />} />
						<KPI label="Almacenamiento" value={<span className="text-slate-900">{clinic.storagePerSpecialistMB ?? 500} MB</span>} hint="Por especialista" icon={<Database className="w-4 h-4" />} />
					</div>
				</div>

				<div className="w-full lg:w-64 flex-shrink-0">
					<div className="text-right">
						<div className="text-xs text-slate-500">Plan actual</div>
						<div className="text-lg font-semibold text-slate-900">{currentPlan?.name ?? 'Gratis'}</div>
						<div className="text-xs text-slate-400 mt-1">{clinic.subscriptionEndDate ? `Vence: ${new Date(clinic.subscriptionEndDate).toLocaleDateString()}` : 'Sin suscripción activa'}</div>
					</div>
				</div>
			</header>

			{/* Main grid */}
			<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Primary column (2/3) */}
				<div className="lg:col-span-2 space-y-6">
					{/* Plan overview */}
					<Card className="rounded-2xl shadow-lg border border-transparent overflow-hidden">
						<CardHeader className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-white p-6">
							<div className="flex items-center gap-4">
								<CC className="w-6 h-6 text-sky-600" />
								<CardTitle className="text-lg font-semibold text-slate-900">Estado del plan & recomendaciones</CardTitle>
							</div>
							<div className="text-sm text-slate-500">Última actualización: {clinic.updated_at ? new Date(clinic.updated_at).toLocaleString() : '—'}</div>
						</CardHeader>

						<CardContent className="p-6 space-y-6 bg-white">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<StatCard title="Tu plan" value={currentPlan?.name ?? 'Gratis / Trial'} subtitle={currentPlan?.description ?? 'Funciones limitadas'} />
								<StatCard title="Especialistas" value={clinic.specialistCount ?? 0} subtitle="Uso real vs. límite del plan" />
								<StatCard title="Invitaciones" value={clinic.invitesAvailable ?? 0} subtitle="Invitaciones sin usar" />
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<PlanDetailCard plan={currentPlan} />
								<RecommendedCard plan={recommendedPlan} onUpgrade={handleStartUpgrade} disabled={!isFreePlan || upgrading} />
							</div>
						</CardContent>
					</Card>

					{/* Storage & Invitations — versión final: más elegante, corporativa y legible */}
					<div className="flex flex-col gap-6 w-full">
						{/* Almacenamiento por especialista */}
						<Card className="w-full rounded-3xl shadow-lg ring-1 ring-slate-200 overflow-hidden border border-slate-100">
							{/* Header */}
							<div className="flex items-start gap-4 p-6 bg-white">
								<div className="flex items-center justify-center w-14 h-14 rounded-lg bg-sky-50 border border-sky-100">
									<Database className="w-6 h-6 text-sky-600" />
								</div>

								<div className="min-w-0">
									<h4 className="text-base font-semibold text-slate-900 leading-tight">Almacenamiento por especialista</h4>
									<p className="text-sm text-slate-500 mt-1 max-w-[60ch] leading-relaxed">Espacio reservado por usuario para documentos clínicos y multimedia. Ajusta según el volumen y las necesidades de tu clínica.</p>
								</div>
							</div>

							<div className="border-t border-slate-100" />

							{/* Body */}
							<CardContent className="p-6">
								<div className="flex flex-col gap-5">
									<div>
										<label htmlFor="storagePerSpecialistMB" className="block text-xs font-semibold text-slate-600 mb-2">
											MB por especialista
										</label>

										<div className="flex items-center gap-3">
											<Input id="storagePerSpecialistMB" name="storagePerSpecialistMB" type="number" min={100} step={50} aria-label="MB por especialista" className="w-full h-12 rounded-md border border-slate-200 shadow-sm px-3 placeholder:text-slate-400" placeholder="500" value={String(form.storagePerSpecialistMB ?? 500)} onChange={handleChange} />
											<div className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700">MB</div>
										</div>

										<div className="mt-3 text-sm text-slate-500 leading-relaxed max-w-[60ch]">Aumentar el almacenamiento permite conservar más archivos por especialista. Los cambios pueden implicar cargos adicionales.</div>

										<div className="mt-3 text-xs text-slate-400">
											Recomendado mínimo: <span className="font-medium text-slate-800">500 MB</span>
										</div>
									</div>

									{/* Acción principal — botón ancho y prominente */}
									<div>
										<Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-sky-700 to-teal-600 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-200">
											{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Invitaciones */}
						<Card className="w-full rounded-3xl shadow-lg ring-1 ring-slate-200 overflow-hidden border border-slate-100">
							{/* Header */}
							<div className="flex items-start gap-4 p-6 bg-white">
								<div className="flex items-center justify-center w-14 h-14 rounded-lg bg-emerald-50 border border-emerald-100">
									<UserPlus className="w-6 h-6 text-emerald-600" />
								</div>

								<div className="min-w-0">
									<h4 className="text-base font-semibold text-slate-900 leading-tight">Invitaciones</h4>
									<p className="text-sm text-slate-500 mt-1 max-w-[60ch] leading-relaxed">Gestiona y adquiere invitaciones para nuevos especialistas de forma segura. Compra al instante o solicita un paquete a medida.</p>
								</div>
							</div>

							<div className="border-t border-slate-100" />

							{/* Body */}
							<CardContent className="p-6">
								<div className="flex flex-col gap-5">
									<div>
										<label htmlFor="extraInvites" className="block text-xs font-semibold text-slate-600 mb-2">
											Invitaciones extra
										</label>

										<div className="flex items-center gap-3">
											<Input id="extraInvites" name="extraInvites" type="number" min={0} step={1} aria-label="Invitaciones extra" className="w-full h-12 rounded-md border border-slate-200 shadow-sm px-3 placeholder:text-slate-400" placeholder="0" value={String(extraInvites)} onChange={(e) => setExtraInvites(Number(e.target.value || 0))} />
											<div className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700">x $10</div>
										</div>

										<div className="mt-3 flex items-center justify-between gap-4">
											<div className="text-sm text-slate-500">Invitaciones disponibles</div>
											<div className="text-sm font-semibold text-slate-800">{clinic.invitesAvailable ?? 0}</div>
										</div>

										<div className="mt-3 text-xs text-slate-400 leading-relaxed max-w-[60ch]">Las invitaciones extra se cobrarán al finalizar el checkout. Si necesitas un volumen mayor o facturación corporativa, contacta soporte.</div>
									</div>

									{/* Acciones — CTA principal y secundaria clara */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-sky-700 to-teal-600 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-200">
											{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
										</Button>

										<div className="flex items-center justify-between gap-3">
											<Button variant="outline" className="w-full px-5 py-3 border rounded-lg">
												Ver historial
											</Button>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Chart (separado y con padding consistente) */}
					{clinic.planHistory && clinic.planHistory.length > 0 && (
						<Card className="rounded-2xl shadow-sm ring-1 ring-slate-200 mt-6 overflow-hidden">
							<CardHeader className="flex items-center gap-3 p-4 bg-white border-b border-slate-100">
								<CalendarDays className="w-5 h-5 text-sky-600" />
								<CardTitle className="text-md font-medium text-slate-900">Historial de especialistas</CardTitle>
							</CardHeader>
							<CardContent className="h-56 p-4">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={clinic.planHistory}>
										<XAxis dataKey="date" tick={{ fontSize: 12 }} />
										<YAxis tick={{ fontSize: 12 }} />
										<Tooltip />
										<Bar dataKey="specialists" fill="#06b6d4" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar (cards seguras contra overflow — mejor legibilidad en anchos estrechos) */}
				<aside className="space-y-6 w-full">
					{/* Resumen principal */}
					<Card className="w-full rounded-3xl shadow-lg border border-slate-100 p-6 bg-white overflow-hidden">
						<div className="flex items-start gap-4">
							{/* Avatar / iniciales */}
							<div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-semibold text-lg" aria-hidden="true" title={clinic.legal_name ?? clinic.trade_name ?? 'Mi Clínica'}>
								{(
									(clinic.legal_name ?? clinic.trade_name ?? 'MC')
										.split(' ')
										.map((s) => s?.[0])
										.join('')
										.slice(0, 2) || 'MC'
								).toUpperCase()}
							</div>

							<div className="min-w-0">
								<div className="text-xs font-medium text-slate-400">Resumen</div>

								{/* Title: permitir quiebre y evitar overflow */}
								<div className="mt-1 text-base font-semibold text-slate-900 leading-snug break-words max-w-full whitespace-normal">{clinic.legal_name ?? clinic.trade_name ?? 'Mi Clínica'}</div>

								{/* Badges: permitir wrapping en anchos pequeños */}
								<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
									<span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 text-slate-700">
										<span className="text-[10px] text-slate-500">Plan</span>
										<strong className="text-xs">{currentPlan?.name ?? 'Gratis'}</strong>
									</span>

									{clinic.subscriptionEndDate && (
										<span className="text-xs text-slate-400 break-words">
											Vence: <strong className="text-slate-700">{new Date(clinic.subscriptionEndDate).toLocaleDateString()}</strong>
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Stats — cada bloque con padding y texto que se envuelve */}
						<div className="mt-6 grid grid-cols-1 gap-3">
							<div className="rounded-lg bg-slate-50 p-3 overflow-hidden">
								<div className="text-[11px] text-slate-500">Especialistas</div>
								<div className="mt-1 text-sm font-semibold text-slate-900">{clinic.specialistCount ?? 0}</div>
								<div className="text-xs text-slate-400 mt-2 break-words">Número de especialistas activos en la organización</div>
							</div>

							<div className="rounded-lg bg-slate-50 p-3 overflow-hidden">
								<div className="text-[11px] text-slate-500">Invitaciones</div>
								<div className="mt-1 text-sm font-semibold text-slate-900">{clinic.invitesAvailable ?? 0}</div>
								<div className="text-xs text-slate-400 mt-2 break-words">Invitaciones sin usar disponibles para asignar</div>
							</div>

							<div className="rounded-lg bg-slate-50 p-3 overflow-hidden">
								<div className="text-[11px] text-slate-500">Almacenamiento / especialista</div>
								<div className="mt-1 text-sm font-semibold text-slate-900">{clinic.storagePerSpecialistMB ?? 500} MB</div>
								<div className="text-xs text-slate-400 mt-2 break-words">Espacio reservado por cada especialista</div>
							</div>
						</div>

						{/* Actions: botones con espacio, no overflow */}
						<div className="mt-5 grid grid-cols-1 gap-3">
							<Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-sky-700 to-teal-600 text-white px-4 py-3 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-100" aria-label="Guardar cambios">
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
							</Button>

							<Button variant="ghost" className="w-full border rounded-lg px-4 py-3 text-slate-700 hover:bg-slate-50">
								Editar perfil
							</Button>
						</div>
					</Card>

					{/* Soporte & Facturación */}
					<Card className="w-full rounded-3xl shadow-lg border border-slate-100 p-5 bg-white overflow-hidden">
						<div className="flex items-start gap-4">
							<div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex-shrink-0">
								<Mail className="w-5 h-5" />
							</div>

							<div className="min-w-0">
								<div className="text-sm font-semibold text-slate-900">Soporte & Facturación</div>
								<p className="mt-2 text-xs text-slate-500 leading-relaxed break-words">Para cambios avanzados en facturación, planes empresariales o facturación a nombre de la organización.</p>
							</div>
						</div>

						<div className="mt-5 grid grid-cols-1 gap-3">
							<Button variant="ghost" className="w-full px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50" onClick={() => window.open('mailto:ashirasoftware@gmail.com')}>
								Contactar soporte
							</Button>
						</div>
					</Card>
				</aside>
			</section>

			{/* Confirm Upgrade Modal */}
			{showConfirmUpgrade && recommendedPlan && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
					<div role="dialog" aria-modal="true" className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-xl font-semibold text-slate-900">Actualizar al plan recomendado</h3>
								<p className="mt-2 text-sm text-slate-600">
									Recomendado para {recommendedPlan.minSpecialists}–{recommendedPlan.maxSpecialists} especialistas: <strong>{recommendedPlan.name}</strong>.
								</p>
								<p className="mt-1 text-sm text-slate-700">
									Precio: <strong>${recommendedPlan.monthlyPrice.toFixed(2)}</strong> / mes (facturación mensual).
								</p>
							</div>

							<button onClick={() => setShowConfirmUpgrade(false)} className="p-2 rounded-md hover:bg-slate-100">
								<X className="w-5 h-5 text-slate-600" />
							</button>
						</div>

						<div className="mt-6 flex gap-3">
							<Button onClick={handleConfirmUpgrade} disabled={upgrading} className="bg-gradient-to-r from-sky-600 to-teal-500 text-white px-4 py-2">
								{upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y continuar al checkout'}
							</Button>
							<Button variant="ghost" onClick={() => setShowConfirmUpgrade(false)} className="px-4 py-2">
								Cancelar
							</Button>
						</div>

						<div className="mt-4 text-xs text-slate-400">El proceso abrirá un checkout seguro. No se realizará ningún cargo hasta completar el pago.</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
