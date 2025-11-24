// components/RegisterForm.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type OrgType = 'CLINICA' | 'HOSPITAL' | 'CONSULTORIO' | 'FARMACIA' | 'LABORATORIO';
type Role = 'ADMIN' | 'MEDICO' | 'FARMACIA' | 'PACIENTE' | 'LABORATORIO';
type PatientPlan = 'individual' | 'family';
type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

type OrgItem = { id: string; name: string; inviteBaseUrl?: string | null; contactEmail?: string | null };

export default function RegisterForm(): React.ReactElement {
	const router = useRouter();

	// Paso actual (1..4)
	const [step, setStep] = useState<number>(1);

	// Cuenta
	const [role, setRole] = useState<Role>('MEDICO');
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	// Organización (para creación)
	const [orgName, setOrgName] = useState('');
	const [orgType, setOrgType] = useState<OrgType>('CONSULTORIO');
	const [specialistCount, setSpecialistCount] = useState<number>(1);
	const [displaySpecialistCount, setDisplaySpecialistCount] = useState<string>(String(specialistCount));
	const [orgPhone, setOrgPhone] = useState('');
	const [orgAddress, setOrgAddress] = useState('');

	// Paciente
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [identifier, setIdentifier] = useState('');
	const [dob, setDob] = useState('');
	const [gender, setGender] = useState<'M' | 'F' | 'O' | ''>('');
	const [phone, setPhone] = useState('');
	const [address, setAddress] = useState('');
	const [emergencyContactName, setEmergencyContactName] = useState('');
	const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
	const [allergies, setAllergies] = useState('');
	const [chronicConditions, setChronicConditions] = useState('');
	const [currentMedications, setCurrentMedications] = useState('');
	const [insuranceProvider, setInsuranceProvider] = useState('');
	const [insuranceNumber, setInsuranceNumber] = useState('');

	// NUEVO: organizations list + selection
	const [organizations, setOrganizations] = useState<OrgItem[]>([]);
	const [orgsLoading, setOrgsLoading] = useState(false);
	const [orgsError, setOrgsError] = useState<string | null>(null);
	// organizationId selected by patient (nullable - patient may choose "Ninguna")
	const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

	// Plan / Billing (nuevo)
	const [patientPlan, setPatientPlan] = useState<PatientPlan>('individual'); // para pacientes: individual o family
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual'); // default to annual (patients use annual)

	// UI
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Si cambia el role a MEDICO, forzamos specialistCount = 1 y lo reflejamos en displaySpecialistCount
	useEffect(() => {
		if (role === 'MEDICO') {
			setSpecialistCount(1);
			setDisplaySpecialistCount('1');
			// NUEVO: si es MEDICO forzamos el tipo de organización a CONSULTORIO
			setOrgType('CONSULTORIO');
		}
		// si cambia a otro role, no forzamos nada (el usuario puede editar el número)
		// además, al cambiar role reiniciamos plan/billing a valores por defecto razonables
		if (role !== 'PACIENTE') {
			setPatientPlan('individual');
			// para organizaciones dejamos monthly por defecto (si así lo quieres)
			setBillingPeriod('monthly');
		}
		if (role === 'PACIENTE') {
			// para pacientes trabajamos con pago anual por defecto
			setBillingPeriod('annual');
		}
	}, [role]);

	// Mantener displaySpecialistCount sincronizado si specialistCount cambia por otra vía
	useEffect(() => {
		setDisplaySpecialistCount(String(specialistCount));
	}, [specialistCount]);

	// -------------------------
	// Planes desde la base de datos
	// -------------------------
	const [plans, setPlans] = useState<Array<{
		id: string;
		slug: string;
		name: string;
		minSpecialists: number;
		maxSpecialists: number;
		monthlyPrice: number;
		quarterlyPrice: number | null;
		annualPrice: number | null;
		description: string | null;
	}>>([]);
	const [plansLoading, setPlansLoading] = useState(true);

	// Cargar planes desde la API
	useEffect(() => {
		const loadPlans = async () => {
			try {
				setPlansLoading(true);
				const params = new URLSearchParams();
				if (role) params.append('role', role);
				if (role !== 'PACIENTE' && role !== 'MEDICO' && specialistCount) {
					params.append('specialistCount', String(specialistCount));
				}

				const res = await fetch(`/api/plans?${params.toString()}`);
				if (!res.ok) throw new Error('Error al cargar planes');

				const data = await res.json();
				if (data.success && data.plans) {
					setPlans(data.plans);
				}
			} catch (err) {
				console.error('Error cargando planes:', err);
			} finally {
				setPlansLoading(false);
			}
		};

		loadPlans();
	}, [role, specialistCount]);

	// Plan recomendado basado en planes de la BD
	const recommendedPlan = useMemo(() => {
		if (plansLoading || plans.length === 0) {
			// Valores por defecto mientras cargan
			if (role === 'MEDICO') return { slug: 'medico', label: 'Plan Médico — Usuario individual', price: 14.99 };
			if (role === 'PACIENTE') {
				return patientPlan === 'individual'
					? { slug: 'paciente-individual', label: 'Paciente — Individual', price: 12.99 }
					: { slug: 'paciente-family', label: 'Paciente — Plan Familiar', price: 29.99 };
			}
			return { slug: 'small', label: 'Plan Básico', price: 29.99 };
		}

		if (role === 'MEDICO') {
			// Buscar plan específico para médico con slug 'medico'
			const medicoPlan = plans.find((p) => p.slug === 'medico');
			if (medicoPlan) {
				return {
					slug: medicoPlan.slug,
					label: medicoPlan.name,
					price: medicoPlan.monthlyPrice,
				};
			}
		}

		if (role === 'PACIENTE') {
			// Pacientes tienen la plataforma gratuita, no hay plan de pago
			return { slug: 'paciente-gratis', label: 'Plan Gratuito', price: 0 };
		}

		// Para organizaciones (no médicos ni pacientes), buscar plan según número de especialistas
		if (role === 'ADMIN' || role === 'FARMACIA' || role === 'LABORATORIO') {
			const orgPlan = plans.find(
				(p) =>
					(p.minSpecialists === 0 || p.minSpecialists <= specialistCount) &&
					(p.maxSpecialists === 0 || p.maxSpecialists >= specialistCount)
			);
			if (orgPlan) {
				return {
					slug: orgPlan.slug,
					label: orgPlan.name,
					price: orgPlan.monthlyPrice,
				};
			}
		}

		// Fallback: primer plan disponible o valores por defecto
		if (plans.length > 0) {
			const firstPlan = plans[0];
			return {
				slug: firstPlan.slug,
				label: firstPlan.name,
				price: firstPlan.monthlyPrice,
			};
		}

		return { slug: 'default', label: 'Plan por defecto', price: 0 };
	}, [plans, plansLoading, role, patientPlan, specialistCount]);

	/**
	 * computeBilling:
	 * - Si isPatient === true: interpretamos `price` como ANNUAL_PRICE.
	 *   -> annual total = price
	 *   -> monthlyEquivalent = price / 12
	 *   -> label indica pago anual.
	 *
	 * - Si isPatient === false: interpretamos `price` como monthly base (como antes).
	 */
	function computeBilling(price: number, period: BillingPeriod, isPatient = false) {
		if (isPatient) {
			// price = annual price
			if (period === 'annual') {
				const months = 12;
				const total = price;
				const monthlyEquivalent = total / months;
				return {
					months,
					discount: 0,
					total,
					monthlyEquivalent,
					label: 'Anual (pago único)',
				};
			}
			// If user selects monthly/quarterly anyway, we show derived values (rare for patient UI)
			if (period === 'quarterly') {
				// treat annual price -> compute monthlyEquivalent, then subtotal for 3 months
				const monthlyEq = price / 12;
				const months = 3;
				const subtotal = monthlyEq * months;
				const discount = 0.05;
				const total = subtotal * (1 - discount);
				return { months, discount, total, monthlyEquivalent: monthlyEq, label: 'Trimestral (5% sobre equivalente mensual)' };
			}
			// monthly case derived from annual
			const months = 1;
			const monthlyEquivalent = price / 12;
			return { months, discount: 0, total: monthlyEquivalent, monthlyEquivalent, label: 'Mensual (equivalente del plan anual)' };
		}

		// Non-patient (orgs / médicos): original behavior (price = monthly base)
		if (period === 'monthly') {
			return {
				months: 1,
				discount: 0,
				total: price,
				monthlyEquivalent: price,
				label: 'Mensual (sin descuento)',
			};
		}
		if (period === 'quarterly') {
			const months = 3;
			const subtotal = price * months;
			const discount = 0.05;
			const total = subtotal * (1 - discount);
			return {
				months,
				discount,
				total,
				monthlyEquivalent: total / months,
				label: 'Trimestral (5% descuento)',
			};
		}
		// annual
		const months = 12;
		const subtotal = price * months;
		const discount = 0.15;
		const total = subtotal * (1 - discount);
		return {
			months,
			discount,
			total,
			monthlyEquivalent: total / months,
			label: 'Anual (15% descuento)',
		};
	}

	// Validaciones de pasos
	const step1Valid = fullName.trim().length > 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6;
	// para orgs normales requerimos orgName y specialistCount >=1; para MEDICO requerimos orgName (puede ser su consultorio) pero no specialistCount
	const step2OrgValid = orgName.trim().length > 2 && (role === 'MEDICO' ? true : specialistCount >= 1);
	const step2PatientValid = firstName.trim().length > 1 && lastName.trim().length > 1 && identifier.trim().length > 3;
	const finalValid = role === 'PACIENTE' ? step1Valid && step2PatientValid : step1Valid && step2OrgValid;

	// Navegación entre pasos
	function next() {
		setErrorMsg(null);
		if (step === 1 && !step1Valid) {
			setErrorMsg('Completa los datos básicos (nombre, email y contraseña ≥ 6 caracteres).');
			return;
		}
		if (step === 2) {
			if (role === 'PACIENTE' && !step2PatientValid) {
				setErrorMsg('Completa los datos del paciente (nombre, apellido e identificación).');
				return;
			}
			if (role !== 'PACIENTE' && !step2OrgValid) {
				setErrorMsg('Completa los datos de la organización (nombre y número de especialistas si aplica).');
				return;
			}
		}
		setStep((s) => Math.min(s + 1, 4));
	}

	function back() {
		setErrorMsg(null);
		setStep((s) => Math.max(s - 1, 1));
	}

	// Fetch organizations on mount so patient can choose referring clinic
	useEffect(() => {
		let mounted = true;
		async function loadOrgs() {
			setOrgsLoading(true);
			setOrgsError(null);
			try {
				// Ajusta la ruta si tu backend expone otro endpoint
				const res = await fetch('/api/organizations');
				if (!res.ok) {
					const txt = await res.text().catch(() => '');
					throw new Error(`HTTP ${res.status} ${txt}`);
				}
				const data = (await res.json()) as OrgItem[];
				if (!mounted) return;
				// Esperamos que el backend devuelva [{ id, name, ... }, ...]
				setOrganizations(Array.isArray(data) ? data : []);
			} catch (err: any) {
				console.error('load organizations error', err);
				if (!mounted) return;
				setOrgsError('No se pudieron cargar las clínicas. Intenta más tarde.');
				setOrganizations([]);
			} finally {
				if (!mounted) return;
				setOrgsLoading(false);
			}
		}
		loadOrgs();
		return () => {
			mounted = false;
		};
	}, []);

	// Submit final
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrorMsg(null);
		if (!finalValid) {
			setErrorMsg('Revisa las secciones: faltan datos obligatorios.');
			return;
		}
		setLoading(true);
		try {
			const payload: any = {
				account: { fullName, email, password, role },
			};

			// Solo incluir información de plan/pago si NO es paciente (pacientes son gratuitos)
			if (role !== 'PACIENTE') {
				// Calculamos el precio final que enviaremos al backend
				const priceBase = recommendedPlan.price; // monthly price for orgs/medicos
				const billing = computeBilling(priceBase, billingPeriod, false);

				payload.plan = {
					selectedPlan: recommendedPlan.slug,
					billingPeriod,
					billingMonths: billing.months,
					billingDiscount: billing.discount,
					billingTotal: Number(billing.total.toFixed(2)),
				};
			}

			if (role === 'PACIENTE') {
				payload.patient = {
					firstName,
					lastName,
					identifier,
					dob,
					gender,
					phone,
					address,
					emergencyContactName,
					emergencyContactPhone,
					allergies,
					chronicConditions,
					currentMedications,
					insuranceProvider,
					insuranceNumber,
					// si el paciente eligió una clínica, la asociamos
					organizationId: selectedOrganizationId ?? undefined,
				};
			} else {
				payload.organization = {
					orgName,
					orgType,
					specialistCount,
					orgPhone,
					orgAddress,
				};
			}

			const resp = await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await resp.json();
			setLoading(false);
			if (!resp.ok) {
				setErrorMsg(data?.message || 'Error en el registro. Intenta de nuevo.');
				return;
			}

			setSuccessMsg('Registro correcto. Serás redirigido...');
			// Redirect (backend can return data.nextUrl for checkout)
			router.push(data.nextUrl || '/login');
		} catch (err: any) {
			setLoading(false);
			setErrorMsg(err?.message || 'Error inesperado');
		}
	}

	// Step indicator component mejorado
	const StepIndicator = ({ current }: { current: number }) => {
		const steps = role === 'PACIENTE' ? ['Cuenta', 'Paciente', 'Historia', 'Revisar'] : ['Cuenta', 'Organización', 'Plan', 'Revisar'];
		return (
			<div className="relative mb-6 sm:mb-8 lg:mb-10">
				{/* Línea de progreso */}
				<div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10">
					<div
						className="h-full bg-gradient-to-r from-teal-600 to-cyan-600 transition-all duration-500 ease-out"
						style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
					/>
				</div>
				<div className="flex justify-between items-center relative">
					{steps.map((label, i) => {
						const idx = i + 1;
						const active = idx === current;
						const done = idx < current;
						return (
							<div key={label} className="flex flex-col items-center flex-1">
								<div
									aria-current={active ? 'step' : undefined}
									className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
										done
											? 'bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg scale-110'
											: active
											? 'bg-white border-2 sm:border-3 border-teal-600 text-teal-700 shadow-xl scale-110 ring-2 sm:ring-4 ring-teal-100'
											: 'bg-white border-2 border-slate-300 text-slate-400 shadow-sm'
									}`}
								>
									{done ? (
										<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
										</svg>
									) : (
										idx
									)}
								</div>
								<span
									className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold text-center max-w-[60px] sm:max-w-[80px] ${
										active ? 'text-teal-700' : done ? 'text-teal-600' : 'text-slate-400'
									}`}
								>
									{label}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	// Updated input class (elegante y profesional)
	const inputClass = 'mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 hover:shadow-md';
	const labelClass = 'block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5';
	const textareaClass = 'mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 hover:shadow-md resize-none';
	const selectClass = 'mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl bg-white text-sm sm:text-base text-slate-900 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 hover:shadow-md appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")] bg-[length:1.2em_1.2em] sm:bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] sm:bg-[right_0.75rem_center] bg-no-repeat pr-8 sm:pr-10';

	// Password strength calculation (returns score 0..4 and which criteria pass)
	function evaluatePassword(pw: string) {
		const lengthScore = pw.length >= 8;
		const lower = /[a-z]/.test(pw);
		const upper = /[A-Z]/.test(pw);
		const number = /[0-9]/.test(pw);
		const special = /[^A-Za-z0-9]/.test(pw);

		const passed = [lengthScore, lower, upper, number, special].filter(Boolean).length;
		// Map passed count to 0..4 scale (we consider 0..5 -> clamp to 0..4 visually)
		const score = Math.max(0, Math.min(4, passed === 0 ? 0 : passed - 1));
		return {
			score,
			passed,
			lengthScore,
			lower,
			upper,
			number,
			special,
		};
	}

	const pwEval = useMemo(() => evaluatePassword(password), [password]);

	// Map score to label + bar color
	const pwLabel = useMemo(() => {
		switch (pwEval.score) {
			case 0:
				return 'Muy débil';
			case 1:
				return 'Débil';
			case 2:
				return 'Media';
			case 3:
				return 'Buena';
			case 4:
				return 'Excelente';
			default:
				return '';
		}
	}, [pwEval]);

	// Map score to tailwind color classes for bar segments
	const pwColorClass = useMemo(() => {
		switch (pwEval.score) {
			case 0:
				return 'bg-rose-400';
			case 1:
				return 'bg-amber-400';
			case 2:
				return 'bg-sky-400';
			case 3:
				return 'bg-emerald-400';
			case 4:
				return 'bg-emerald-600';
			default:
				return 'bg-slate-200';
		}
	}, [pwEval]);

	// Compute billing preview for the recommendedPlan price
	// Compute billing preview for the recommendedPlan price (solo para no-pacientes)
	const billingPreview = useMemo(() => {
		if (role === 'PACIENTE') {
			// Pacientes no tienen pago, retornar valores vacíos
			return { months: 0, discount: 0, total: 0, monthlyEquivalent: 0, label: 'Gratuito' };
		}
		return computeBilling(recommendedPlan.price, billingPeriod, false);
	}, [recommendedPlan, billingPeriod, role]);

	return (
		<form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full" aria-labelledby="register-heading">
			{/* Header del formulario */}
			<div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
				<h2 id="register-heading" className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
					Crear Cuenta
				</h2>
				<p className="text-teal-50 text-xs sm:text-sm mt-1">Completa los pasos para comenzar. Tus datos están protegidos con encriptación de nivel empresarial.</p>
			</div>

			{/* Contenido del formulario */}
			<div className="p-4 sm:p-6 md:p-8 lg:p-10">

			<StepIndicator current={step} />

			{/* Paso 1: Cuenta */}
			{step === 1 && (
				<section aria-label="Cuenta" className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
					<div className="mb-4 sm:mb-6">
						<h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
							<span className="w-1 h-5 sm:h-6 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
							Información de Cuenta
						</h3>
						<p className="text-xs sm:text-sm text-slate-600 ml-3">Crea tus credenciales de acceso seguras</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Nombre completo
								</span>
							</span>
							<input aria-label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Ej: María Pérez" required />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									Email
								</span>
							</span>
							<input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="tu@ejemplo.com" required />
						</label>

						{/* Contraseña mejorada: ojo + barra de fortaleza + checklist */}
						<div className="md:col-span-2">
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
										</svg>
										Contraseña
									</span>
								</span>
								<div className="relative">
									<input aria-label="Contraseña" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-12`} placeholder="Mínimo 8 caracteres, incluye mayúsculas y números" required minLength={6} />
									<button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50">
										{showPassword ? (
											<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 hover:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.02.153-2.006.44-2.941M3 3l18 18M9.88 9.88a3 3 0 004.24 4.24" />
											</svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 hover:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										)}
									</button>
								</div>

								{/* Strength bar */}
								<div className="mt-3">
									<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
										<div
											className={`${pwColorClass} h-2 rounded-full transition-all duration-300`}
											style={{
												width: `${(pwEval.score / 4) * 100}%`,
												minWidth: pwEval.score === 0 ? '6px' : undefined,
											}}
											aria-hidden
										/>
									</div>
									<div className="mt-2 flex items-center justify-between">
										<div className="text-xs font-medium text-slate-600">{pwLabel}</div>
										<div className="text-xs text-slate-400">{password.length} caracteres</div>
									</div>
								</div>

								{/* Checklist of criteria */}
								<ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
									<li className="flex items-center gap-2">
										<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${pwEval.lengthScore ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{pwEval.lengthScore ? '✓' : '•'}</span>
										<span>8+ caracteres</span>
									</li>
									<li className="flex items-center gap-2">
										<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${pwEval.upper ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{pwEval.upper ? '✓' : '•'}</span>
										<span>Mayúscula</span>
									</li>
									<li className="flex items-center gap-2">
										<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${pwEval.lower ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{pwEval.lower ? '✓' : '•'}</span>
										<span>Minúscula</span>
									</li>
									<li className="flex items-center gap-2">
										<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${pwEval.number ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{pwEval.number ? '✓' : '•'}</span>
										<span>Número</span>
									</li>
									<li className="flex items-center gap-2 col-span-2">
										<span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${pwEval.special ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{pwEval.special ? '✓' : '•'}</span>
										<span>Caracter especial (p. ej. !@#)</span>
									</li>
								</ul>
							</label>
						</div>

						{/* Select mejorado para "¿Eres?" */}
						<div className="md:col-span-2">
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
										Tipo de Cuenta
									</span>
								</span>
								<select
									value={role}
									onChange={(e) => {
										const newRole = e.target.value as Role;
										// Solo permitir MEDICO y PACIENTE
										if (newRole !== 'MEDICO' && newRole !== 'PACIENTE') {
											return;
										}
										setRole(newRole);
										// Si el rol deja de ser PACIENTE, limpiamos el campo de clínica referida
										if (newRole !== 'PACIENTE') {
											setSelectedOrganizationId(null);
										}
									}}
									className={selectClass}
									aria-label="Tipo de cuenta"
									onBlur={() => setStep(1)}>
									<option value="MEDICO">Médico/Especialista Independiente (Consultorio Privado)</option>
									<option value="PACIENTE">Paciente</option>
									<option value="ADMIN" disabled>Administrador / Clínica (Próximamente)</option>
									<option value="FARMACIA" disabled>Farmacia (Próximamente)</option>
									<option value="LABORATORIO" disabled>Laboratorio (Próximamente)</option>
								</select>
							</label>
							{/* Mensaje informativo sobre opciones próximamente */}
							<div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
								<div className="flex items-start gap-3">
									<svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<p className="text-xs text-blue-800 leading-relaxed">
										<strong>Nota:</strong> Actualmente solo está disponible el registro para <strong>Consultorios Privados</strong> y <strong>Pacientes</strong>. 
										El registro para Clínicas, Farmacias y Laboratorios estará disponible próximamente.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* --- NUEVO: Selección de clínica que lo recomendó (solo para PACIENTE) --- */}
					{role === 'PACIENTE' && (
						<div className="mt-2">
							<label className="block text-sm font-medium text-slate-700">¿Qué clínica te recomendó? (opcional)</label>
							{orgsLoading ? (
								<div className="mt-2 text-sm text-slate-500">Cargando clínicas...</div>
							) : orgsError ? (
								<div className="mt-2 text-sm text-rose-600">{orgsError}</div>
							) : (
								<select value={selectedOrganizationId ?? ''} onChange={(e) => setSelectedOrganizationId(e.target.value === '' ? null : e.target.value)} className={inputClass} aria-label="Clínica que te recomendó (opcional)">
									<option value="">No fui referido / Ninguna</option>
									{/* mostrarlas con nombre */}
									{Array.isArray(organizations) &&
										organizations.map((o) => (
											<option key={o.id} value={o.id}>
												{o.name}
											</option>
										))}
								</select>
							)}
						</div>
					)}

					<div className="flex justify-end gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
						<button
							type="button"
							onClick={next}
							disabled={!step1Valid}
							className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 ${
								step1Valid
									? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
									: 'bg-slate-200 text-slate-500 cursor-not-allowed'
							}`}
						>
							Continuar
							<svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				</section>
			)}

			{/* Paso 2: Organización (no preguntar número si role === 'MEDICO') */}
			{step === 2 && role !== 'PACIENTE' && (
				<section aria-label="Organización" className="space-y-6 animate-in fade-in duration-300">
					<div className="mb-6">
						<h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
							<span className="w-1 h-6 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
							Información de Organización
						</h3>
						<p className="text-sm text-slate-600 ml-3">Datos de tu consultorio u organización médica</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
									</svg>
									Nombre de la organización / consultorio
								</span>
							</span>
							<input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} placeholder="Ej: Clínica Santa Rosa (o tu consultorio)" required />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									Tipo de organización
								</span>
							</span>
							{/* Si role === 'MEDICO' este select queda deshabilitado y orgType ya estará forzado a 'CONSULTORIO' */}
							<select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)} className={selectClass} disabled={role === 'MEDICO'}>
								<option value="CONSULTORIO">Consultorio Privado</option>
								<option value="HOSPITAL">Hospital</option>
								<option value="CLINICA" disabled>Clínica (Próximamente)</option>
								<option value="FARMACIA" disabled>Farmacia (Próximamente)</option>
								<option value="LABORATORIO" disabled>Laboratorio (Próximamente)</option>
							</select>
						</label>

						{/* Si es MEDICO no pedimos número de especialistas (es 1 por defecto); para otros roles sí */}
						{role === 'MEDICO' ? (
							<div className="md:col-span-1">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
										Especialistas
									</span>
								</span>
								<div className="mt-2 px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium">Usuario individual — 1 especialista</div>
							</div>
						) : (
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
										Número de especialistas (aprox.)
									</span>
								</span>
								<input
									type="number"
									min={1}
									value={displaySpecialistCount}
									onChange={(e) => {
										const v = e.target.value;
										setDisplaySpecialistCount(v);
										if (v !== '') {
											const n = Number(v);
											if (!Number.isNaN(n)) setSpecialistCount(Math.max(1, Math.floor(n)));
										}
									}}
									onBlur={() => {
										if (displaySpecialistCount === '' || Number(displaySpecialistCount) < 1 || Number.isNaN(Number(displaySpecialistCount))) {
											setSpecialistCount(1);
											setDisplaySpecialistCount('1');
										} else {
											const n = Math.max(1, Math.floor(Number(displaySpecialistCount)));
											setSpecialistCount(n);
											setDisplaySpecialistCount(String(n));
										}
									}}
									className={inputClass}
								/>
							</label>
						)}

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
									</svg>
									Teléfono de contacto
								</span>
							</span>
							<input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} className={inputClass} placeholder="+58 412 0000000" />
						</label>

						<label className="md:col-span-2 block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Dirección
								</span>
							</span>
							<input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} className={inputClass} placeholder="Calle, ciudad, estado" />
						</label>
					</div>

					<div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-slate-800">
						Plan recomendado: <strong>{recommendedPlan.label}</strong> — <strong>${recommendedPlan.price.toFixed(2)}</strong> / mes
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-4 sm:px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm">
							Atrás
						</button>
						<button type="button" onClick={next} disabled={!step2OrgValid} className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm ${step2OrgValid ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 2: Paciente (datos personales) */}
			{step === 2 && role === 'PACIENTE' && (
				<section aria-label="Datos paciente" className="space-y-6 animate-in fade-in duration-300">
					<div className="mb-6">
						<h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
							<span className="w-1 h-6 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
							Información Personal
						</h3>
						<p className="text-sm text-slate-600 ml-3">Datos básicos para tu perfil de paciente</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Nombres
								</span>
							</span>
							<input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
						</label>
						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Apellidos
								</span>
							</span>
							<input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} required />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
									</svg>
									Cédula / Identificación
								</span>
							</span>
							<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} required />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									Fecha de nacimiento
								</span>
							</span>
							<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
									Género
								</span>
							</span>
							<select value={gender} onChange={(e) => setGender(e.target.value as any)} className={selectClass}>
								<option value="">Preferir no decir</option>
								<option value="M">Masculino</option>
								<option value="F">Femenino</option>
								<option value="O">Otro</option>
							</select>
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
									</svg>
									Teléfono
								</span>
							</span>
							<input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
						</label>

						<label className="md:col-span-2 block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Dirección
								</span>
							</span>
							<input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
						</label>
					</div>

					<div className="mt-6 pt-6 border-t border-slate-200">
						<p className={labelClass}>
							<span className="inline-flex items-center gap-2">
								<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								Contacto de emergencia
							</span>
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										Nombre
									</span>
								</span>
								<input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={inputClass} />
							</label>
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
									</svg>
									Teléfono
								</span>
							</span>
							<input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={inputClass} />
							</label>
						</div>
					</div>

					{/* Pacientes tienen acceso gratuito - no se muestra selección de plan */}
					<div className="mt-4 p-4 border rounded-lg bg-green-50 border-green-200">
						<div className="flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p className="text-sm font-semibold text-green-900">Acceso Gratuito</p>
								<p className="text-xs text-green-700 mt-1">Los pacientes tienen acceso gratuito a la plataforma. No se requiere pago.</p>
							</div>
						</div>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-4 sm:px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm">
							Atrás
						</button>
						<button type="button" onClick={next} disabled={!step2PatientValid} className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm ${step2PatientValid ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 3: Historia clínica para pacientes */}
			{step === 3 && role === 'PACIENTE' && (
				<section aria-label="Historia clínica" className="space-y-6 animate-in fade-in duration-300">
					<div className="mb-6">
						<h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
							<span className="w-1 h-6 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
							Historia Clínica
						</h3>
						<p className="text-sm text-slate-600 ml-3">Información médica relevante (opcional pero recomendado)</p>
					</div>
					<div className="grid grid-cols-1 gap-6">
						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									Alergias conocidas
								</span>
							</span>
							<textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} className={textareaClass} rows={3} placeholder="P. ej.: Penicilina — reacción: urticaria" />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									Enfermedades crónicas / antecedentes
								</span>
							</span>
							<textarea value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} className={textareaClass} rows={3} placeholder="Hipertensión, diabetes, etc." />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
									</svg>
									Medicación actual
								</span>
							</span>
							<textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} className={textareaClass} rows={2} placeholder="Medicamento — dosis — frecuencia" />
						</label>

						<label className="block group">
							<span className={labelClass}>
								<span className="inline-flex items-center gap-2">
									<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
									</svg>
									Aseguradora / Plan (opcional)
								</span>
							</span>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
								<input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className={inputClass} placeholder="Proveedor" />
								<input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} className={inputClass} placeholder="Número de póliza / afiliado" />
							</div>
						</label>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-4 sm:px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm">
							Atrás
						</button>
						<button type="button" onClick={() => setStep(4)} className="px-4 sm:px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm">
							Siguiente
						</button>
					</div>
				</section>
			)}

			{step === 3 && role !== 'PACIENTE' && (
				<section aria-label="Plan" className="space-y-4">
					<h3 className="text-base sm:text-lg font-semibold text-slate-700">Plan recomendado</h3>

					{role === 'MEDICO' ? (
						<div className="p-3 sm:p-4 rounded-lg border border-emerald-600 bg-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
							<div>
								<div className="text-xs sm:text-sm font-semibold text-slate-900">Plan Médico — Usuario individual</div>
								<div className="text-[10px] sm:text-xs text-slate-500">1 usuario — ideal para médicos independientes</div>
							</div>
							<div className="text-left sm:text-right">
								<div className="text-xl sm:text-2xl font-extrabold text-emerald-600">${recommendedPlan.price.toFixed(2)}</div>
								<div className="text-[10px] sm:text-xs text-slate-400">/ mes</div>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-slate-700">
							{[
								{ slug: '10-20', label: '10–20 especialistas', price: 69.99, range: '10–20' },
								{ slug: '21-50', label: '21–50 especialistas', price: 99.99, range: '21–50' },
								{ slug: '51-100', label: '51–100 especialistas', price: 149.99, range: '51–100' },
							].map((p) => {
								const recommended = p.slug === recommendedPlan.slug;
								return (
									<div key={p.slug} aria-labelledby={`plan-${p.slug}`} tabIndex={0} className={`relative pt-5 sm:pt-6 pb-3 sm:pb-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl border bg-white transition-transform transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 ${recommended ? 'border-emerald-600 shadow-lg ring-emerald-100' : 'border-slate-200 shadow-sm'} min-h-28 sm:min-h-32 flex flex-col justify-between`}>
										{recommended && <span className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 rounded-full shadow">Recomendado</span>}

										<div className="flex items-start justify-between gap-2 sm:gap-3">
											<div className="min-w-0">
												<div id={`plan-${p.slug}`} className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
													{p.label}
												</div>
											</div>
										</div>

										<hr className="my-2 sm:my-3 border-t border-slate-100" />

										<div className="flex items-center justify-between gap-2 sm:gap-3">
											<ul className="flex-1 space-y-0.5 sm:space-y-1 text-[10px] sm:text-[12px] text-slate-600">
												<li className="truncate">• Soporte básico</li>
												<li className="truncate">• Reportes semanales</li>
											</ul>
										</div>

										{recommended && (
											<div className="mt-2 sm:mt-3 text-[10px] sm:text-[12px] text-slate-600">
												Recomendado según <span className="font-semibold text-slate-800">{specialistCount}</span> especialistas.
											</div>
										)}
										<div className="text-right flex flex-col items-end">
											<div className="text-base sm:text-lg md:text-2xl font-extrabold leading-none text-emerald-600">${p.price.toFixed(2)}</div>
											<div className="text-[10px] sm:text-[11px] text-slate-400">/ mes</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					<div className="mt-4">
						<div className="text-xs sm:text-sm font-medium mb-2">Periodicidad</div>
						<select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)} className={inputClass}>
							<option value="monthly">Mensual</option>
							<option value="quarterly">Trimestral — 5% descuento</option>
							<option value="annual">Anual — 15% descuento</option>
						</select>

						<div className="mt-3 p-3 sm:p-4 bg-slate-50 rounded-md border border-slate-100 text-slate-700">
							<div className="text-xs sm:text-sm">Resumen de cobro:</div>
							<div className="mt-1 text-xs sm:text-sm">
								<strong>{recommendedPlan.label}</strong> — Precio base mensual: ${recommendedPlan.price.toFixed(2)}
							</div>
							<div className="text-xs sm:text-sm">
								Periodo: {billingPreview.label} — {billingPreview.months} {billingPreview.months > 1 ? 'meses' : 'mes'}
							</div>
							{billingPreview.discount > 0 && <div className="text-xs sm:text-sm">Descuento aplicado: {(billingPreview.discount * 100).toFixed(0)}%</div>}
							<div className="mt-2 text-base sm:text-lg font-semibold text-emerald-600">Total a pagar: ${billingPreview.total.toFixed(2)}</div>
							<div className="text-[10px] sm:text-xs text-slate-500">Equivalente mensual: ${billingPreview.monthlyEquivalent.toFixed(2)} / mes</div>
						</div>
					</div>

					<div className="mt-2 text-xs sm:text-sm text-slate-600">
						<p>Precio de referencia. Al continuar irás al checkout para elegir plan mensual, trimestral o anual con descuento.</p>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-4 sm:px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm">
							Atrás
						</button>
						<button type="button" onClick={() => setStep(4)} className="px-4 sm:px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm">
							Continuar al registro
						</button>
					</div>
				</section>
			)}

			{/* Paso 4: Revisión */}
			{step === 4 && (
				<section aria-label="Revisar" className="space-y-3 sm:space-y-4">
					<h3 className="text-base sm:text-lg font-semibold text-slate-700">Revisar y confirmar</h3>

					<div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100">
						<div className="text-xs sm:text-sm text-slate-700 font-medium mb-2">Cuenta</div>
						<div className="text-xs sm:text-sm text-slate-600">Nombre: {fullName}</div>
						<div className="text-xs sm:text-sm text-slate-600">Email: {email}</div>
						<div className="text-xs sm:text-sm text-slate-600">Tipo: {role}</div>
					</div>

					{role === 'PACIENTE' ? (
						<div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm">
							<div className="flex items-center gap-2 mb-3 sm:mb-4">
								<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
									<svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
								</div>
								<div className="text-sm sm:text-base font-bold text-slate-900">Paciente</div>
							</div>
							<div className="space-y-2 ml-0 sm:ml-12">
								<div className="text-xs sm:text-sm text-slate-700">
									<span className="font-semibold">Nombre:</span> {firstName} {lastName}
								</div>
								<div className="text-xs sm:text-sm text-slate-700">
									<span className="font-semibold">ID:</span> {identifier}
								</div>
								<div className="text-xs sm:text-sm text-slate-700">
									<span className="font-semibold">Teléfono:</span> {phone || '—'}
								</div>
								<div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg sm:rounded-xl">
									<div className="flex items-center gap-2 mb-1">
										<svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<div className="text-xs sm:text-sm font-bold text-green-900">Acceso Gratuito</div>
									</div>
									<div className="text-[10px] sm:text-xs text-green-700 ml-0 sm:ml-7">Los pacientes tienen acceso gratuito a la plataforma.</div>
								</div>
								<div className="text-xs sm:text-sm text-slate-700 mt-3 sm:mt-4">
									<span className="font-semibold">Alergias:</span> {allergies || '—'}
								</div>
								<div className="text-xs sm:text-sm text-slate-700">
									<span className="font-semibold">Medicaciones:</span> {currentMedications || '—'}
								</div>
								{selectedOrganizationId && (
									<div className="mt-3 pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700">
										<span className="font-semibold">Asociado a clínica:</span>{' '}
										<strong className="text-teal-700">{organizations.find((o) => o.id === selectedOrganizationId)?.name ?? selectedOrganizationId}</strong>
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100">
							<div className="text-xs sm:text-sm font-medium text-slate-700 mb-2">Organización</div>
							<div className="text-xs sm:text-sm text-slate-600">Nombre: {orgName}</div>
							<div className="text-xs sm:text-sm text-slate-600">Tipo: {orgType}</div>
							<div className="text-xs sm:text-sm text-slate-600">Especialistas (aprox.): {specialistCount}</div>
							<div className="text-xs sm:text-sm text-slate-600">
								Plan recomendado: <strong>{recommendedPlan.label}</strong>
							</div>
							<div className="text-xs sm:text-sm text-slate-600">
								Periodicidad: <strong>{billingPreview.label}</strong>
							</div>
							<div className="text-xs sm:text-sm text-slate-600">
								Total a pagar: <strong>${billingPreview.total.toFixed(2)}</strong>
							</div>
						</div>
					)}

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-4 sm:px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm">
							Atrás
						</button>
						<button type="submit" disabled={loading} className="px-4 sm:px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium text-xs sm:text-sm">
							{loading ? 'Registrando...' : 'Confirmar y registrar'}
						</button>
					</div>
				</section>
			)}

			{/* Mensajes */}
			{errorMsg && (
				<div role="alert" className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
					<div className="flex items-center gap-2">
						<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p className="text-sm font-semibold text-red-800">{errorMsg}</p>
					</div>
				</div>
			)}
			{successMsg && (
				<div role="status" className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
					<div className="flex items-center gap-2">
						<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p className="text-sm font-semibold text-green-800">{successMsg}</p>
					</div>
				</div>
			)}
			</div>

			{/* Footer del formulario */}
			<div className="bg-slate-50 px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-t border-slate-200">
				<p className="text-[10px] sm:text-xs text-slate-500 text-center leading-relaxed">
					Al registrarte aceptas nuestra{' '}
					<a href="/privacy" className="text-teal-600 hover:text-teal-700 font-medium underline">
						Política de Privacidad
					</a>
					. Los datos médicos se almacenan cifrados y solo son accesibles por los profesionales autorizados.
				</p>
			</div>
		</form>
	);
}
