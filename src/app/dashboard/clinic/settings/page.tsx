/** @refactored ASHIRA Clinic Dashboard - Settings Page */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
	Loader2, UserPlus, Database, CalendarDays, Check, X, Users, Mail,
	CreditCard, Settings, TrendingUp, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
	slug?: string;
	name: string;
	minSpecialists: number;
	maxSpecialists: number;
	monthlyPrice: number;
	quarterlyPrice?: number | null;
	annualPrice?: number | null;
	description?: string | null;
}

/* --- Presentational Components --- */

function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }> }) {
	return (
		<div className="flex items-center gap-3">
			{Icon && (
				<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-50" aria-hidden="true">
					<Icon className="w-5 h-5 text-sky-600" />
				</div>
			)}
			<div>
				<h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
				{subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
			</div>
		</div>
	);
}

function KPIBlock({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ComponentType<{ className?: string }> }) {
	return (
		<div className="bg-white rounded-2xl border border-slate-100 border-l-4 border-l-sky-500 shadow-sm p-5 flex flex-col gap-3">
			<div className="flex items-center gap-2">
				{Icon && (
					<div className="p-2 rounded-lg bg-sky-50" aria-hidden="true">
						<Icon className="w-4 h-4 text-sky-600" />
					</div>
				)}
				<span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
			</div>
			<div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
			{hint && <div className="text-xs text-slate-400">{hint}</div>}
		</div>
	);
}

function PlanDetailCard({ plan }: { plan?: Plan | null }) {
	return (
		<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-medium uppercase tracking-wider text-slate-400">Plan actual</p>
					<p className="text-lg font-semibold text-slate-900 mt-1">{plan?.name ?? 'Gratis'}</p>
				</div>
				<div className="text-right">
					<div className="text-teal-600 font-bold">{plan ? (plan.monthlyPrice > 0 ? `$${plan.monthlyPrice.toFixed(2)}/mes` : 'Gratis') : 'Gratis'}</div>
					<div className="text-xs text-slate-400 mt-1">{plan ? `${plan.minSpecialists}–${plan.maxSpecialists} especialistas` : 'Limitado'}</div>
				</div>
			</div>
			<hr className="my-4 border-slate-100" />
			<ul className="text-sm text-slate-600 space-y-3 mt-auto">
				{['Acceso al dashboard', 'Export CSV', 'Soporte por email'].map((feature) => (
					<li key={feature} className="flex items-center gap-2.5">
						<Check className="w-4 h-4 text-teal-500 shrink-0" />
						<span>{feature}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function RecommendedCard({ plan, onUpgrade, disabled }: { plan?: Plan | null; onUpgrade: () => void; disabled?: boolean }) {
	return (
		<div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl border border-sky-100 shadow-sm p-6 h-full flex flex-col justify-between">
			<div>
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-xs font-medium text-sky-700 mb-3">
					<TrendingUp className="w-3 h-3" />
					Recomendado
				</span>
				<p className="text-lg font-semibold text-slate-900">{plan?.name}</p>
				<div className="mt-3 flex items-baseline gap-2">
					<span className="text-3xl font-bold text-teal-600">{plan ? `$${plan.monthlyPrice.toFixed(2)}` : '-'}</span>
					<span className="text-sm text-slate-500">/mes</span>
				</div>
				<p className="text-xs text-slate-400 mt-1">{plan ? `${plan.minSpecialists}–${plan.maxSpecialists} especialistas` : ''}</p>
				{plan?.description && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{plan.description}</p>}
			</div>
			<div className="mt-5">
				<Button
					onClick={onUpgrade}
					disabled={disabled}
					className="w-full bg-gradient-to-r from-sky-600 to-teal-500 text-white shadow-sm hover:shadow-md transition-shadow"
				>
					Actualizar al recomendado
				</Button>
				<p className="mt-2 text-xs text-slate-400 text-center">Checkout seguro</p>
			</div>
		</div>
	);
}

/* --- Custom Tooltip for Charts --- */
function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-white shadow-lg rounded-xl border border-slate-100 px-4 py-3 text-sm">
			<p className="font-medium text-slate-900 mb-1">{label}</p>
			{payload.map((p: any, i: number) => (
				<p key={i} className="text-slate-500">
					{p.name}: <span className="font-medium text-slate-800">{p.value}</span>
				</p>
			))}
		</div>
	);
}

/* --- Main Page --- */

export default function ClinicSettingsPage(): React.ReactElement {
	const supabase = createSupabaseBrowserClient();

	const [loading, setLoading] = useState<boolean>(true);
	const [clinic, setClinic] = useState<ClinicProfile | null>(null);
	const [form, setForm] = useState<Partial<ClinicProfile>>({});
	const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
	const [recommendedPlan, setRecommendedPlan] = useState<Plan | null>(null);
	const [allClinicPlans, setAllClinicPlans] = useState<Plan[]>([]);
	const [extraInvites, setExtraInvites] = useState<number>(0);
	const [upgrading, setUpgrading] = useState<boolean>(false);
	const [showConfirmUpgrade, setShowConfirmUpgrade] = useState<boolean>(false);

	useEffect(() => {
		let unsubscribe: (() => void) | null = null;

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session?.access_token) {
				fetchClinic();
			} else {
				const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
					if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && sess?.access_token) {
						fetchClinic();
						subscription.unsubscribe();
					}
				});
				unsubscribe = () => subscription.unsubscribe();
			}
		});

		return () => { unsubscribe?.(); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/** Busca el plan de clínica que mejor encaje con la cantidad de especialistas */
	const findRecommendedPlan = (specialistCount: number, plans: Plan[]): Plan | null => {
		// Filtrar solo planes de clínica (slug empieza con 'clinic-') y no custom
		const clinicPlans = plans.filter((p) => p.id !== 'custom' && p.monthlyPrice > 0);
		if (clinicPlans.length === 0) return null;

		// Encontrar el plan cuyo rango incluya la cantidad de especialistas
		const exact = clinicPlans.find(
			(p) => specialistCount >= p.minSpecialists && specialistCount <= p.maxSpecialists
		);
		if (exact) return exact;

		// Si no hay match exacto, recomendar el plan con el rango mínimo más cercano
		const sorted = [...clinicPlans].sort((a, b) => a.minSpecialists - b.minSpecialists);
		const next = sorted.find((p) => p.minSpecialists > specialistCount);
		return next ?? sorted[sorted.length - 1];
	};

	const fetchClinic = async () => {
		try {
			setLoading(true);
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			// Fetch clínica y planes de la DB en paralelo
			const [profileRes, plansRes] = await Promise.all([
				fetch('/api/clinic/profile', {
					headers: { Authorization: `Bearer ${session.access_token}` },
				}),
				supabase
					.from('plan')
					.select('id, slug, name, minSpecialists, maxSpecialists, monthlyPrice, quarterlyPrice, annualPrice, description')
					.like('slug', 'clinic-%')
					.order('minSpecialists', { ascending: true }),
			]);

			const data = await profileRes.json();
			if (!profileRes.ok) throw new Error(data.error || 'Error al cargar la clínica.');

			// Normalizar planes de la DB al tipo Plan
			const dbPlans: Plan[] = (plansRes.data ?? []).map((p: any) => ({
				id: p.id,
				slug: p.slug,
				name: p.name,
				minSpecialists: Number(p.minSpecialists),
				maxSpecialists: Number(p.maxSpecialists),
				monthlyPrice: Number(p.monthlyPrice),
				quarterlyPrice: p.quarterlyPrice ? Number(p.quarterlyPrice) : null,
				annualPrice: p.annualPrice ? Number(p.annualPrice) : null,
				description: p.description ?? null,
			}));
			setAllClinicPlans(dbPlans);

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
			setRecommendedPlan(findRecommendedPlan(normalized.specialistCount ?? 0, dbPlans));
		} catch (err: any) {
			console.error('Error al cargar clínica:', err);
			toast.error(err?.message ?? 'No se pudo cargar la información.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!clinic || allClinicPlans.length === 0) return;
		setRecommendedPlan(findRecommendedPlan(clinic.specialistCount ?? 0, allClinicPlans));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clinic?.specialistCount, allClinicPlans]);

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
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			const res = await fetch('/api/clinic/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ ...form, extraInvites }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al guardar los cambios.');

			toast.success('Información actualizada correctamente.');
			setClinic((prev) => ({ ...(prev ?? {}) as ClinicProfile, ...data }));
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
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('No se encontró usuario autenticado.');

			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
				body: JSON.stringify({ planId: recommendedPlan?.id, planSlug: recommendedPlan?.slug, billingPeriod: 'monthly' }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al crear suscripción.');

			if (data?.checkoutUrl) {
				window.location.href = data.checkoutUrl;
				return;
			}
			toast.success('Proceso de actualización iniciado.');
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
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-10 h-10 animate-spin text-sky-500" />
					<p className="text-sm text-slate-400">Cargando configuración…</p>
				</div>
			</div>
		);

	if (!clinic) return (
		<div className="text-center py-16">
			<Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
			<p className="text-slate-500">No se encontró información de la clínica.</p>
		</div>
	);

	return (
		<motion.div
			className="space-y-8"
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			{/* Header */}
			<header className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
				<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
					<div className="flex-1 min-w-0">
						<SectionTitle
							title={clinic.legal_name ?? 'Mi Clínica'}
							subtitle="Panel de administración — configura perfil, suscripción y recursos."
							icon={Settings}
						/>
						<div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
							<KPIBlock label="Especialistas" value={clinic.specialistCount ?? 0} hint="Activos" icon={Users} />
							<KPIBlock label="Invitaciones" value={clinic.invitesAvailable ?? 0} hint="Disponibles" icon={Mail} />
							<KPIBlock label="Almacenamiento" value={`${clinic.storagePerSpecialistMB ?? 500} MB`} hint="Por especialista" icon={Database} />
						</div>
					</div>

					<div className="shrink-0 bg-slate-50 rounded-xl p-4 text-right border border-slate-100">
						<p className="text-xs text-slate-400">Plan actual</p>
						<p className="text-lg font-semibold text-slate-900">{currentPlan?.name ?? 'Gratis'}</p>
						<p className="text-xs text-slate-400 mt-1">
							{clinic.subscriptionEndDate ? `Vence: ${new Date(clinic.subscriptionEndDate).toLocaleDateString()}` : 'Sin suscripción activa'}
						</p>
					</div>
				</div>
			</header>

			{/* Main Grid */}
			<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Primary column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Plan overview */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
						<div className="flex items-center gap-3 p-6 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
							<CreditCard className="w-5 h-5 text-sky-600" />
							<h3 className="text-lg font-semibold text-slate-900">Estado del plan</h3>
						</div>
						<div className="p-6 space-y-5">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<PlanDetailCard plan={currentPlan} />
								<RecommendedCard plan={recommendedPlan} onUpgrade={handleStartUpgrade} disabled={!isFreePlan || upgrading} />
							</div>
						</div>
					</div>

					{/* Storage */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
						<div className="flex items-center gap-3 p-6 border-b border-slate-100">
							<Database className="w-5 h-5 text-sky-600" />
							<div>
								<h4 className="text-base font-semibold text-slate-900">Almacenamiento por especialista</h4>
								<p className="text-xs text-slate-500 mt-0.5">Espacio reservado para documentos clínicos y multimedia</p>
							</div>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label htmlFor="storagePerSpecialistMB" className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
									MB por especialista
								</label>
								<div className="flex items-center gap-3">
									<Input id="storagePerSpecialistMB" name="storagePerSpecialistMB" type="number" min={100} step={50} className="h-11 rounded-xl" placeholder="500" value={String(form.storagePerSpecialistMB ?? 500)} onChange={handleChange} />
									<span className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium text-slate-600">MB</span>
								</div>
								<p className="text-xs text-slate-400 mt-2">Recomendado mínimo: <strong className="text-slate-700">500 MB</strong></p>
							</div>
							<Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-sky-600 to-teal-500 text-white hover:shadow-md transition-shadow rounded-xl">
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
							</Button>
						</div>
					</div>

					{/* Invitations */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
						<div className="flex items-center gap-3 p-6 border-b border-slate-100">
							<UserPlus className="w-5 h-5 text-emerald-600" />
							<div>
								<h4 className="text-base font-semibold text-slate-900">Invitaciones</h4>
								<p className="text-xs text-slate-500 mt-0.5">Adquiere invitaciones para nuevos especialistas</p>
							</div>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label htmlFor="extraInvites" className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
									Invitaciones extra
								</label>
								<div className="flex items-center gap-3">
									<Input id="extraInvites" name="extraInvites" type="number" min={0} step={1} className="h-11 rounded-xl" placeholder="0" value={String(extraInvites)} onChange={(e) => setExtraInvites(Number(e.target.value || 0))} />
									<span className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium text-slate-600">× $10</span>
								</div>
								<div className="mt-3 flex items-center justify-between">
									<span className="text-xs text-slate-500">Disponibles actualmente</span>
									<span className="text-sm font-semibold text-slate-800">{clinic.invitesAvailable ?? 0}</span>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-sky-600 to-teal-500 text-white hover:shadow-md transition-shadow rounded-xl">
									{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
								</Button>
								<Button variant="outline" className="rounded-xl">Ver historial</Button>
							</div>
						</div>
					</div>

					{/* Chart */}
					{clinic.planHistory && clinic.planHistory.length > 0 && (
						<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
							<div className="flex items-center gap-3 p-5 border-b border-slate-100">
								<CalendarDays className="w-5 h-5 text-sky-600" />
								<h4 className="text-base font-semibold text-slate-900">Historial de especialistas</h4>
							</div>
							<div className="p-5 h-56">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={clinic.planHistory}>
										<XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
										<YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
										<Tooltip content={<CustomTooltip />} />
										<Bar dataKey="specialists" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}
				</div>

				{/* Sidebar */}
				<aside className="space-y-5">
					{/* Clinic summary */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
						<div className="flex items-center gap-3 mb-5">
							<div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm" aria-hidden="true">
								{((clinic.legal_name ?? 'MC').split(' ').map(s => s?.[0]).join('').slice(0, 2) || 'MC').toUpperCase()}
							</div>
							<div className="min-w-0">
								<p className="text-xs text-slate-400">Resumen</p>
								<p className="text-sm font-semibold text-slate-900 truncate">{clinic.legal_name ?? 'Mi Clínica'}</p>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{currentPlan?.name ?? 'Gratis'}</span>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							{[
								{ label: 'Especialistas', value: clinic.specialistCount ?? 0, desc: 'Activos' },
								{ label: 'Invitaciones', value: clinic.invitesAvailable ?? 0, desc: 'Disponibles' },
								{ label: 'Almacenamiento', value: `${clinic.storagePerSpecialistMB ?? 500} MB`, desc: 'Por especialista' },
							].map((item) => (
								<div key={item.label} className="rounded-xl bg-slate-50 p-3">
									<p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
									<p className="text-sm font-semibold text-slate-900 mt-0.5">{item.value}</p>
									<p className="text-xs text-slate-400 mt-1">{item.desc}</p>
								</div>
							))}
						</div>

						<div className="mt-5 space-y-2">
							<Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-sky-600 to-teal-500 text-white rounded-xl">
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
							</Button>
							<Button variant="ghost" className="w-full rounded-xl text-slate-600 hover:bg-slate-50">
								Editar perfil
							</Button>
						</div>
					</div>

					{/* Support */}
					<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
						<div className="flex items-center gap-3 mb-3">
							<HelpCircle className="w-5 h-5 text-amber-500" />
							<p className="text-sm font-semibold text-slate-900">Soporte y Facturación</p>
						</div>
						<p className="text-xs text-slate-500 leading-relaxed mb-4">
							Para cambios avanzados en facturación, planes empresariales o facturación corporativa.
						</p>
						<Button
							variant="ghost"
							className="w-full rounded-xl text-slate-600 hover:bg-slate-50"
							onClick={() => window.open('mailto:ashirasoftware@gmail.com')}
						>
							Contactar soporte
						</Button>
					</div>
				</aside>
			</section>

			{/* Confirm Upgrade Modal */}
			{showConfirmUpgrade && recommendedPlan && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
					<motion.div
						role="dialog"
						aria-modal="true"
						className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-100"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.2 }}
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-xl font-semibold text-slate-900">Actualizar plan</h3>
								<p className="mt-2 text-sm text-slate-600">
									Plan <strong>{recommendedPlan.name}</strong> para {recommendedPlan.minSpecialists}–{recommendedPlan.maxSpecialists} especialistas.
								</p>
								<p className="mt-1 text-sm text-slate-700">
									Precio: <strong>${recommendedPlan.monthlyPrice.toFixed(2)}</strong> / mes
								</p>
							</div>
							<button
								onClick={() => setShowConfirmUpgrade(false)}
								className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
								aria-label="Cerrar"
							>
								<X className="w-5 h-5 text-slate-500" />
							</button>
						</div>

						<div className="mt-6 flex gap-3">
							<Button onClick={handleConfirmUpgrade} disabled={upgrading} className="bg-gradient-to-r from-sky-600 to-teal-500 text-white rounded-xl">
								{upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y continuar'}
							</Button>
							<Button variant="ghost" onClick={() => setShowConfirmUpgrade(false)} className="rounded-xl">
								Cancelar
							</Button>
						</div>
						<p className="mt-3 text-xs text-slate-400">No se realizará ningún cargo hasta completar el pago.</p>
					</motion.div>
				</div>
			)}
		</motion.div>
	);
}
