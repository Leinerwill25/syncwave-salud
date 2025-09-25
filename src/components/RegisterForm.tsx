// components/RegisterForm.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type OrgType = 'CLINICA' | 'HOSPITAL' | 'CONSULTORIO' | 'FARMACIA' | 'LABORATORIO';
type Role = 'ADMIN' | 'MEDICO' | 'FARMACIA' | 'PACIENTE';
type PatientPlan = 'individual' | 'family';
type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

export default function RegisterForm(): React.ReactElement {
	const router = useRouter();

	// Paso actual (1..4)
	const [step, setStep] = useState<number>(1);

	// Cuenta
	const [role, setRole] = useState<Role>('ADMIN');
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	// Organización
	const [orgName, setOrgName] = useState('');
	const [orgType, setOrgType] = useState<OrgType>('CLINICA');
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

	// Plan / Billing (nuevo)
	const [patientPlan, setPatientPlan] = useState<PatientPlan>('individual'); // para pacientes: individual o family
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly'); // monthly | quarterly | annual

	// UI
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Si cambia el role a MEDICO, forzamos specialistCount = 1 y lo reflejamos en displaySpecialistCount
	useEffect(() => {
		if (role === 'MEDICO') {
			setSpecialistCount(1);
			setDisplaySpecialistCount('1');
		}
		// si cambia a otro role, no forzamos nada (el usuario puede editar el número)
		// además, al cambiar role reiniciamos plan/billing a valores por defecto razonables
		if (role !== 'PACIENTE') {
			setPatientPlan('individual');
		}
		if (role === 'PACIENTE') {
			setBillingPeriod('monthly');
		}
	}, [role]);

	// Mantener displaySpecialistCount sincronizado si specialistCount cambia por otra vía
	useEffect(() => {
		setDisplaySpecialistCount(String(specialistCount));
	}, [specialistCount]);

	// Base prices
	const PRICE_MEDICO = 14.99; // medico individual
	const PRICE_PACIENTE_INDIVIDUAL = 4.99;
	const PRICE_PACIENTE_FAMILY = 14.99;

	// Plan recomendado (ahora considera role MEDICO / PACIENTE)
	const recommendedPlan = useMemo(() => {
		if (role === 'MEDICO') return { slug: 'medico', label: 'Plan Médico (1) — Usuario individual', price: PRICE_MEDICO };
		if (role === 'PACIENTE') {
			return patientPlan === 'individual' ? { slug: 'paciente-individual', label: 'Paciente — Individual', price: PRICE_PACIENTE_INDIVIDUAL } : { slug: 'paciente-family', label: 'Paciente — Plan Familiar (hasta 5)', price: PRICE_PACIENTE_FAMILY };
		}

		// Organizaciónes normales: reglas por rangos
		if (specialistCount >= 10 && specialistCount <= 20) return { slug: '10-20', label: '10–20 especialistas', price: 69.99 };
		if (specialistCount >= 21 && specialistCount <= 50) return { slug: '21-50', label: '21–50 especialistas', price: 99.99 };
		if (specialistCount >= 51 && specialistCount <= 100) return { slug: '51-100', label: '51–100 especialistas', price: 149.99 };
		if (specialistCount < 10) return { slug: 'small', label: 'Pequeña (<10) — plan básico', price: 29.99 };
		return { slug: 'custom', label: 'Sobredimensionado — contáctanos', price: 0 };
	}, [specialistCount, role, patientPlan]);

	// Cálculo de precio según periodicidad y descuentos (trimestral: 5% off; anual: 15% off)
	function computeBilling(priceMonthly: number, period: BillingPeriod) {
		if (period === 'monthly') {
			return {
				months: 1,
				discount: 0,
				total: priceMonthly,
				monthlyEquivalent: priceMonthly,
				label: 'Mensual (sin descuento)',
			};
		}
		if (period === 'quarterly') {
			const months = 3;
			const subtotal = priceMonthly * months;
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
		const subtotal = priceMonthly * months;
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
			// Calculamos el precio final que enviaremos al backend
			const priceMonthly = recommendedPlan.price;
			const billing = computeBilling(priceMonthly, billingPeriod);

			const payload: any = {
				account: { fullName, email, password, role },
				plan: {
					selectedPlan: recommendedPlan.slug,
					billingPeriod,
					billingMonths: billing.months,
					billingDiscount: billing.discount,
					billingTotal: Number(billing.total.toFixed(2)),
				},
			};

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

	// Step indicator component
	const StepIndicator = ({ current }: { current: number }) => {
		const steps = role === 'PACIENTE' ? ['Cuenta', 'Paciente', 'Historia', 'Revisar'] : ['Cuenta', 'Organización', 'Plan', 'Revisar'];
		return (
			<div className="flex flex-wrap items-center gap-4 mb-6">
				{steps.map((label, i) => {
					const idx = i + 1;
					const active = idx === current;
					const done = idx < current;
					return (
						<div key={label} className="flex items-center gap-3">
							<div aria-current={active ? 'step' : undefined} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${done ? 'bg-sky-600 text-white' : active ? 'bg-white border-2 border-sky-600 text-sky-700' : 'bg-white border border-slate-200 text-slate-500'}`}>
								{done ? '✓' : idx}
							</div>
							<span className={`text-sm ${active ? 'text-sky-700 font-medium' : 'text-slate-500'}`}>{label}</span>
						</div>
					);
				})}
			</div>
		);
	};

	const inputClass = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300';

	// Compute billing preview for the recommendedPlan price
	const billingPreview = useMemo(() => computeBilling(recommendedPlan.price, billingPeriod), [recommendedPlan, billingPeriod]);

	return (
		<form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-lg border border-slate-100" aria-labelledby="register-heading">
			<h2 id="register-heading" className="text-2xl md:text-3xl font-bold text-sky-700 mb-2">
				Registro — Syncwave Salud
			</h2>
			<p className="text-sm text-slate-500 mb-6">Completa los pasos. Los datos médicos son confidenciales y se almacenan con seguridad.</p>

			<StepIndicator current={step} />

			{/* Paso 1: Cuenta */}
			{step === 1 && (
				<section aria-label="Cuenta" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label className="block">
							<span className="text-sm font-medium text-slate-700">Nombre completo</span>
							<input aria-label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Ej: María Pérez" required />
						</label>

						<label className="block">
							<span className="text-sm font-medium text-slate-700">Email</span>
							<input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="tu@ejemplo.com" required />
						</label>

						<label className="block">
							<span className="text-sm font-medium text-slate-700">Contraseña</span>
							<input aria-label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" required />
						</label>

						<label className="block">
							<span className="text-sm font-medium text-slate-700">¿Eres?</span>
							<select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass} aria-label="Tipo de cuenta" onBlur={() => setStep(1)}>
								<option value="ADMIN">Administrador / Clínica</option>
								<option value="MEDICO">Médico</option>
								<option value="FARMACIA">Farmacia</option>
								<option value="PACIENTE">Paciente</option>
							</select>
						</label>
					</div>

					<div className="flex justify-end gap-3 mt-4">
						<button type="button" onClick={next} disabled={!step1Valid} className={`px-5 py-2 rounded-lg ${step1Valid ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 2: Organización (no preguntar número si role === 'MEDICO') */}
			{step === 2 && role !== 'PACIENTE' && (
				<section aria-label="Organización" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label>
							<span className="text-sm font-medium text-slate-700">Nombre de la organización / consultorio</span>
							<input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} placeholder="Ej: Clínica Santa Rosa (o tu consultorio)" required />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Tipo de organización</span>
							<select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)} className={inputClass}>
								<option>CLINICA</option>
								<option>HOSPITAL</option>
								<option>CONSULTORIO</option>
								<option>FARMACIA</option>
								<option>LABORATORIO</option>
							</select>
						</label>

						{/* Si es MEDICO no pedimos número de especialistas (es 1 por defecto); para otros roles sí */}
						{role === 'MEDICO' ? (
							<div className="md:col-span-1">
								<span className="text-sm font-medium text-slate-700">Especialistas</span>
								<div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50 text-slate-900">Usuario individual — 1 especialista</div>
							</div>
						) : (
							<label>
								<span className="text-sm font-medium text-slate-700">Número de especialistas (aprox.)</span>
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
									className="mt-1 px-3 py-2 w-full border rounded-lg focus:outline-none text-slate-700 focus:ring-2 focus:ring-sky-300"
								/>
							</label>
						)}

						<label>
							<span className="text-sm font-medium text-slate-700">Teléfono de contacto</span>
							<input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} className={inputClass} placeholder="+58 412 0000000" />
						</label>

						<label className="md:col-span-2">
							<span className="text-sm font-medium text-slate-700">Dirección</span>
							<input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} className={inputClass} placeholder="Calle, ciudad, estado" />
						</label>
					</div>

					<div className="mt-4 p-4 rounded-lg bg-sky-50 border border-sky-100 text-slate-800">
						Plan recomendado: <strong>{recommendedPlan.label}</strong> — <strong>${recommendedPlan.price.toFixed(2)}</strong> / mes
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700">
							Atrás
						</button>
						<button type="button" onClick={next} disabled={!step2OrgValid} className={`px-5 py-2 rounded-lg ${step2OrgValid ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 2: Paciente (datos personales + selección de plan + periodicidad) */}
			{step === 2 && role === 'PACIENTE' && (
				<section aria-label="Datos paciente" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label>
							<span className="text-sm font-medium text-slate-700">Nombres</span>
							<input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
						</label>
						<label>
							<span className="text-sm font-medium text-slate-700">Apellidos</span>
							<input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} required />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Cédula / Identificación</span>
							<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} required />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Fecha de nacimiento</span>
							<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Género</span>
							<select value={gender} onChange={(e) => setGender(e.target.value as any)} className={inputClass}>
								<option value="">Preferir no decir</option>
								<option value="M">Masculino</option>
								<option value="F">Femenino</option>
								<option value="O">Otro</option>
							</select>
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Teléfono</span>
							<input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
						</label>

						<label className="md:col-span-2">
							<span className="text-sm font-medium text-slate-700">Dirección</span>
							<input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
						</label>
					</div>

					<div className="mt-2 text-sm text-slate-600">
						<p className="font-medium">Contacto de emergencia</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
							<label>
								<span className="text-sm">Nombre</span>
								<input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={inputClass} />
							</label>
							<label>
								<span className="text-sm">Teléfono</span>
								<input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={inputClass} />
							</label>
						</div>
					</div>

					{/* --- NUEVO: Selección de plan para paciente (individual / family) y periodicidad --- */}
					<div className="mt-4 p-4 border rounded-lg bg-white">
						<div className="text-sm font-medium text-slate-700 mb-2">Selecciona un plan</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<label className="p-3 text-slate-700 border rounded-lg cursor-pointer">
								<input type="radio" name="patientPlan" checked={patientPlan === 'individual'} onChange={() => setPatientPlan('individual')} className="mr-2 text-slate-700" />
								<strong className="text-slate-700">Individual</strong> — ${PRICE_PACIENTE_INDIVIDUAL.toFixed(2)} / mes (1 persona)
							</label>
							<label className="p-3 text-slate-700 border rounded-lg cursor-pointer">
								<input type="radio" name="patientPlan" checked={patientPlan === 'family'} onChange={() => setPatientPlan('family')} className="mr-2 text-slate-700" />
								<strong className="text-slate-700">Familiar</strong> — ${PRICE_PACIENTE_FAMILY.toFixed(2)} / mes (hasta 5 personas)
							</label>
						</div>

						<div className="mt-4">
							<div className="text-sm font-medium mb-1 text-slate-700">Periodicidad (elige y verás el cálculo)</div>
							<select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)} className={inputClass} aria-label="Periodicidad">
								<option value="monthly">Mensual — pagar mes a mes</option>
								<option value="quarterly">Trimestral — 3 meses (5% descuento)</option>
								<option value="annual">Anual — 12 meses (15% descuento)</option>
							</select>

							<div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-100 text-slate-700">
								<div className="text-sm">Resumen de cobro:</div>
								<div className="mt-1 text-sm">
									<strong>{recommendedPlan.label}</strong> — Precio base mensual: ${recommendedPlan.price.toFixed(2)}
								</div>
								<div className="text-sm">
									Periodo: {billingPreview.label} — {billingPreview.months} {billingPreview.months > 1 ? 'meses' : 'mes'}
								</div>
								{billingPreview.discount > 0 && <div className="text-sm">Descuento aplicado: {(billingPreview.discount * 100).toFixed(0)}%</div>}
								<div className="mt-2 text-lg font-semibold text-sky-600">Total a pagar: ${billingPreview.total.toFixed(2)}</div>
								<div className="text-xs text-slate-500">Equivalente mensual: ${billingPreview.monthlyEquivalent.toFixed(2)} / mes</div>
							</div>
						</div>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700">
							Atrás
						</button>
						<button type="button" onClick={next} disabled={!step2PatientValid} className={`px-5 py-2 rounded-lg ${step2PatientValid ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 3: Historia (Paciente) */}
			{step === 3 && role === 'PACIENTE' && (
				<section aria-label="Historia clínica" className="space-y-4">
					<h3 className="text-lg font-semibold text-slate-700">Historia clínica (resumen)</h3>
					<div className="grid grid-cols-1 gap-4">
						<label>
							<span className="text-sm font-medium text-slate-700">Alergias conocidas</span>
							<textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} className="mt-1 px-3 py-2 w-full text-slate-700 border rounded-lg" rows={3} placeholder="P. ej.: Penicilina — reacción: urticaria" />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Enfermedades crónicas / antecedentes</span>
							<textarea value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} className="mt-1 px-3 py-2 w-full text-slate-700 border rounded-lg" rows={3} placeholder="Hipertensión, diabetes, etc." />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Medicación actual</span>
							<textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} className="mt-1 px-3 py-2 w-full text-slate-700 border rounded-lg" rows={2} placeholder="Medicamento — dosis — frecuencia" />
						</label>

						<label>
							<span className="text-sm font-medium text-slate-700">Aseguradora / Plan (opcional)</span>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
								<input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className={inputClass} placeholder="Proveedor" />
								<input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} className={inputClass} placeholder="Número de póliza / afiliado" />
							</div>
						</label>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700">
							Atrás
						</button>
						<button type="button" onClick={() => setStep(4)} className="px-5 py-2 rounded-lg bg-sky-600 text-white">
							Siguiente
						</button>
					</div>
				</section>
			)}

			{/* Paso 3: Plan (Organización) - si role !== PACIENTE */}
			{step === 3 && role !== 'PACIENTE' && (
				<section aria-label="Plan" className="space-y-4">
					<h3 className="text-lg font-semibold text-slate-700">Plan recomendado</h3>

					{/* Si es MEDICO, mostramos la tarjeta individual; si es organización normal, mostramos las 3 opciones */}
					{role === 'MEDICO' ? (
						<div className="p-4 rounded-lg border border-sky-600 bg-white shadow-lg flex items-center justify-between">
							<div>
								<div className="text-sm font-semibold text-slate-900">Plan Médico — Usuario individual</div>
								<div className="text-xs text-slate-500">1 usuario — ideal para médicos independientes</div>
							</div>
							<div className="text-right">
								<div className="text-2xl font-extrabold text-sky-600">${recommendedPlan.price.toFixed(2)}</div>
								<div className="text-xs text-slate-400">/ mes</div>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
							{[
								{ slug: '10-20', label: '10–20 especialistas', price: 69.99, range: '10–20' },
								{ slug: '21-50', label: '21–50 especialistas', price: 99.99, range: '21–50' },
								{ slug: '51-100', label: '51–100 especialistas', price: 149.99, range: '51–100' },
							].map((p) => {
								const recommended = p.slug === recommendedPlan.slug;
								return (
									<div key={p.slug} aria-labelledby={`plan-${p.slug}`} tabIndex={0} className={`relative pt-6 pb-4 px-4 rounded-2xl border bg-white transition-transform transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 ${recommended ? 'border-sky-600 shadow-lg ring-sky-100' : 'border-slate-200 shadow-sm'} min-h-[128px] flex flex-col justify-between`}>
										{recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full shadow">Recomendado</span>}

										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div id={`plan-${p.slug}`} className="text-sm font-semibold text-slate-900 truncate">
													{p.label}
												</div>
											</div>
										</div>

										<hr className="my-3 border-t border-slate-100" />

										<div className="flex items-center justify-between gap-3">
											<ul className="flex-1 space-y-1 text-[12px] text-slate-600">
												<li className="truncate">• Soporte básico</li>
												<li className="truncate">• Reportes semanales</li>
											</ul>
										</div>

										{recommended && (
											<div className="mt-3 text-[12px] text-slate-600">
												Recomendado según <span className="font-semibold text-slate-800">{specialistCount}</span> especialistas.
											</div>
										)}
										<div className="text-right flex flex-col items-end">
											<div className="text-lg md:text-2xl font-extrabold leading-none text-sky-600">${p.price.toFixed(2)}</div>
											<div className="text-[11px] text-slate-400">/ mes</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Periodicidad para organizaciones/medico */}
					<div className="mt-4">
						<div className="text-sm font-medium mb-2">Periodicidad</div>
						<select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)} className={inputClass}>
							<option value="monthly">Mensual</option>
							<option value="quarterly">Trimestral — 5% descuento</option>
							<option value="annual">Anual — 15% descuento</option>
						</select>

						<div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-100 text-slate-700">
							<div className="text-sm">Resumen de cobro:</div>
							<div className="mt-1 text-sm">
								<strong>{recommendedPlan.label}</strong> — Precio base mensual: ${recommendedPlan.price.toFixed(2)}
							</div>
							<div className="text-sm">
								Periodo: {billingPreview.label} — {billingPreview.months} {billingPreview.months > 1 ? 'meses' : 'mes'}
							</div>
							{billingPreview.discount > 0 && <div className="text-sm">Descuento aplicado: {(billingPreview.discount * 100).toFixed(0)}%</div>}
							<div className="mt-2 text-lg font-semibold text-sky-600">Total a pagar: ${billingPreview.total.toFixed(2)}</div>
							<div className="text-xs text-slate-500">Equivalente mensual: ${billingPreview.monthlyEquivalent.toFixed(2)} / mes</div>
						</div>
					</div>

					<div className="mt-2 text-sm text-slate-600">
						<p>Precio de referencia. Al continuar irás al checkout para elegir plan mensual, trimestral o anual con descuento.</p>
					</div>

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700">
							Atrás
						</button>
						<button type="button" onClick={() => setStep(4)} className="px-5 py-2 rounded-lg bg-sky-600 text-white">
							Continuar al registro
						</button>
					</div>
				</section>
			)}

			{/* Paso 4: Revisión */}
			{step === 4 && (
				<section aria-label="Revisar" className="space-y-4">
					<h3 className="text-lg font-semibold text-slate-700">Revisar y confirmar</h3>

					<div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
						<div className="text-sm text-slate-700 font-medium mb-2">Cuenta</div>
						<div className="text-sm text-slate-600">Nombre: {fullName}</div>
						<div className="text-sm text-slate-600">Email: {email}</div>
						<div className="text-sm text-slate-600">Tipo: {role}</div>
					</div>

					{role === 'PACIENTE' ? (
						<div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
							<div className="text-sm font-medium text-slate-700 mb-2">Paciente</div>
							<div className="text-sm text-slate-600">
								Nombre: {firstName} {lastName}
							</div>
							<div className="text-sm text-slate-600">ID: {identifier}</div>
							<div className="text-sm text-slate-600">Teléfono: {phone || '—'}</div>
							<div className="text-sm text-slate-600">
								Plan: <strong>{recommendedPlan.label}</strong>
							</div>
							<div className="text-sm text-slate-600">
								Periodicidad: <strong>{billingPreview.label}</strong>
							</div>
							<div className="text-sm text-slate-600">
								Total a pagar: <strong>${billingPreview.total.toFixed(2)}</strong>
							</div>
							<div className="text-sm text-slate-600">Alergias: {allergies || '—'}</div>
							<div className="text-sm text-slate-600">Medicaciones: {currentMedications || '—'}</div>
						</div>
					) : (
						<div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
							<div className="text-sm font-medium text-slate-700 mb-2">Organización</div>
							<div className="text-sm text-slate-600">Nombre: {orgName}</div>
							<div className="text-sm text-slate-600">Tipo: {orgType}</div>
							<div className="text-sm text-slate-600">Especialistas (aprox.): {specialistCount}</div>
							<div className="text-sm text-slate-600">
								Plan recomendado: <strong>{recommendedPlan.label}</strong>
							</div>
							<div className="text-sm text-slate-600">
								Periodicidad: <strong>{billingPreview.label}</strong>
							</div>
							<div className="text-sm text-slate-600">
								Total a pagar: <strong>${billingPreview.total.toFixed(2)}</strong>
							</div>
						</div>
					)}

					<div className="flex justify-between gap-3 mt-4">
						<button type="button" onClick={back} className="px-5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700">
							Atrás
						</button>
						<button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium">
							{loading ? 'Registrando...' : 'Confirmar y registrar'}
						</button>
					</div>
				</section>
			)}

			{/* Mensajes */}
			{errorMsg && (
				<div role="alert" className="mt-4 text-sm text-red-600">
					{errorMsg}
				</div>
			)}
			{successMsg && (
				<div role="status" className="mt-4 text-sm text-green-600">
					{successMsg}
				</div>
			)}

			<p className="text-xs text-slate-400 mt-6">Al registrarte aceptas nuestra Política de Privacidad. Los datos médicos se almacenan cifrados y solo son accesibles por los profesionales autorizados.</p>
		</form>
	);
}
