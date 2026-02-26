// components/RegisterForm.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

type OrgType = 'CLINICA' | 'HOSPITAL' | 'CONSULTORIO' | 'FARMACIA' | 'LABORATORIO';
type Role = 'ADMIN' | 'MEDICO' | 'FARMACIA' | 'PACIENTE' | 'LABORATORIO' | 'ENFERMERO';
type PatientPlan = 'individual' | 'family';
type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

type OrgItem = { id: string; name: string; inviteBaseUrl?: string | null; contactEmail?: string | null };

// -------------------------
// Helper Functions (Outside component for stability and linting)
// -------------------------

function computeSedesCost(count: number | string) {
	const numCount = typeof count === 'string' && count.includes('+') ? 11 : typeof count === 'string' && count.includes('-') ? 7 : Number(count);
	
	if (numCount <= 1) return 0;
	const extra = numCount - 1;
	if (extra <= 3) {
		return extra * 45; // Sedes 2, 3, 4 → €45 c/u
	} else {
		// Sedes 2–4: 3 × €45 = €135
		// Sedes 5–10: resto × €30
		return (3 * 45) + ((extra - 3) * 30);
	}
}

function computeBilling(
	unitPrice: number, 
	period: BillingPeriod, 
	role: Role, 
	sedeCount: number | string, 
	specialistCount: number, 
	isPatient = false, 
) {
	if (role === 'MEDICO') return {
		type: 'INDIVIDUAL',
		requiresRedirect: false,
		totalCharge: unitPrice,
		billingCycle: period,
		months: 1,
		discount: 0,
		total: unitPrice,
		label: 'Individual (Medico)'
	};

	const numericSedeCount = typeof sedeCount === 'string' && sedeCount.includes('+') ? 11 : typeof sedeCount === 'string' && sedeCount.includes('-') ? 7 : Number(sedeCount);
	
	if ((specialistCount >= 200 || numericSedeCount >= 11) && !isPatient) {
		return { 
			type: 'CUSTOM', 
			requiresQuote: true,
			specialistCount,
			sedeCount: numericSedeCount,
			totalCharge: 0,
			billingCycle: period,
			months: 1,
			discount: 0,
			total: 0
		};
	}

	if (isPatient) {
		if (period === 'annual') {
			const months = 12;
			const total = unitPrice;
			const monthlyEquivalent = total / months;
			return {
				type: 'CALCULATED',
				months,
				discount: 0,
				total,
				monthlyEquivalent,
				label: 'Anual (pago único)',
				billingCycle: 'annual',
				totalCharge: total,
			};
		}
		if (period === 'quarterly') {
			const monthlyEq = unitPrice / 12;
			const months = 3;
			const subtotal = monthlyEq * months;
			const discount = 0.05;
			const total = subtotal * (1 - discount);
			return { type: 'CALCULATED', months, discount, total, monthlyEquivalent: monthlyEq, label: 'Trimestral (5% sobre equivalente mensual)', billingCycle: 'quarterly', totalCharge: total };
		}
		const months = 1;
		const monthlyEquivalent = unitPrice / 12;
		return { type: 'CALCULATED', months, discount: 0, total: monthlyEquivalent, monthlyEquivalent, label: 'Mensual (equivalente del plan anual)', billingCycle: 'monthly', totalCharge: monthlyEquivalent };
	}

	const baseSubtotal = unitPrice * specialistCount; 
	const sedesSubtotal = computeSedesCost(sedeCount);
	const monthlyTotal = baseSubtotal + sedesSubtotal;

	if (period === 'monthly') {
		return {
			type: 'CALCULATED',
			months: 1,
			discount: 0,
			total: monthlyTotal,
			monthlyEquivalent: monthlyTotal,
			label: 'Mensual (sin descuento)',
			baseSubtotal,
			sedesSubtotal,
			monthlyBeforeDiscount: monthlyTotal,
			totalCharge: monthlyTotal,
			billingCycle: 'monthly',
			savings: 0,
			vsIndividualSavings: (specialistCount * 70) - monthlyTotal,
			specialistCount,
			sedeCount: numericSedeCount,
			pricePerEsp: unitPrice
		};
	}

	if (period === 'quarterly') {
		const months = 3;
		const discount = 0.10;
		const discountedMonthly = monthlyTotal * (1 - discount);
		const total = discountedMonthly * months;
		const savings = (monthlyTotal * months) - total;

		return {
			type: 'CALCULATED',
			months,
			discount,
			total,
			monthlyEquivalent: total / months,
			label: 'Trimestral (10% descuento)',
			baseSubtotal,
			sedesSubtotal,
			monthlyBeforeDiscount: monthlyTotal,
			discountPercent: discount * 100,
			discountedMonthly,
			totalCharge: total,
			cycleDiscount: savings,
			billingCycle: 'quarterly',
			savings,
			vsIndividualSavings: (specialistCount * 70) - discountedMonthly,
			specialistCount,
			sedeCount: numericSedeCount,
			pricePerEsp: unitPrice
		};
	}

	if (period === 'annual') {
		const months = 12;
		const discount = 0.30;
		const discountedMonthly = monthlyTotal * (1 - discount);
		const total = discountedMonthly * months;
		const savings = (monthlyTotal * months) - total;

		return {
			type: 'CALCULATED',
			months,
			discount,
			total,
			monthlyEquivalent: total / months,
			label: 'Anual (30% descuento)',
			baseSubtotal,
			sedesSubtotal,
			monthlyBeforeDiscount: monthlyTotal,
			discountPercent: discount * 100,
			discountedMonthly,
			totalCharge: total,
			cycleDiscount: savings,
			billingCycle: 'annual',
			savings,
			vsIndividualSavings: (specialistCount * 70) - discountedMonthly,
			specialistCount,
			sedeCount: numericSedeCount,
			pricePerEsp: unitPrice
		};
	}

	return {
		type: 'CALCULATED',
		months: 1,
		discount: 0,
		total: baseSubtotal,
		monthlyEquivalent: baseSubtotal,
		label: 'Mensual',
		totalCharge: baseSubtotal,
		billingCycle: 'monthly'
	};
}

const BillingBreakdown = ({ billing, recommendedPlanLabel, specialistCount, sedeCount }: { 
	billing: any; 
	recommendedPlanLabel: string | undefined; 
	specialistCount: number; 
	sedeCount: number | string; 
}) => {
	if (!billing) return null;
	
	if (billing.type === 'CUSTOM') {
		const message = `Hola, quiero registrar mi clínica en ASHIRA.
Total especialistas: ${specialistCount}${specialistCount >= 200 ? '+' : ''}
Número de sedes: ${sedeCount === '11+' || (typeof sedeCount === 'number' && sedeCount >= 11) ? '11+' : sedeCount}
Quisiera una cotización personalizada.`;

	  const waUrl = `https://wa.me/584124885623?text=${encodeURIComponent(message)}`;

	  return (
	    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-6 mt-4">
	      <div className="text-4xl mb-4">🏛️</div>
	      <h3 className="text-xl font-bold text-slate-800 mb-2">Plan Institucional Personalizado</h3>
	      <p className="text-slate-600 mb-6">
	        Tu institución requiere un plan a la medida. 
	        Nuestro equipo te contacta en menos de 24 horas 
	        con una cotización específica para tu clínica.
	      </p>
	      <div className="flex flex-col sm:flex-row gap-3">
	        <a href={waUrl} target="_blank" className="flex-1 bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-lg text-center hover:bg-emerald-700 transition flex items-center justify-center gap-2" rel="noreferrer">
			  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
	          Solicitar cotización
	        </a>
	      </div>
	    </div>
	  );
	}
	
	if (billing.type === 'INDIVIDUAL') {
	  return (
	    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-4">
	      <p className="font-semibold text-amber-800 mb-4">¿Eres un médico independiente? 
	         Tenemos un plan especial diseñado para ti.</p>
	      <a href="/landing/consultorios" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition block text-center">
	        Ver planes para consultorios →
	      </a>
	    </div>
	  );
	}

	return (
		<div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 mt-6">
		<div className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
			Plan {billing.plan || recommendedPlanLabel}
		</div>
		<div className="space-y-3 text-sm text-slate-700">
			<div className="flex justify-between items-center">
			<span>{billing.specialistCount} especialistas × €{billing.pricePerEsp?.toFixed(2)}</span>
			<span className="font-medium">€{billing.baseSubtotal?.toFixed(2)}/mes</span>
			</div>
			
			{(billing.sedeCount > 1 || (typeof billing.sedeCount === 'string' && billing.sedeCount !== '1')) && (
			<div className="flex justify-between items-center text-indigo-700 bg-indigo-50 px-2 py-1 -mx-2 rounded">
				<span>
				+ {Number(billing.sedeCount) - 1} sede{Number(billing.sedeCount) > 2 ? 's' : ''} adicional{Number(billing.sedeCount) > 2 ? 'es' : ''}
				</span>
				<span className="font-medium">+ €{billing.sedesSubtotal?.toFixed(2)}/mes</span>
			</div>
			)}
			
			<div className="flex justify-between items-center pt-2 border-t border-slate-200 font-semibold text-slate-900">
			<span>Subtotal mensual</span>
			<span>€{billing.monthlyBeforeDiscount?.toFixed(2)}/mes</span>
			</div>
			
			{billing.discountPercent > 0 && (
			<div className="flex justify-between items-center text-emerald-600">
				<span>Descuento {billing.billingCycle === 'quarterly' ? 'trimestral' : 'anual'} 
					(−{billing.discountPercent}%)</span>
				<span className="font-bold">−€{billing.cycleDiscount?.toFixed(0)}</span>
			</div>
			)}
			
			<div className="flex justify-between items-center pt-3 border-t border-slate-200 text-lg">
			<span className="font-bold text-slate-800">
				Total {billing.billingCycle === 'monthly' ? 'mensual' : 
					billing.billingCycle === 'quarterly' ? 'trimestral' : 'anual'}
			</span>
			<strong className="text-teal-700">€{billing.totalCharge?.toFixed(2)}</strong>
			</div>
			
			{billing.billingCycle !== 'monthly' && (
			<div className="flex justify-end text-xs text-slate-500">
				<span>Equivale a €{billing.discountedMonthly?.toFixed(2)}/mes</span>
			</div>
			)}
		</div>
		{billing.vsIndividualSavings > 0 && (
			<div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex gap-2 items-start">
			<span className="text-emerald-600 mt-0.5">💡</span>
			<span className="text-xs sm:text-sm text-emerald-800 font-medium">Ahorras €{billing.vsIndividualSavings?.toFixed(0)}/mes 
					vs pagar €70 por cada médico individualmente</span>
			</div>
		)}
		</div>
	);
};

export default function RegisterForm(): React.ReactElement {
	const router = useRouter();

	// Paso actual (1..4)
	const [step, setStep] = useState<number>(1);

	// Cuenta
	const [role, setRole] = useState<Role>('MEDICO');
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
	const [identifierValidating, setIdentifierValidating] = useState(false);
	const [identifierHistoryFound, setIdentifierHistoryFound] = useState(false);
	const [identifierError, setIdentifierError] = useState<string | null>(null);
	const [dob, setDob] = useState('');
	const [gender, setGender] = useState<'M' | 'F' | 'O' | ''>('');
	const [phone, setPhone] = useState('');
	const [address, setAddress] = useState('');
	const [locationLat, setLocationLat] = useState<number | null>(null);
	const [locationLng, setLocationLng] = useState<number | null>(null);
	const [emergencyContactName, setEmergencyContactName] = useState('');
	const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
	const [allergies, setAllergies] = useState('');
	const [chronicConditions, setChronicConditions] = useState('');
	const [currentMedications, setCurrentMedications] = useState('');
	const [insuranceProvider, setInsuranceProvider] = useState('');
	const [insuranceNumber, setInsuranceNumber] = useState('');
	const [bloodType, setBloodType] = useState('');
	const [hasDisability, setHasDisability] = useState(false);
	const [disability, setDisability] = useState('');
	const [licenseNumber, setLicenseNumber] = useState('');

	// NUEVO: Sede Selector
	const [sedeCount, setSedeCount] = useState<number | string>(1);
	const [displaySedeCount, setDisplaySedeCount] = useState<string>('1');

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
		} else if (role === 'ADMIN') {
			// Si es ADMIN (Clínica), sugerimos CLINICA por defecto
			setOrgType('CLINICA');
		} else if (role === 'ENFERMERO') {
			// Si es ENFERMERO, forzamos el tipo a CONSULTORIO (independiente)
			setOrgType('CONSULTORIO');
			setSpecialistCount(1);
			setDisplaySpecialistCount('1');
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
	const [plans, setPlans] = useState<
		Array<{
			id: string;
			slug: string;
			name: string;
			minSpecialists: number;
			maxSpecialists: number;
			monthlyPrice: number;
			quarterlyPrice: number | null;
			annualPrice: number | null;
			description: string | null;
			pricePerEsp?: number;
		}>
	>([]);
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
			if (role === 'MEDICO') return { slug: 'medico', label: 'Plan Médico — Usuario individual', price: 70.00, quarterlyPrice: 189.00, annualPrice: 588.00 };
			if (role === 'PACIENTE') {
				return patientPlan === 'individual' ? { slug: 'paciente-individual', label: 'Paciente — Individual', price: 1.08, quarterlyPrice: 3.09, annualPrice: 12.99 } : { slug: 'paciente-family', label: 'Paciente — Plan Familiar', price: 2.50, quarterlyPrice: 7.12, annualPrice: 29.99 };
			}
			if (role === 'ENFERMERO') return { slug: 'enfermero-independiente', label: 'Enfermería Independiente', price: 45.00, quarterlyPrice: 121.50, annualPrice: 378.00 };
			return { slug: 'clinic-starter', label: 'Starter (2–10 esp.)', price: 56.00, quarterlyPrice: 151.20, annualPrice: 470.40 };
		}

		if (role === 'MEDICO') {
			// Buscar plan específico para médico con slug 'medico'
			const medicoPlan = plans.find((p) => p.slug === 'medico');
			if (medicoPlan) {
				return {
					slug: medicoPlan.slug,
					label: medicoPlan.name,
					price: medicoPlan.monthlyPrice,
					quarterlyPrice: medicoPlan.quarterlyPrice,
					annualPrice: medicoPlan.annualPrice,
				};
			}
		}

		if (role === 'ENFERMERO') {
			const nursePlan = plans.find((p) => p.slug === 'enfermero-independiente');
			if (nursePlan) {
				return {
					slug: nursePlan.slug,
					label: nursePlan.name,
					price: nursePlan.monthlyPrice,
					quarterlyPrice: nursePlan.quarterlyPrice,
					annualPrice: nursePlan.annualPrice,
				};
			}
			// Fallback if not found in DB
			return { slug: 'enfermero-independiente', label: 'Enfermería Independiente', price: 65.00, quarterlyPrice: 175.50, annualPrice: 546.00 };
		}

		if (role === 'PACIENTE') {
			// Pacientes tienen la plataforma gratuita, no hay plan de pago
			return { slug: 'paciente-gratis', label: 'Plan Gratuito', price: 0, quarterlyPrice: null, annualPrice: null };
		}

		// Para organizaciones (no médicos ni pacientes), buscar plan según número de especialistas
		if (role === 'ADMIN' || role === 'FARMACIA' || role === 'LABORATORIO') {
			const orgPlan = plans.find((p) => (p.minSpecialists === 0 || p.minSpecialists <= specialistCount) && (p.maxSpecialists === 0 || p.maxSpecialists >= specialistCount));
			if (orgPlan) {
				return {
					slug: orgPlan.slug,
					label: orgPlan.name,
					price: orgPlan.monthlyPrice,
					quarterlyPrice: orgPlan.quarterlyPrice,
					annualPrice: orgPlan.annualPrice,
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
				quarterlyPrice: firstPlan.quarterlyPrice,
				annualPrice: firstPlan.annualPrice,
			};
		}
	
		return { slug: 'default', label: 'Plan por defecto', price: 0, quarterlyPrice: null, annualPrice: null };
	}, [plans, plansLoading, role, patientPlan, specialistCount]);
	




	const billingPreview = useMemo(() => {
		if (!recommendedPlan) {
			return { months: 0, discount: 0, total: 0, monthlyEquivalent: 0, label: 'Gratuito' };
		}
		return computeBilling(
			recommendedPlan.price, 
			billingPeriod, 
			role, 
			sedeCount, 
			specialistCount, 
			role === 'PACIENTE'
		);
	}, [recommendedPlan, billingPeriod, role, sedeCount, specialistCount]);

	// BillingBreakdown Component



	// Validaciones de pasos
	const fullNameValid = fullName.trim().length > 2;
	const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	const passwordValid = password.length >= 8;
	const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
	const step1Valid = fullNameValid && emailValid && passwordValid && passwordsMatch;
	// para orgs normales requerimos orgName y specialistCount >=1; para MEDICO requerimos orgName pero no specialistCount; para ENFERMERO requerimos licenseNumber pero no orgName ni specialistCount
	const step2OrgValid = role === 'PACIENTE' ? true : role === 'ENFERMERO' ? licenseNumber.trim().length > 3 : (orgName.trim().length > 2 && (role === 'MEDICO' ? true : specialistCount >= 1));
	const step2PatientValid = firstName.trim().length > 1 && lastName.trim().length > 1 && identifier.trim().length > 3;
	const finalValid = role === 'PACIENTE' ? step1Valid && step2PatientValid : step1Valid && step2OrgValid;

	// Navegación entre pasos
	const [step1Touched, setStep1Touched] = useState(false);

	function next() {
		setErrorMsg(null);
		if (step === 1 && !step1Valid) {
			setStep1Touched(true);
			setErrorMsg('Revisa tu nombre, un correo válido y que ambas contraseñas coincidan (mínimo 8 caracteres).');
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

	// Función para verificar la cédula cuando el usuario sale del campo
	async function checkIdentifier(identifierValue: string) {
		if (!identifierValue || identifierValue.trim().length < 3) {
			setIdentifierHistoryFound(false);
			setIdentifierError(null);
			return;
		}

		setIdentifierValidating(true);
		setIdentifierError(null);
		setIdentifierHistoryFound(false);

		try {
			const res = await fetch(`/api/register/check-identifier?identifier=${encodeURIComponent(identifierValue.trim())}`);
			const data = await res.json();

			if (!res.ok) {
				setIdentifierError(data?.message || 'Error al verificar la cédula');
				return;
			}

			if (!data.canRegister) {
				setIdentifierError(data.message || 'No se puede registrar con esta cédula');
				return;
			}

			if (data.hasHistory) {
				setIdentifierHistoryFound(true);
			} else {
				setIdentifierHistoryFound(false);
			}
		} catch (err: any) {
			console.error('Error verificando cédula:', err);
			setIdentifierError('Error al verificar la cédula. Intenta nuevamente.');
		} finally {
			setIdentifierValidating(false);
		}
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
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);
		if (!finalValid) {
			setErrorMsg('Revisa las secciones: faltan datos obligatorios.');
			return;
		}
		setLoading(true);

		const numericSedeCount = typeof sedeCount === 'string' && sedeCount.includes('+') ? 11 : typeof sedeCount === 'string' && sedeCount.includes('-') ? 7 : Number(sedeCount);

		try {
			const payload: any = {
				account: { fullName, email, password, role },
			};

			// Solo incluir información de plan/pago si NO es paciente (pacientes son gratuitos)
			if (role !== 'PACIENTE') {
				// Calculamos el precio final que enviaremos al backend
				const priceBase = recommendedPlan.price; // monthly price for orgs/medicos
				const billing = computeBilling(
					priceBase, 
					billingPeriod, 
					role, 
					sedeCount, 
					specialistCount, 
					false
				);

				payload.plan = {
					selectedPlan: recommendedPlan.slug,
					billingPeriod,
					billingMonths: billing.months,
					billingDiscount: billing.discount,
					billingTotal: Number(billing.total.toFixed(2)),
					requiresQuote: (billing as any).requiresQuote,
					sedeCount: numericSedeCount // Add sedeCount to plan output
				};
			}

			if (role === 'PACIENTE') {
				payload.patient = {
					firstName,
					lastName,
					identifier,
					dob: dob || undefined,
					gender: gender || undefined,
					phone: phone || undefined,
					address: address || undefined,
					locationLat: locationLat ?? undefined,
					locationLng: locationLng ?? undefined,
					emergencyContactName: emergencyContactName || undefined,
					emergencyContactPhone: emergencyContactPhone || undefined,
					allergies: allergies || undefined,
					chronicConditions: chronicConditions || undefined,
					currentMedications: currentMedications || undefined,
					insuranceProvider: insuranceProvider || undefined,
					insuranceNumber: insuranceNumber || undefined,
					bloodType: bloodType || undefined,
					hasDisability: hasDisability || false,
					disability: hasDisability && disability ? disability : undefined,
					// si el paciente eligió una clínica, la asociamos
					organizationId: selectedOrganizationId ?? undefined,
				};
			} else {
				payload.organization = {
					orgName: role === 'ENFERMERO' && !orgName ? `Atención Independiente - ${fullName}` : orgName,
					orgType,
					specialistCount,
					sedeCount: numericSedeCount, // Add sedeCount
					orgPhone,
					orgAddress,
					licenseNumber: role === 'ENFERMERO' ? licenseNumber : undefined,
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

			// Guardar datos de pago pendiente si es MEDICO o ADMIN (independientemente de verificación de email)
			if ((role === 'MEDICO' || role === 'ADMIN') && data?.organizationId && data?.userId && billingPreview) {
				// Guardar datos en localStorage para la página de pago (se usará después del login)
				localStorage.setItem('pendingPayment_organizationId', data.organizationId);
				localStorage.setItem('pendingPayment_userId', data.userId);
				localStorage.setItem('pendingPayment_amount', billingPreview.total.toString());
				localStorage.setItem('pendingPayment_role', role);
			}

			// Si se requiere verificación de email, mostrar mensaje específico
			let successMessage = '';
			if (data?.emailVerificationRequired) {
				successMessage = data?.message || 'Registro exitoso. Por favor, verifica tu correo electrónico antes de iniciar sesión.';
				// Si se vinculó con historial previo, agregar información adicional
				if (data?.hasLinkedHistory) {
					successMessage += '\n\n¡Bienvenido de nuevo! Se encontró un historial médico previo asociado a tu cédula. Al iniciar sesión, podrás acceder a todas tus consultas anteriores.';
				}
				// Si hay pago pendiente, agregar mensaje
				if ((role === 'MEDICO' || role === 'ADMIN') && data?.organizationId && billingPreview) {
					successMessage += '\n\nDespués de verificar tu email e iniciar sesión, serás redirigido para completar el pago de tu suscripción.';
				}
				setSuccessMsg(successMessage);
				// Esperar 5 segundos antes de redirigir para que el usuario lea el mensaje
				setTimeout(() => {
					router.push('/login?verify-email=true');
				}, 5000);
			} else {
				successMessage = 'Registro correcto. Serás redirigido...';
				// Si se vinculó con historial previo, agregar información adicional
				if (data?.hasLinkedHistory) {
					successMessage = '¡Registro exitoso! Se encontró un historial médico previo asociado a tu cédula. Podrás acceder a todas tus consultas anteriores. Serás redirigido...';
				}
				setSuccessMsg(successMessage);

				// Si es MEDICO o ADMIN (no PACIENTE)
				if ((role === 'MEDICO' || role === 'ADMIN')) {
					if (data?.requiresQuote) {
						// Custom Quote Flow
						localStorage.setItem('pendingQuote_organizationId', data.organizationId);
						localStorage.setItem('pendingQuote_specialistCount', String(specialistCount));
						localStorage.setItem('pendingQuote_sedeCount', typeof sedeCount === 'string' ? sedeCount : String(sedeCount));
						router.push('/register/quote-pending');
					} else if (data?.organizationId && data?.userId && billingPreview) {
						// Normal Payment Flow
						setTimeout(() => {
							router.push(`/register/payment?organizationId=${data.organizationId}&userId=${data.userId}&amount=${billingPreview.total}`);
						}, 2000);
					} else {
						router.push(data.nextUrl || '/login');
					}
				} else {
					// Redirect normal (backend can return data.nextUrl for checkout)
					router.push(data.nextUrl || '/login');
				}
			}
		} catch (err: any) {
			setLoading(false);
			setErrorMsg(err?.message || 'Error inesperado');
		}
	}

	// Componente de mapa para seleccionar ubicación (cargado dinámicamente para evitar SSR)
	const LocationMapPicker = dynamic<any>(() => import('@/components/LocationMapPicker'), { ssr: false });

	const StepIndicator = ({ current }: { current: number }) => {
		const steps = role === 'PACIENTE' ? ['Cuenta', 'Paciente', 'Historia', 'Revisar'] : ['Cuenta', 'Organización', 'Plan', 'Revisar'];
		return (
			<div className="relative mb-6 sm:mb-8 lg:mb-10">
				{/* Línea de progreso */}
				<div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10">
					<div className="h-full bg-gradient-to-r from-teal-600 to-cyan-600 transition-all duration-500 ease-out" style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }} />
				</div>
				<div className="flex justify-between items-center relative">
					{steps.map((label, i) => {
						const idx = i + 1;
						const active = idx === current;
						const done = idx < current;
						return (
							<div key={label} className="flex flex-col items-center flex-1">
								<div aria-current={active ? 'step' : undefined} className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${done ? 'bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg scale-110' : active ? 'bg-white border-2 sm:border-3 border-teal-600 text-teal-700 shadow-xl scale-110 ring-2 sm:ring-4 ring-teal-100' : 'bg-white border-2 border-slate-300 text-slate-400 shadow-sm'}`}>
									{done ? (
										<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
										</svg>
									) : (
										idx
									)}
								</div>
								<span className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold text-center max-w-[60px] sm:max-w-[80px] ${active ? 'text-teal-700' : done ? 'text-teal-600' : 'text-slate-400'}`}>{label}</span>
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
	// Clase para selects con flecha negra personalizada
	const selectClass = 'mt-2 w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl bg-white text-sm sm:text-base text-slate-900 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 hover:shadow-md custom-select-arrow';

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
								<p className="mt-1.5 text-xs text-amber-600 flex items-start gap-1.5">
									<svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>Importante: Se enviará un correo de verificación a esta dirección. Asegúrate de tener acceso a este correo electrónico para activar tu cuenta.</span>
								</p>
								{step1Touched && !emailValid && <p className="mt-1.5 text-xs text-rose-600">Ingresa un correo electrónico válido (ej. usuario@dominio.com).</p>}
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
										<input aria-label="Contraseña" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-12`} placeholder="Mínimo 8 caracteres, incluye mayúsculas y números" required minLength={8} />
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

							{/* Confirmar contraseña */}
							<div className="md:col-span-2">
								<label className="block group">
									<span className={labelClass}>
										<span className="inline-flex items-center gap-2">
											<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
											</svg>
											Confirmar contraseña
										</span>
									</span>
									<div className="relative">
										<input aria-label="Confirmar contraseña" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} pr-12`} placeholder="Repite la misma contraseña" required minLength={8} />
										<button type="button" onClick={() => setShowConfirmPassword((s) => !s)} aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50">
											{showConfirmPassword ? (
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
									{step1Touched && !passwordsMatch && confirmPassword.length > 0 && <p className="mt-2 text-xs text-rose-600">Las contraseñas no coinciden. Verifícalas antes de continuar.</p>}
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
											// Permitir MEDICO, PACIENTE, ADMIN y ENFERMERO
											const allowedRoles: Role[] = ['MEDICO', 'PACIENTE', 'ADMIN', 'ENFERMERO'];
											if (!allowedRoles.includes(newRole)) {
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
										<option value="ENFERMERO">Enfermero/a Independiente</option>
										<option value="ADMIN">
											Clínica / Centro Médico
										</option>
										<option value="FARMACIA" disabled>
											Farmacia (Próximamente)
										</option>
										<option value="LABORATORIO" disabled>
											Laboratorio (Próximamente)
										</option>
									</select>
								</label>
								{/* Mensaje informativo sobre opciones próximamente */}
								<div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
									<div className="flex items-start gap-3">
										<svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p className="text-xs text-blue-800 leading-relaxed">
											<strong>Nota:</strong> Actualmente el registro está disponible para <strong>Consultorios Privados</strong>, <strong>Clínicas</strong> y <strong>Pacientes</strong>. El registro para Farmacias y Laboratorios estará disponible próximamente.
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
									<select value={selectedOrganizationId ?? ''} onChange={(e) => setSelectedOrganizationId(e.target.value === '' ? null : e.target.value)} className={selectClass} aria-label="Clínica que te recomendó (opcional)">
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
							<button type="button" onClick={next} disabled={!step1Valid} className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 ${step1Valid ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
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
						<div className={`grid grid-cols-1 ${role === 'ENFERMERO' ? '' : 'md:grid-cols-2'} gap-6`}>
							{role !== 'ENFERMERO' && (
								<>
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
											<option value="CLINICA">Clínica</option>
											<option value="FARMACIA" disabled>
												Farmacia (Próximamente)
											</option>
											<option value="LABORATORIO" disabled>
												Laboratorio (Próximamente)
											</option>
										</select>
									</label>
								</>
							)}

							{/* Si es MEDICO o ENFERMERO no pedimos número de especialistas (es 1 por defecto); para otros roles sí */}
							{(role === 'MEDICO' || role === 'ENFERMERO') ? (
								<div className="md:col-span-1">
									<span className={labelClass}>
										<span className="inline-flex items-center gap-2">
											<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
											</svg>
											Especialistas
										</span>
									</span>
									<div className="mt-2 px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium">{role === 'ENFERMERO' ? 'Enfermero Independiente' : 'Usuario individual — 1 especialista'}</div>
									{role === 'ENFERMERO' && (
										<div className="mt-4">
											<label className="block group">
												<span className={labelClass}>
													<span className="inline-flex items-center gap-2">
														<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
														</svg>
														Número de Licencia / Matricula
													</span>
												</span>
												<input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className={inputClass} placeholder="Ej: MPPS-12345" required />
											</label>
										</div>
									)}
								</div>
							) : (
								<>
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

									{/* --- Field: Sede Count (New) --- */}
									{role === 'ADMIN' && (
										<label className="block group">
											<span className={labelClass}>
												<span className="inline-flex items-center gap-2">
													<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
													Número de sedes o sucursales
													<span className="ml-1 text-[10px] sm:text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
														¿Dónde operas?
													</span>
												</span>
											</span>
											<select
												name="sedeCount"
												value={sedeCount}
												onChange={(e) => setSedeCount(e.target.value)}
												className={selectClass}
											>
												<option value={1}>1 sede (ubicación única)</option>
												<option value={2}>2 sedes</option>
												<option value={3}>3 sedes</option>
												<option value={4}>4 sedes</option>
												<option value="5-10">5 a 10 sedes</option>
												<option value="11+">11 o más sedes (Institucional)</option>
											</select>
											<p className="mt-1.5 text-xs text-indigo-600 flex items-start gap-1.5 bg-indigo-50 p-2 rounded-lg">
												<span className="text-lg leading-none">💡</span>
												<span>Ingresa el <strong>TOTAL de especialistas</strong> sumando TODAS tus sedes en el campo de arriba.<br/>Ej: Sede A (60) + Sede B (30) = 90 especialistas.</span>
											</p>
										</label>
									)}
								</>
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

							<label className={`${role === 'ENFERMERO' ? '' : 'md:col-span-2'} block group`}>
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

						<div className="mt-6 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm animate-in slide-in-from-bottom duration-500">
							<div className="flex items-center gap-2 mb-4">
								<div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
									</svg>
								</div>
								<h4 className="font-bold text-emerald-900">Inversión mensual estimada</h4>
							</div>
							
							<div className="space-y-3">
								<div className="flex justify-between items-center text-sm text-emerald-800">
									<span>Plan seleccionado:</span>
									<span className="font-bold">{recommendedPlan.label}</span>
								</div>
								
								<div className="flex justify-between items-center text-sm">
									<span className="text-emerald-700">Coste por especialista:</span>
									<span className="font-semibold text-emerald-900">€{recommendedPlan.price.toFixed(2)}</span>
								</div>
								
								<div className="flex justify-between items-center text-sm pb-3 border-b border-emerald-200/50">
									<span className="text-emerald-700">Número de profesionales:</span>
									<span className="font-semibold text-emerald-900">{specialistCount}</span>
								</div>
								
								<div className="flex justify-between items-end pt-1">
									<div className="text-xs text-emerald-600 italic">
										{specialistCount} x €{recommendedPlan.price.toFixed(2)}
									</div>
									<div className="text-right">
										<div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Total al mes</div>
										<div className="text-2xl font-black text-emerald-700">
											€{(specialistCount * recommendedPlan.price).toFixed(2)}
										</div>
									</div>
								</div>
							</div>
							
							<p className="mt-4 text-[10px] sm:text-xs text-emerald-700/80 leading-relaxed bg-white/50 p-2 rounded-lg border border-emerald-100">
								* Este es un cálculo base mensual. Podrás elegir pagos trimestrales o anuales con <strong>descuentos de hasta el 30%</strong> en el siguiente paso.
							</p>
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
								<div className="relative">
									<input
										value={identifier}
										onChange={(e) => {
											setIdentifier(e.target.value);
											// Limpiar errores y mensajes cuando el usuario está escribiendo
											if (identifierError) setIdentifierError(null);
											if (identifierHistoryFound) setIdentifierHistoryFound(false);
										}}
										onBlur={(e) => {
											// Verificar cuando el usuario sale del campo
											if (role === 'PACIENTE' && e.target.value.trim().length >= 3) {
												checkIdentifier(e.target.value);
											}
										}}
										className={inputClass}
										required
									/>
									{identifierValidating && (
										<div className="absolute right-3 top-1/2 -translate-y-1/2">
											<svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										</div>
									)}
								</div>
								{identifierError && (
									<p className="mt-1.5 text-xs text-rose-600 flex items-start gap-1.5">
										<svg className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span>{identifierError}</span>
									</p>
								)}
								{identifierHistoryFound && !identifierError && (
									<div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
										<div className="flex items-start gap-2">
											<svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<div className="flex-1">
												<p className="text-sm font-semibold text-blue-900">¡Historial médico encontrado!</p>
												<p className="text-xs text-blue-800 mt-1">Se encontró un historial médico previo asociado a esta cédula. Al completar tu registro, podrás acceder a todas tus consultas, recetas y resultados de laboratorio anteriores.</p>
											</div>
										</div>
									</div>
								)}
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
										Ubicación
									</span>
								</span>
								<p className="mt-1 mb-3 text-xs text-slate-600">Haz clic en el mapa para seleccionar tu ubicación. También puedes escribir la dirección manualmente.</p>
								<LocationMapPicker
									lat={locationLat}
									lng={locationLng}
									address={address}
									onLocationSelect={(lat: number, lng: number) => {
										setLocationLat(lat);
										setLocationLng(lng);
									}}
									onAddressChange={(addr: string) => setAddress(addr)}
									inputClass={inputClass}
								/>
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
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

							{/* Tipo de Sangre */}
							<label className="block group">
								<span className={labelClass}>
									<span className="inline-flex items-center gap-2">
										<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										Tipo de Sangre
									</span>
								</span>
								<select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={selectClass} aria-label="Tipo de sangre">
									<option value="">Seleccionar tipo de sangre</option>
									<option value="A+">A+</option>
									<option value="A-">A-</option>
									<option value="B+">B+</option>
									<option value="B-">B-</option>
									<option value="AB+">AB+</option>
									<option value="AB-">AB-</option>
									<option value="O+">O+</option>
									<option value="O-">O-</option>
									<option value="Desconocido">Desconocido</option>
								</select>
								<p className="mt-1.5 text-xs text-slate-500">Esta información es importante para emergencias médicas</p>
							</label>

							{/* Discapacidad */}
							<div className="block group">
								<label className="flex items-center gap-3 mb-3">
									<input
										type="checkbox"
										checked={hasDisability}
										onChange={(e) => {
											setHasDisability(e.target.checked);
											if (!e.target.checked) {
												setDisability('');
											}
										}}
										className="w-5 h-5 rounded border-2 border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 cursor-pointer"
									/>
									<span className={labelClass}>
										<span className="inline-flex items-center gap-2">
											<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
											</svg>
											¿Tiene alguna discapacidad?
										</span>
									</span>
								</label>
								{hasDisability && (
									<div className="mt-2">
										<label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Descripción de la discapacidad</label>
										<textarea value={disability} onChange={(e) => setDisability(e.target.value)} className={textareaClass} rows={3} placeholder="Describe el tipo de discapacidad y cualquier información relevante para la atención médica..." />
										<p className="mt-1.5 text-xs text-slate-500">Esta información ayuda a los profesionales de la salud a brindar una mejor atención</p>
									</div>
								)}
							</div>

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
						<div className="mb-6">
							<h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
								<span className="w-1 h-6 bg-gradient-to-b from-teal-600 to-cyan-600 rounded-full"></span>
								Selección de Plan
							</h3>
							<p className="text-sm text-slate-600 ml-3">Elige la modalidad que mejor se adapte a tu institución. El sistema calcula automáticamente el plan óptimo basado en tu número de especialistas.</p>
						</div>

						{/* Alerta Informativa */}
						<div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3 items-start">
							<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
								<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div className="text-sm text-blue-800 leading-relaxed">
								<p className="font-bold mb-1">Modelo de Facturación Transparente</p>
								<p>En ASHIRA, el costo se ajusta dinámicamente: mientras más especialistas registres, el precio por cada licencia individual disminuye automáticamente.</p>
							</div>
						</div>

						{role === 'MEDICO' || role === 'ENFERMERO' ? (
							<div className="p-4 sm:p-6 rounded-2xl border-2 border-emerald-600 bg-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div className="flex-1">
									<div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
										Plan Recomendado
									</div>
									<h4 className="text-lg sm:text-xl font-bold text-slate-900">
										{role === 'MEDICO' ? 'Plan Médico — Usuario individual' : 'Plan Enfermería Independiente'}
									</h4>
									<p className="text-sm text-slate-600 mt-1">
										{role === 'MEDICO' 
											? 'Acceso total a la plataforma para médicos independientes con consultorio propio.' 
											: 'Plan diseñado exclusivamente para profesionales de enfermería en el ejercicio independiente.'}
									</p>
								</div>
								<div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[140px]">
									<div className="text-2xl sm:text-3xl font-black text-emerald-600">€{recommendedPlan.price.toFixed(2)}</div>
									<div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">por mes</div>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-slate-700">
								{[
									{ slug: 'clinic-starter', label: 'Starter', range: '2–10 esp.', price: 56.00, desc: 'Consultorios pequeños' },
									{ slug: 'clinic-medium', label: 'Clínica', range: '11–30 esp.', price: 49.00, desc: 'Centros ambulatorios' },
									{ slug: 'clinic-pro', label: 'Pro', range: '31–80 esp.', price: 42.00, desc: 'Clínicas medianas' },
									{ slug: 'clinic-enterprise', label: 'Enterprise', range: '81–200 esp.', price: 35.00, desc: 'Grandes instituciones' },
								].map((p) => {
									const recommended = p.slug === recommendedPlan.slug;
									return (
										<div key={p.slug} className={`relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between ${recommended ? 'border-emerald-500 bg-emerald-50/30 shadow-xl scale-[1.02] ring-4 ring-emerald-50' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'}`}>
											{recommended && (
												<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10 uppercase tracking-widest whitespace-nowrap">
													Tu Plan Ideal
												</span>
											)}

											<div className="mb-4">
												<h4 className={`text-base font-bold ${recommended ? 'text-emerald-900' : 'text-slate-900'}`}>{p.label}</h4>
												<p className="text-[11px] text-slate-500 font-medium">{p.range}</p>
												<p className="text-[10px] text-slate-400 mt-1 italic leading-tight">{p.desc}</p>
											</div>

											<div className="pt-4 border-t border-slate-100">
												<div className="flex flex-col">
													<span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Desde</span>
													<div className="flex items-baseline gap-1">
														<span className={`text-2xl font-black ${recommended ? 'text-emerald-700' : 'text-slate-800'}`}>€{p.price.toFixed(0)}</span>
														<span className="text-[10px] font-semibold text-slate-500">/esp</span>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
						<div className="mt-4">
							<div className="text-xs sm:text-sm font-medium mb-2">Periodicidad</div>
							<select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)} className={selectClass}>
								<option value="monthly">Mensual</option>
								<option value="quarterly">Trimestral — 5% descuento</option>
								<option value="annual">Anual — 15% descuento</option>
							</select>

								{(role as string) !== 'PACIENTE' ? (
									<BillingBreakdown 
										billing={billingPreview} 
										recommendedPlanLabel={recommendedPlan?.label} 
										specialistCount={specialistCount} 
										sedeCount={sedeCount} 
									/>
								) : (
									<div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 mt-6">
										<div className="flex justify-between items-center mb-4">
											<span className="text-sm font-semibold text-slate-500">Plan Seleccionado</span>
											<span className="text-sm font-bold text-teal-700">{recommendedPlan.label}</span>
										</div>
										<p className="text-xs text-slate-400 text-center">Acceso gratuito a la plataforma para pacientes.</p>
									</div>
								)}

									{role === 'MEDICO' && (
										<div className="mt-3 pt-3 border-t border-slate-200">
											<div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
												<span className="font-semibold text-slate-900">Inversión diaria:</span> Si lo visualizas de forma más detallada, estarías invirtiendo <span className="font-bold text-teal-700">€{(((billingPreview as any).monthlyEquivalent || 0) / 20).toFixed(2)}</span> diarios para el uso de nuestro software, <span className="font-semibold text-slate-900">menos que el precio de un café</span>. Una inversión mínima que transforma tu práctica médica y te permite ahorrar hasta 40% del tiempo en cada consulta.
											</div>
										</div>
									)}
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
									<div className="text-xs sm:text-sm text-slate-700">
										<span className="font-semibold">Tipo de Sangre:</span> {bloodType || '—'}
									</div>
									<div className="text-xs sm:text-sm text-slate-700">
										<span className="font-semibold">Discapacidad:</span> {hasDisability ? disability || 'Sí (sin descripción)' : 'No'}
									</div>
									{selectedOrganizationId && (
										<div className="mt-3 pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700">
											<span className="font-semibold">Asociado a clínica:</span> <strong className="text-teal-700">{organizations.find((o) => o.id === selectedOrganizationId)?.name ?? selectedOrganizationId}</strong>
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
								<BillingBreakdown 
									billing={billingPreview} 
									recommendedPlanLabel={recommendedPlan?.label}
									specialistCount={specialistCount}
									sedeCount={sedeCount}
								/>
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
					<a href="/politicas-privacidad" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-medium underline">
						Política de Privacidad
					</a>
					. Los datos médicos se almacenan cifrados y solo son accesibles por los profesionales autorizados.
				</p>
			</div>
		</form>
	);
}
