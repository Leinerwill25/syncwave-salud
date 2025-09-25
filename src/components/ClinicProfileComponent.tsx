'use client';

import React, { useEffect, useState } from 'react';

type ClinicForm = {
	ref?: string;
	rif: string;
	legalName: string;
	tradeName: string;
	entityType: string;

	addressFiscal: string;
	addressOperational: string;
	state: string;
	city: string;
	postalCode: string;

	phone: string;
	whatsapp: string;
	email: string;
	website: string;
	social_facebook: string;
	social_instagram: string;
	social_linkedin: string;

	officesCount: number;
	specialties: string[];
	openingHours: string;
	capacityPerDay: number;
	employeesCount: number;

	directorName: string;
	adminName: string;
	directorId: string;
	sanitaryLicense: string;
	liabilityInsuranceNumber: string;

	bankName: string;
	accountType: string;
	accountNumber: string;
	accountOwner: string;
	currency: string;
	paymentMethods: string[];

	billingSeries: string;
	taxRegime: string;
	billingAddress: string;
};

function cx(...c: Array<string | false | null | undefined>) {
	return c.filter(Boolean).join(' ');
}

function IconSection() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/**
 * InputBase declarado en el scope del módulo y memoizado para que
 * React NO lo remonte en cada render del padre (evita pérdida de foco).
 */
const InputBase = React.memo(function InputBase({ label, name, value, onChange, type = 'text', extra, error }: { label: string; name: string; value: any; onChange: (v: any) => void; type?: string; extra?: React.ReactNode; error?: string | undefined }) {
	return (
		<div>
			<label className="block text-sm font-medium text-slate-700" htmlFor={name}>
				{label}
			</label>
			<input id={name} name={name} type={type} value={value as any} onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} className={cx('mt-1 w-full rounded-lg border bg-white px-4 py-2 shadow-sm placeholder:text-slate-400', 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition')} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} />
			{extra}
			{error && (
				<p id={`${name}-error`} className="mt-1 text-xs text-red-600">
					{error}
				</p>
			)}
		</div>
	);
});

export default function ClinicProfileComponent() {
	const [form, setForm] = useState<ClinicForm>({
		rif: '',
		legalName: '',
		tradeName: '',
		entityType: 'Clínica',

		addressFiscal: '',
		addressOperational: '',
		state: '',
		city: '',
		postalCode: '',

		phone: '',
		whatsapp: '',
		email: '',
		website: '',
		social_facebook: '',
		social_instagram: '',
		social_linkedin: '',

		officesCount: 1,
		specialties: [''],
		openingHours: 'Lun-Vie 08:00-17:00',
		capacityPerDay: 50,
		employeesCount: 10,

		directorName: '',
		adminName: '',
		directorId: '',
		sanitaryLicense: '',
		liabilityInsuranceNumber: '',

		bankName: '',
		accountType: 'Corriente',
		accountNumber: '',
		accountOwner: '',
		currency: 'VES',
		paymentMethods: ['Transferencia'],

		billingSeries: '',
		taxRegime: '',
		billingAddress: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		// cargar datos existentes si aplica (fetch('/api/clinics/me') etc)
		// Ejemplo (descomentar si tienes endpoint):
		// (async () => {
		//   try {
		//     const res = await fetch('/api/clinics/me');
		//     if (res.ok) {
		//       const text = await res.text();
		//       const parsed = text ? JSON.parse(text) : null;
		//       if (parsed?.data) setForm((prev) => ({ ...prev, ...parsed.data }));
		//     }
		//   } catch (e) {
		//     console.warn('No se pudo cargar datos iniciales', e);
		//   }
		// })();
	}, []);

	function updateField<K extends keyof ClinicForm>(key: K, value: ClinicForm[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function validate() {
		const e: Record<string, string> = {};
		if (!form.rif) e.rif = 'RIF es requerido.';
		if (!form.legalName) e.legalName = 'Razón social es requerida.';
		if (!form.addressFiscal) e.addressFiscal = 'Dirección fiscal requerida.';
		if (!form.email) e.email = 'Email requerido.';
		else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Email inválido.';
		if (!form.accountNumber && (form.bankName || form.accountOwner)) e.accountNumber = 'Si registra banco, indique número de cuenta.';
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	// specialties handlers (usar setter funcional)
	function setSpecialty(idx: number, value: string) {
		setForm((prev) => {
			const arr = [...prev.specialties];
			arr[idx] = value;
			return { ...prev, specialties: arr };
		});
	}
	function addSpecialty() {
		setForm((prev) => ({ ...prev, specialties: [...prev.specialties, ''] }));
	}
	function removeSpecialty(idx: number) {
		setForm((prev) => {
			const arr = prev.specialties.filter((_, i) => i !== idx);
			return { ...prev, specialties: arr.length ? arr : [''] };
		});
	}

	function togglePaymentMethod(method: string) {
		setForm((prev) => {
			const setMethods = new Set(prev.paymentMethods);
			if (setMethods.has(method)) setMethods.delete(method);
			else setMethods.add(method);
			return { ...prev, paymentMethods: Array.from(setMethods) };
		});
	}

	function resetFeedback() {
		setErrors({});
		setSuccess(null);
	}

	// función segura que arma un mensaje desde parsed/res
	function buildErrorMessage(parsed: any | null, res?: Response) {
		if (parsed) {
			if (typeof parsed === 'string') return parsed;
			if (parsed.error) return String(parsed.error);
			if (Array.isArray(parsed.errors)) return parsed.errors.join(', ');
			if (typeof parsed.errors === 'object' && parsed.errors !== null) {
				try {
					return Object.entries(parsed.errors)
						.map(([k, v]) => `${k}: ${v}`)
						.join('; ');
				} catch {
					// fallback
				}
			}
			if (parsed.message) return String(parsed.message);
			if (parsed.raw) return String(parsed.raw);
		}
		if (res) {
			if (res.statusText) return res.statusText;
			return `Error ${res.status}`;
		}
		return 'Error desconocido';
	}

	// handleSubmit (reemplaza el existente)
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		resetFeedback();

		// validar en cliente antes de enviar
		if (!validate()) return;

		setSaving(true);
		try {
			// preparar payload (transformaciones necesarias)
			const payloadToSend = {
				rif: form.rif,
				legalName: form.legalName,
				tradeName: form.tradeName || null,
				entityType: form.entityType || null,

				addressFiscal: form.addressFiscal,
				addressOperational: form.addressOperational || null,
				state: form.state || null,
				city: form.city || null,
				postalCode: form.postalCode || null,

				phone: form.phone || null,
				whatsapp: form.whatsapp || null,
				email: form.email,
				website: form.website || null,
				social_facebook: form.social_facebook || null,
				social_instagram: form.social_instagram || null,
				social_linkedin: form.social_linkedin || null,

				officesCount: Number(form.officesCount) || 0,
				specialties: Array.isArray(form.specialties) ? form.specialties.filter(Boolean) : [],
				openingHours: form.openingHours || null,
				capacityPerDay: form.capacityPerDay !== undefined ? Number(form.capacityPerDay) : null,
				employeesCount: form.employeesCount !== undefined ? Number(form.employeesCount) : null,

				directorName: form.directorName || null,
				adminName: form.adminName || null,
				directorId: form.directorId || null,
				sanitaryLicense: form.sanitaryLicense || null,
				liabilityInsuranceNumber: form.liabilityInsuranceNumber || null,

				bankName: form.bankName || null,
				accountType: form.accountType || null,
				accountNumber: form.accountNumber || null,
				accountOwner: form.accountOwner || null,
				currency: form.currency || null,
				paymentMethods: Array.isArray(form.paymentMethods) ? form.paymentMethods : [],

				billingSeries: form.billingSeries || null,
				taxRegime: form.taxRegime || null,
				billingAddress: form.billingAddress || null,
			};

			const res = await fetch('/api/clinic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payloadToSend),
			});

			// Leer UNA vez como texto (res.text()), luego intentar JSON.parse (con fallback)
			const text = await res.text();
			let parsed: any = null;
			if (text) {
				try {
					parsed = JSON.parse(text);
				} catch {
					parsed = { raw: text };
				}
			}

			// --- Manejo de error de la API SIN lanzar excepción ---
			if (!res.ok) {
				// parsed puede tener { errors: [...]} o { error: '...' } u otra forma
				if (parsed) {
					if (Array.isArray(parsed.errors)) {
						// errores globales en array
						setErrors((prev) => ({ ...prev, general: parsed.errors.join(', ') }));
					} else if (typeof parsed.errors === 'object' && parsed.errors !== null) {
						// errores por campo
						setErrors((prev) => ({ ...prev, ...parsed.errors }));
					} else if (parsed.error) {
						setErrors((prev) => ({ ...prev, general: String(parsed.error) }));
					} else if (parsed.raw) {
						setErrors((prev) => ({ ...prev, general: String(parsed.raw) }));
					} else if (parsed.message) {
						setErrors((prev) => ({ ...prev, general: String(parsed.message) }));
					} else {
						// fallback con statusText o status
						setErrors((prev) => ({ ...prev, general: buildErrorMessage(parsed, res) }));
					}
				} else {
					setErrors((prev) => ({ ...prev, general: buildErrorMessage(parsed, res) }));
				}
				// Retornamos temprano: no continuamos con "éxito"
				return;
			}

			// --- Éxito ---
			setSuccess('Perfil guardado correctamente');

			// Si la API devuelve datos útiles, opcionalmente actualizamos el form
			if (parsed && parsed.data && typeof parsed.data === 'object') {
				const allowedKeys = Object.keys(form) as Array<keyof ClinicForm>;
				const updated: Partial<ClinicForm> = {};
				for (const k of allowedKeys) {
					if (k in parsed.data) {
						updated[k] = parsed.data[k];
					}
				}
				if (Object.keys(updated).length) {
					setForm((prev) => ({ ...prev, ...updated }));
				}
			}
		} catch (err: any) {
			console.error('handleSubmit error ->', err);
			// errores inesperados (network, JSON parse, etc.)
			setErrors((prev) => ({ ...prev, general: err?.message || String(err) }));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 py-8">
			<div className="max-w-6xl mx-auto px-4">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">Perfil de la Clínica</h1>
						<p className="text-sm text-slate-500 mt-1">Información corporativa y de facturación — mantenla actualizada para tus reportes y pagos.</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-right">
							<p className="text-xs text-slate-500">Última edición</p>
							<p className="text-sm font-medium text-slate-700">— hoy —</p>
						</div>
						<div className="rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 p-0.5 shadow-lg">
							<div className="bg-white rounded-full px-3 py-2 text-sm font-medium text-slate-800">Guardar</div>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
					{/* main form */}
					<div className="lg:col-span-2 space-y-5">
						{/* Identificación legal */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-sky-50 text-sky-600">
									<IconSection />
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Identificación legal</h3>
									<p className="text-sm text-slate-500">Datos oficiales para facturación y contratos.</p>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								<InputBase name="rif" label="RIF / NIT" value={form.rif} onChange={(v) => updateField('rif', v)} error={errors.rif} />
								<InputBase name="legalName" label="Razón social" value={form.legalName} onChange={(v) => updateField('legalName', v)} error={errors.legalName} />
								<InputBase name="tradeName" label="Nombre comercial" value={form.tradeName} onChange={(v) => updateField('tradeName', v)} />
								<div className="sm:col-span-2 lg:col-span-3">
									<label className="block text-sm font-medium text-slate-700" htmlFor="entityType">
										Tipo de entidad
									</label>
									<select id="entityType" name="entityType" value={form.entityType} onChange={(e) => updateField('entityType', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
										<option>Clínica</option>
										<option>Centro Médico</option>
										<option>Consultorio</option>
										<option>Hospital</option>
										<option>Laboratorio</option>
									</select>
								</div>
							</div>
						</section>

						{/* Ubicación */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
										<path d="M12 2C8 2 5 5 5 9c0 6 7 11 7 11s7-5 7-11c0-4-3-7-7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Ubicación</h3>
									<p className="text-sm text-slate-500">Direcciones y datos geográficos.</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<InputBase name="addressFiscal" label="Dirección fiscal" value={form.addressFiscal} onChange={(v) => updateField('addressFiscal', v)} error={errors.addressFiscal} />
								<InputBase name="addressOperational" label="Dirección operativa" value={form.addressOperational} onChange={(v) => updateField('addressOperational', v)} />
								<InputBase name="state" label="Estado / Provincia" value={form.state} onChange={(v) => updateField('state', v)} />
								<InputBase name="city" label="Ciudad / Municipio" value={form.city} onChange={(v) => updateField('city', v)} />
								<InputBase name="postalCode" label="Código postal" value={form.postalCode} onChange={(v) => updateField('postalCode', v)} />
							</div>
						</section>

						{/* Contacto */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-amber-50 text-amber-600">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
										<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
										<path d="M7 10a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Contacto</h3>
									<p className="text-sm text-slate-500">Teléfonos, email y redes sociales.</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<InputBase name="phone" label="Teléfono fijo" value={form.phone} onChange={(v) => updateField('phone', v)} />
								<InputBase name="whatsapp" label="Teléfono / WhatsApp" value={form.whatsapp} onChange={(v) => updateField('whatsapp', v)} />
								<InputBase name="email" label="Correo electrónico" value={form.email} onChange={(v) => updateField('email', v)} error={errors.email} />
								<div className="md:col-span-3">
									<InputBase name="website" label="Página web" value={form.website} onChange={(v) => updateField('website', v)} />
								</div>
								<div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
									<InputBase name="social_facebook" label="Facebook" value={form.social_facebook} onChange={(v) => updateField('social_facebook', v)} />
									<InputBase name="social_instagram" label="Instagram" value={form.social_instagram} onChange={(v) => updateField('social_instagram', v)} />
									<InputBase name="social_linkedin" label="LinkedIn" value={form.social_linkedin} onChange={(v) => updateField('social_linkedin', v)} />
								</div>
							</div>
						</section>

						{/* Operativos */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-violet-50 text-violet-600">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
										<path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Datos operativos</h3>
									<p className="text-sm text-slate-500">Capacidad, especialidades y horarios.</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<InputBase name="officesCount" label="Cantidad de consultorios" value={form.officesCount} onChange={(v) => updateField('officesCount', v as any)} type="number" />
								<InputBase name="capacityPerDay" label="Capacidad diaria (pacientes)" value={form.capacityPerDay} onChange={(v) => updateField('capacityPerDay', v as any)} type="number" />
								<InputBase name="employeesCount" label="Número de empleados / médicos" value={form.employeesCount} onChange={(v) => updateField('employeesCount', v as any)} type="number" />

								<div className="md:col-span-3">
									<label className="block text-sm font-medium text-slate-700">Especialidades</label>
									<div className="space-y-2 mt-2">
										{form.specialties.map((s, idx) => (
											<div key={idx} className="flex gap-3 items-center">
												<input id={`specialty-${idx}`} name={`specialty-${idx}`} value={s} onChange={(e) => setSpecialty(idx, e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 shadow-sm" placeholder="Ej: Pediatría" />
												<button type="button" onClick={() => removeSpecialty(idx)} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border border-red-100 hover:shadow-sm transition" aria-label={`Eliminar especialidad ${idx + 1}`}>
													Eliminar
												</button>
											</div>
										))}
										<div className="mt-2">
											<button type="button" onClick={addSpecialty} className="px-4 py-2 rounded-md bg-emerald-600 text-white shadow-sm hover:scale-[1.02] transition">
												Agregar especialidad
											</button>
										</div>
									</div>
								</div>

								<div className="md:col-span-3">
									<InputBase name="openingHours" label="Horarios de atención (texto)" value={form.openingHours} onChange={(v) => updateField('openingHours', v)} />
								</div>
							</div>
						</section>

						{/* Administrativos */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-pink-50 text-pink-600">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
										<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 20a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Información administrativa</h3>
									<p className="text-sm text-slate-500">Responsables y licencias.</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<InputBase name="directorName" label="Director médico / representante legal" value={form.directorName} onChange={(v) => updateField('directorName', v)} />
								<InputBase name="adminName" label="Administrador / contacto administrativo" value={form.adminName} onChange={(v) => updateField('adminName', v)} />
								<InputBase name="directorId" label="Cédula / Documento de identidad" value={form.directorId} onChange={(v) => updateField('directorId', v)} />
								<InputBase name="sanitaryLicense" label="Licencia sanitaria (número o archivo)" value={form.sanitaryLicense} onChange={(v) => updateField('sanitaryLicense', v)} />
								<InputBase name="liabilityInsuranceNumber" label="Nº seguro responsabilidad civil" value={form.liabilityInsuranceNumber} onChange={(v) => updateField('liabilityInsuranceNumber', v)} />
							</div>
						</section>

						{/* Facturación y pagos */}
						<section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center gap-3 mb-4">
								<span className="p-2 rounded-lg bg-slate-50 text-slate-700">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
										<path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
										<rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" />
									</svg>
								</span>
								<div>
									<h3 className="font-semibold text-slate-800">Facturación y pagos</h3>
									<p className="text-sm text-slate-500">Cuentas bancarias y métodos de cobro.</p>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<InputBase name="bankName" label="Banco" value={form.bankName} onChange={(v) => updateField('bankName', v)} />
								<div>
									<label className="block text-sm font-medium text-slate-700" htmlFor="accountType">
										Tipo de cuenta
									</label>
									<select id="accountType" name="accountType" value={form.accountType} onChange={(e) => updateField('accountType', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
										<option>Corriente</option>
										<option>Ahorro</option>
									</select>
								</div>
								<InputBase name="accountNumber" label="Número de cuenta" value={form.accountNumber} onChange={(v) => updateField('accountNumber', v)} error={errors.accountNumber} />
								<InputBase name="accountOwner" label="Titular de la cuenta" value={form.accountOwner} onChange={(v) => updateField('accountOwner', v)} />

								<div>
									<label className="block text-sm font-medium text-slate-700" htmlFor="currency">
										Moneda principal
									</label>
									<select id="currency" name="currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
										<option>VES</option>
										<option>USD</option>
										<option>EUR</option>
									</select>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-slate-700">Métodos de pago aceptados</label>
									<div className="flex gap-3 mt-2 flex-wrap">
										{['Transferencia', 'Tarjeta', 'Efectivo', 'Pago móvil'].map((m) => {
											const active = form.paymentMethods.includes(m);
											return (
												<button key={m} type="button" onClick={() => togglePaymentMethod(m)} className={cx('flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition', active ? 'bg-sky-600 text-white border-transparent shadow' : 'bg-white text-slate-700 border-slate-200 hover:shadow-sm')} aria-pressed={active}>
													{m}
												</button>
											);
										})}
									</div>
								</div>

								<InputBase name="billingSeries" label="Serie de facturación" value={form.billingSeries} onChange={(v) => updateField('billingSeries', v)} />
								<InputBase name="taxRegime" label="Régimen fiscal / IVA / ISLR" value={form.taxRegime} onChange={(v) => updateField('taxRegime', v)} />
								<div className="md:col-span-2">
									<InputBase name="billingAddress" label="Dirección fiscal (si difiere)" value={form.billingAddress} onChange={(v) => updateField('billingAddress', v)} />
								</div>
							</div>
						</section>
					</div>

					{/* right summary / actions */}
					<aside className="space-y-5 w-full sm:w-50 lg:w-66">
						<div
							className="sticky bg-white border border-slate-100 rounded-2xl p-4 shadow-sm max-w-full"
							style={{
								top: 'calc(var(--navbar-height, 64px) + 1.5rem)',
								transition: 'top 160ms ease',
								zIndex: 40,
							}}>
							<div className="flex items-start justify-between">
								<div>
									<p className="text-xs text-slate-500">Estado</p>
									<p className="text-sm font-medium text-emerald-600">Completado parcialmente</p>
								</div>
								<div>
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-sky-50 text-sky-600 border">Perfil</span>
								</div>
							</div>

							<hr className="my-3" />
							<div className="text-sm text-slate-600">
								<p className="mb-2">Asegúrate de completar los datos fiscales y bancarios para evitar retrasos en pagos.</p>
								<ul className="list-disc pl-4 space-y-1">
									<li>Verifica RIF y Razón social</li>
									<li>Sube licencia sanitaria si aplica</li>
									<li>Confirma métodos de pago</li>
								</ul>
							</div>

							{errors.general && <p className="text-sm text-red-600 mb-2">{errors.general}</p>}
							{success && <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded">{success}</div>}

							<div className="flex flex-col sm:flex-row gap-3 mt-3">
								<button type="submit" disabled={saving} className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg shadow hover:scale-[1.01] transition disabled:opacity-60">
									{saving ? 'Guardando...' : 'Guardar perfil'}
								</button>
								<button
									type="button"
									onClick={() => {
										// cancelar sólo limpia feedback y deja el form como estaba
										resetFeedback();
									}}
									className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg">
									Cancelar
								</button>
							</div>
						</div>
					</aside>
				</form>
			</div>
		</div>
	);
}
