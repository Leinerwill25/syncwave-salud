// components/ClinicProfileComponent.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
    ShieldCheck, 
    MapPin, 
    Phone, 
    Building2, 
    UserCircle2, 
    CreditCard, 
    ExternalLink, 
    Save, 
    X, 
    ChevronRight, 
    Globe, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    Facebook,
    Instagram,
    Linkedin,
    Plus,
    Trash2,
    Eye,
    CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

type ClinicForm = {
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
	capacityPerDay: number | null;
	employeesCount: number | null;

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

// --- Helpers ---
function cx(...c: Array<string | false | null | undefined>) {
	return c.filter(Boolean).join(' ');
}

function safeParseArrayField(v: any): string[] {
	if (v == null) return [];
	if (Array.isArray(v)) return v.map(String);
	if (typeof v === 'string') {
		const t = v.trim();
		if (!t) return [];
		try {
			const parsed = JSON.parse(t);
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			return t.split(',').map((s) => s.trim()).filter(Boolean);
		}
	}
	try {
		return [String(v)];
	} catch {
		return [];
	}
}

// --- Components ---
const InputField = React.memo(({ label, name, value, onChange, type = 'text', placeholder, icon: Icon, error }: { label: string; name: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string; icon?: any; error?: string }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1" htmlFor={name}>
            {label}
        </label>
        <div className="relative group">
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Icon size={18} />
                </div>
            )}
            <input
                id={name}
                name={name}
                type={type}
                value={value ?? ''}
                placeholder={placeholder}
                onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                className={cx(
                    "w-full bg-white border border-slate-200 rounded-xl py-2.5 transition-all outline-none",
                    Icon ? "pl-10 pr-4" : "px-4",
                    error ? "border-red-300 ring-2 ring-red-50" : "focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50",
                    "text-slate-700 placeholder:text-slate-400 font-medium"
                )}
            />
        </div>
        {error && <p className="text-[11px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
    </div>
));

export default function ClinicProfileComponent() {
    const [activeTab, setActiveTab] = useState('general');
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
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
		capacityPerDay: null,
		employeesCount: null,
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
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/clinic-profile');
			const data = await res.json();
			if (data?.ok && data?.profile) {
				const p = data.profile;
				setForm({
					rif: p.legalRif ?? p.rif ?? '',
					legalName: p.legalName ?? '',
					tradeName: p.tradeName ?? '',
					entityType: p.entityType ?? 'Clínica',
					addressFiscal: p.addressFiscal ?? '',
					addressOperational: p.addressOperational ?? '',
					state: p.stateProvince ?? p.state ?? '',
					city: p.cityMunicipality ?? p.city ?? '',
					postalCode: p.postalCode ?? '',
					phone: p.phoneFixed ?? p.phone ?? '',
					whatsapp: p.phoneMobile ?? p.whatsapp ?? '',
					email: p.contactEmail ?? p.email ?? '',
					website: p.website ?? '',
					social_facebook: p.socialFacebook ?? p.social_facebook ?? '',
					social_instagram: p.socialInstagram ?? p.social_instagram ?? '',
					social_linkedin: p.socialLinkedin ?? p.social_linkedin ?? '',
					officesCount: Number(p.officesCount) || 0,
					specialties: safeParseArrayField(p.specialties).length ? safeParseArrayField(p.specialties) : [''],
					openingHours: (typeof p.openingHours === 'string' ? p.openingHours : JSON.stringify(p.openingHours ?? '') || '') as string,
					capacityPerDay: p.capacityPerDay == null ? null : Number(p.capacityPerDay),
					employeesCount: p.employeesCount == null ? null : Number(p.employeesCount),
					directorName: p.directorName ?? '',
					adminName: p.adminName ?? '',
					directorId: p.directorIdNumber ?? p.directorId ?? '',
					sanitaryLicense: p.sanitaryLicense ?? '',
					liabilityInsuranceNumber: p.liabilityInsuranceNumber ?? '',
					bankName: p.bankName ?? '',
					accountType: p.bankAccountType ?? p.accountType ?? 'Corriente',
					accountNumber: p.bankAccountNumber ?? p.accountNumber ?? '',
					accountOwner: p.bankAccountOwner ?? p.accountOwner ?? '',
					currency: p.currency ?? 'VES',
					paymentMethods: safeParseArrayField(p.paymentMethods),
					billingSeries: p.billingSeries ?? '',
					taxRegime: p.taxRegime ?? '',
					billingAddress: p.billingAddress ?? '',
				});
			}
		} catch (err) {
			console.error('Error loading clinic profile:', err);
		} finally {
			setLoading(false);
		}
	};

    const completionStats = useMemo(() => {
        const criticalFields = ['rif', 'legalName', 'addressFiscal', 'email', 'phone', 'bankName', 'accountNumber'];
        const filled = criticalFields.filter(f => !!form[f as keyof ClinicForm]).length;
        const total = criticalFields.length;
        return { percentage: Math.round((filled / total) * 100), filled, total };
    }, [form]);

	const updateField = (key: keyof ClinicForm, value: any) => {
		setForm(prev => ({ ...prev, [key]: value }));
		if (errors[key]) {
			const newErrors = { ...errors };
			delete newErrors[key];
			setErrors(newErrors);
		}
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
        const eObj: Record<string, string> = {};
		if (!form.rif) eObj.rif = 'Requerido';
		if (!form.legalName) eObj.legalName = 'Requerido';
		if (!form.email) eObj.email = 'Requerido';

        if (Object.keys(eObj).length > 0) {
            setErrors(eObj);
            toast.error('Corrige los errores antes de continuar');
            return;
        }

		setSaving(true);
		try {
			const res = await fetch('/api/clinic-profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
                    legalRif: form.rif,
                    legalName: form.legalName,
                    tradeName: form.tradeName,
                    entityType: form.entityType,
                    addressFiscal: form.addressFiscal,
                    addressOperational: form.addressOperational,
                    stateProvince: form.state,
                    cityMunicipality: form.city,
                    postalCode: form.postalCode,
                    phoneFixed: form.phone,
                    phoneMobile: form.whatsapp,
                    contactEmail: form.email,
                    website: form.website,
                    socialFacebook: form.social_facebook,
                    socialInstagram: form.social_instagram,
                    socialLinkedin: form.social_linkedin,
                    officesCount: form.officesCount,
                    specialties: form.specialties.filter(Boolean),
                    openingHours: form.openingHours,
                    capacityPerDay: form.capacityPerDay,
                    employeesCount: form.employeesCount,
                    directorName: form.directorName,
                    adminName: form.adminName,
                    directorIdNumber: form.directorId,
                    sanitaryLicense: form.sanitaryLicense,
                    liabilityInsuranceNumber: form.liabilityInsuranceNumber,
                    bankName: form.bankName,
                    bankAccountType: form.accountType,
                    bankAccountNumber: form.accountNumber,
                    bankAccountOwner: form.accountOwner,
                    currency: form.currency,
                    paymentMethods: form.paymentMethods,
                    billingSeries: form.billingSeries,
                    taxRegime: form.taxRegime,
                    billingAddress: form.billingAddress,
                }),
			});

			if (res.ok) {
				toast.success('Pefil corporativo actualizado');
                await loadProfile();
			} else {
                throw new Error('Error al guardar');
            }
		} catch (err) {
			toast.error('Ocurrió un error al guardar los cambios');
		} finally {
			setSaving(false);
		}
	};

    const tabs = [
        { id: 'general', label: 'Legal & Fiscal', icon: ShieldCheck },
        { id: 'location', label: 'Ubicación', icon: MapPin },
        { id: 'contact', label: 'Contacto', icon: Phone },
        { id: 'ops', label: 'Operación', icon: Building2 },
        { id: 'admin', label: 'Directiva', icon: UserCircle2 },
        { id: 'billing', label: 'Pagos & Facturas', icon: CreditCard },
    ];

	if (loading) {
		return (
			<div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
				<div className="text-slate-400 font-medium animate-pulse">Sincronizando datos corporativos...</div>
			</div>
		);
	}

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- HEADER SECCTION --- */}
			<div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent -rotate-12 translate-x-1/4"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                <Building2 size={32} className="text-indigo-300" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                                    {form.tradeName || form.legalName || 'Perfil de Clínica'}
                                </h1>
                                <p className="text-indigo-200/70 font-medium">{form.entityType || 'Entidad de Salud'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center text-sm">
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                <CheckCircle2 size={14} className="text-emerald-400" />
                                <span className="text-slate-300">ID: {form.rif || 'NIT Pendiente'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-slate-300">
                                <Clock size={14} />
                                <span>Verificado hasta 2026</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:block text-right">
                            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-1">Integridad del Perfil</p>
                            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-1000"
                                    style={{ width: `${completionStats.percentage}%` }}
                                ></div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">{completionStats.percentage}% completado</p>
                        </div>
                        <button 
                            onClick={() => handleSubmit()}
                            disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Guardando...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Save size={18} /> Actualizar Perfil</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MIDDLE SECTION: TABS & FORM --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1 space-y-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setViewMode('edit'); }}
                                className={cx(
                                    "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold transition-all group relative overflow-hidden",
                                    active 
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" 
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                )}
                            >
                                {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full"></div>}
                                <Icon size={20} className={active ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-400"} />
                                <span>{tab.label}</span>
                                <ChevronRight size={16} className={cx("ml-auto transition-transform", active ? "rotate-90 text-indigo-400" : "opacity-0 group-hover:opacity-100")} />
                            </button>
                        );
                    })}
                    
                    <div className="pt-4 px-2">
                        <button 
                            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                            className={cx(
                                "w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed transition-all font-bold",
                                viewMode === 'preview' 
                                    ? "bg-violet-50 border-violet-200 text-violet-700" 
                                    : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30"
                            )}
                        >
                            {viewMode === 'preview' ? <X size={18} /> : <Eye size={18} />}
                            {viewMode === 'preview' ? 'Cerrar Vista Previa' : 'Vista Previa Ejecutiva'}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-10 min-h-[600px]">
                        {viewMode === 'edit' ? (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                {/* TAB: GENERAL */}
                                {activeTab === 'general' && (
                                    <div className="space-y-8">
                                        <SectionHeader 
                                            title="Identificación Legal" 
                                            subtitle="Información fiscal y razón social registrada ante los entes gubernamentales."
                                            icon={ShieldCheck}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField label="RIF / Identificación Fiscal" name="rif" value={form.rif} onChange={v => updateField('rif', v)} placeholder="J-12345678-0" error={errors.rif} icon={CheckCircle2} />
                                            <InputField label="Nombre de la Institución" name="legalName" value={form.legalName} onChange={v => updateField('legalName', v)} placeholder="Hospital Metropolitano S.A." error={errors.legalName} icon={Building2} />
                                            <InputField label="Marca / Nombre Comercial" name="tradeName" value={form.tradeName} onChange={v => updateField('tradeName', v)} placeholder="Clínica Salud Total" icon={ExternalLink} />
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Tipo de Entidad</label>
                                                <select 
                                                    value={form.entityType} 
                                                    onChange={e => updateField('entityType', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-slate-700 font-medium transition-all"
                                                >
                                                    <option>Clínica</option>
                                                    <option>Hospital</option>
                                                    <option>Centro Médico</option>
                                                    <option>Laboratorio</option>
                                                    <option>Consultorio Privado</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: LOCATION */}
                                {activeTab === 'location' && (
                                    <div className="space-y-8">
                                        <SectionHeader 
                                            title="Distribución Geográfica" 
                                            subtitle="Defina las direcciones físicas de operación y facturación."
                                            icon={MapPin}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <InputField label="Dirección Fiscal Principal" name="addressFiscal" value={form.addressFiscal} onChange={v => updateField('addressFiscal', v)} placeholder="Avenida Principal, Edificio Torre Azul, Piso 5" icon={ShieldCheck} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <InputField label="Dirección Operativa (Sede)" name="addressOperational" value={form.addressOperational} onChange={v => updateField('addressOperational', v)} placeholder="Si es diferente a la fiscal" icon={MapPin} />
                                            </div>
                                            <InputField label="Estado / Región" name="state" value={form.state} onChange={v => updateField('state', v)} icon={Globe} />
                                            <InputField label="Ciudad / Municipio" name="city" value={form.city} onChange={v => updateField('city', v)} />
                                            <InputField label="Código Postal" name="postalCode" value={form.postalCode} onChange={v => updateField('postalCode', v)} />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CONTACT */}
                                {activeTab === 'contact' && (
                                    <div className="space-y-8">
                                        <SectionHeader 
                                            title="Canales de Contacto" 
                                            subtitle="Gestione cómo sus pacientes y proveedores se comunican con la clínica."
                                            icon={Phone}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <InputField label="Teléfono Central" name="phone" value={form.phone} onChange={v => updateField('phone', v)} placeholder="+58 212-0000000" icon={Phone} />
                                            <InputField label="WhatsApp Corporativo" name="whatsapp" value={form.whatsapp} onChange={v => updateField('whatsapp', v)} placeholder="+58 412-0000000" icon={Phone} />
                                            <InputField label="Email de Enlace" name="email" value={form.email} onChange={v => updateField('email', v)} placeholder="contacto@clinica.com" error={errors.email} icon={Globe} />
                                            
                                            <div className="md:col-span-3">
                                                <InputField label="Sitio Web Profesional" name="website" value={form.website} onChange={v => updateField('website', v)} placeholder="https://www.tuclinica.com" icon={ExternalLink} />
                                            </div>

                                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                                <InputField label="Facebook" name="social_facebook" value={form.social_facebook} onChange={v => updateField('social_facebook', v)} icon={Facebook} />
                                                <InputField label="Instagram" name="social_instagram" value={form.social_instagram} onChange={v => updateField('social_instagram', v)} icon={Instagram} />
                                                <InputField label="LinkedIn" name="social_linkedin" value={form.social_linkedin} onChange={v => updateField('social_linkedin', v)} icon={Linkedin} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: OPS */}
                                {activeTab === 'ops' && (
                                    <div className="space-y-10">
                                        <SectionHeader 
                                            title="Infraestructura & Especialidades" 
                                            subtitle="Capacidad operativa y servicios médicos ofrecidos."
                                            icon={Building2}
                                        />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <InputField label="Total Consultorios" name="officesCount" type="number" value={form.officesCount} onChange={v => updateField('officesCount', v)} icon={Building2} />
                                            <InputField label="Capacidad Diaria" name="capacityPerDay" type="number" value={form.capacityPerDay} onChange={v => updateField('capacityPerDay', v)} icon={UserCircle2} />
                                            <InputField label="Nº de Empleados" name="employeesCount" type="number" value={form.employeesCount} onChange={v => updateField('employeesCount', v)} />
                                        </div>

                                        <div className="space-y-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">Catálogo de Especialidades</h3>
                                                        <p className="text-sm text-slate-500">Gestione las ramas médicas que ofrece su institución.</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateField('specialties', [...form.specialties, ''])}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-indigo-100 font-semibold text-sm"
                                                    >
                                                        <Plus size={18} />
                                                        Añadir Especialidad
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {form.specialties.map((spec, idx) => (
                                                        <div key={idx} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all shadow-sm">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
                                                                    <Building2 size={18} />
                                                                </div>
                                                                <input 
                                                                    value={spec} 
                                                                    onChange={e => {
                                                                        const nArr = [...form.specialties];
                                                                        nArr[idx] = e.target.value;
                                                                        updateField('specialties', nArr);
                                                                    }}
                                                                    placeholder="Ej: Cardiología"
                                                                    className="flex-1 bg-transparent border-none outline-none font-semibold text-slate-700 placeholder:text-slate-400 text-sm"
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const nArr = form.specialties.filter((_, i) => i !== idx);
                                                                        updateField('specialties', nArr.length ? nArr : ['']);
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* HORARIOS DE ATENCIÓN ESTRUCTURADOS */}
                                            <div className="space-y-6 pt-10 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">Horarios de Atención</h3>
                                                        <p className="text-sm text-slate-500">Defina las ventanas de operación diarias.</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const current = safeParseArrayField(form.openingHours);
                                                            const newHours = [...current, { days: '', hours: '' }];
                                                            updateField('openingHours', JSON.stringify(newHours));
                                                        }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-semibold text-sm"
                                                    >
                                                        <Plus size={18} />
                                                        Nuevo Bloque
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {safeParseArrayField(form.openingHours).map((item: any, idx: number) => {
                                                        const schedule = typeof item === 'object' ? item : { days: item, hours: '' };
                                                        return (
                                                            <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 animate-in fade-in duration-300">
                                                                <div className="flex-1 w-full space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Días de Atención</label>
                                                                    <div className="relative">
                                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                                            <CalendarDays size={18} />
                                                                        </div>
                                                                        <input 
                                                                            value={schedule.days || ''} 
                                                                            placeholder="Ej: Lunes a Viernes"
                                                                            onChange={e => {
                                                                                const current = safeParseArrayField(form.openingHours);
                                                                                current[idx] = { ...schedule, days: e.target.value };
                                                                                updateField('openingHours', JSON.stringify(current));
                                                                            }}
                                                                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-semibold text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 w-full space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bloque Horario</label>
                                                                    <div className="relative">
                                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                                            <Clock size={18} />
                                                                        </div>
                                                                        <input 
                                                                            value={schedule.hours || ''} 
                                                                            placeholder="Ej: 08:00 AM - 05:00 PM"
                                                                            onChange={e => {
                                                                                const current = safeParseArrayField(form.openingHours);
                                                                                current[idx] = { ...schedule, hours: e.target.value };
                                                                                updateField('openingHours', JSON.stringify(current));
                                                                            }}
                                                                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-semibold text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const current = safeParseArrayField(form.openingHours).filter((_, i) => i !== idx);
                                                                        updateField('openingHours', JSON.stringify(current));
                                                                    }}
                                                                    className="h-11 w-11 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-100 rounded-xl transition-all shadow-sm mb-0.5"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    {safeParseArrayField(form.openingHours).length === 0 && (
                                                        <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                                                <Clock size={32} />
                                                            </div>
                                                            <h4 className="font-bold text-slate-800">Sin horarios definidos</h4>
                                                            <p className="text-sm text-slate-500 max-w-[240px] mt-1">Defina el horario de atención central de la clínica.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: ADMIN */}
                                {activeTab === 'admin' && (
                                    <div className="space-y-8">
                                        <SectionHeader 
                                            title="Cuerpo Directivo & Licencias" 
                                            subtitle="Representantes autorizados y credenciales sanitarias."
                                            icon={UserCircle2}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <InputField label="Director Médico" name="directorName" value={form.directorName} onChange={v => updateField('directorName', v)} icon={UserCircle2} />
                                                <InputField label="Administrador / Gerente" name="adminName" value={form.adminName} onChange={v => updateField('adminName', v)} />
                                                <InputField label="Doc. Identidad Director" name="directorId" value={form.directorId} onChange={v => updateField('directorId', v)} />
                                            </div>
                                            <div className="p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 space-y-6">
                                                <InputField label="Nº Licencia Sanitaria" name="sanitaryLicense" value={form.sanitaryLicense} onChange={v => updateField('sanitaryLicense', v)} icon={ShieldCheck} />
                                                <InputField label="Nº Seguro Civil" name="liabilityInsuranceNumber" value={form.liabilityInsuranceNumber} onChange={v => updateField('liabilityInsuranceNumber', v)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: BILLING */}
                                {activeTab === 'billing' && (
                                    <div className="space-y-10">
                                        <SectionHeader 
                                            title="Facturación & Cobros" 
                                            subtitle="Métodos de pago aceptados y datos para liquidación."
                                            icon={CreditCard}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {/* Bank Side */}
                                            <div className="md:col-span-2 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <InputField label="Entidad Bancaria" name="bankName" value={form.bankName} onChange={v => updateField('bankName', v)} icon={Building2} />
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Tipo de Cuenta</label>
                                                        <select 
                                                            value={form.accountType} 
                                                            onChange={e => updateField('accountType', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-slate-700 font-medium transition-all"
                                                        >
                                                            <option>Corriente</option>
                                                            <option>Ahorro</option>
                                                            <option>Custodia</option>
                                                            <option>Internacional</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <InputField label="Número de Cuenta (20 dígitos)" name="accountNumber" value={form.accountNumber} onChange={v => updateField('accountNumber', v)} placeholder="0102 0000 00 0000000000" />
                                                <InputField label="Titular de la Cuenta" name="accountOwner" value={form.accountOwner} onChange={v => updateField('accountOwner', v)} />
                                            </div>

                                            {/* Config Side */}
                                            <div className="bg-slate-50 p-6 rounded-[2rem] space-y-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Moneda Operativa</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['VES', 'USD', 'EUR'].map(cur => (
                                                            <button 
                                                                key={cur} 
                                                                type="button" 
                                                                onClick={() => updateField('currency', cur)}
                                                                className={cx(
                                                                    "py-2 px-1 rounded-xl font-bold text-sm transition-all border",
                                                                    form.currency === cur ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                                                )}
                                                            >
                                                                {cur}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Métodos de Cobro</label>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {['Transferencia', 'Tarjeta / POS', 'Efectivo', 'Pago Móvil'].map(method => {
                                                            const active = form.paymentMethods.includes(method);
                                                            return (
                                                                <button
                                                                    key={method}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nArr = active 
                                                                            ? form.paymentMethods.filter(m => m !== method)
                                                                            : [...form.paymentMethods, method];
                                                                        updateField('paymentMethods', nArr);
                                                                    }}
                                                                    className={cx(
                                                                        "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-semibold",
                                                                        active ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    {method}
                                                                    {active && <CheckCircle2 size={16} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InputField label="Serie de Facturación" name="billingSeries" value={form.billingSeries} onChange={v => updateField('billingSeries', v)} placeholder="Ej: CLIN-2026" />
                                            <InputField label="Régimen Fiscal / Contribuyente" name="taxRegime" value={form.taxRegime} onChange={v => updateField('taxRegime', v)} placeholder="Contribuyente Especial" />
                                            <div className="md:col-span-2">
                                                <InputField label="Dirección Fiscal para Facturas (si difiere)" name="billingAddress" value={form.billingAddress} onChange={v => updateField('billingAddress', v)} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PreviewPanel form={form} />
                        )}
                    </div>
                </div>
            </div>
		</div>
	);
}

// --- Internal Support Components ---
function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) {
    return (
        <div className="flex items-start gap-4 pb-6 border-b border-slate-50">
            <div className="p-3 bg-indigo-50 rounded-2xl shrink-0 text-indigo-600">
                <Icon size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                <p className="text-slate-500 font-medium">{subtitle}</p>
            </div>
        </div>
    );
}

function PreviewPanel({ form }: { form: ClinicForm }) {
    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 overflow-hidden relative min-h-[600px] flex flex-col">
            <div className="absolute top-0 right-0 p-4">
                 <div className="px-4 py-1.5 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg">
                    Vista Ejecutiva
                 </div>
            </div>

            <div className="flex-1 max-w-2xl mx-auto w-full space-y-10 py-10">
                {/* Brand Card */}
                <div className="text-center space-y-4">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-slate-900 via-indigo-900 to-slate-900 rounded-[2.5rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl ring-4 ring-indigo-50">
                        {form.tradeName?.slice(0,1) || 'C'}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{form.tradeName || 'Centro de Salud'}</h2>
                        <p className="text-indigo-600 font-bold tracking-widest uppercase text-xs mt-1">{form.legalName}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                        <MapPin size={16} /> <span>{form.city}, {form.state}</span>
                    </div>
                </div>

                {/* Facts Grid */}
                <div className="grid grid-cols-3 gap-px bg-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                    {[
                        { label: 'Sedes', value: form.officesCount },
                        { label: 'Especialidades', value: form.specialties.filter(Boolean).length },
                        { label: 'Capacidad/Día', value: form.capacityPerDay || '—' }
                    ].map((idx, i) => (
                        <div key={i} className="bg-white p-6 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{idx.label}</p>
                            <p className="text-2xl font-black text-slate-800">{idx.value}</p>
                        </div>
                    ))}
                </div>

                {/* Content Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    <div className="space-y-6">
                        <PreviewItem icon={Phone} label="Contacto Directo" value={form.phone || form.whatsapp} />
                        <PreviewItem icon={Globe} label="Plataforma Digital" value={form.email} subValue={form.website} />
                        
                        <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                            <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Horarios de Atención
                            </h4>
                            <div className="space-y-3">
                                {safeParseArrayField(form.openingHours).map((item: any, idx: number) => {
                                    const schedule = typeof item === 'object' ? item : { days: item, hours: '' };
                                    return (
                                        <div key={idx} className="flex justify-between items-center gap-4">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[100px]">{schedule.days || 'Sin días'}</span>
                                            <div className="h-px flex-1 bg-slate-200/50 dashed"></div>
                                            <span className="text-xs font-black text-slate-700 whitespace-nowrap">{schedule.hours || 'N/A'}</span>
                                        </div>
                                    );
                                })}
                                {safeParseArrayField(form.openingHours).length === 0 && (
                                    <p className="text-[11px] text-slate-400 italic">No se han definido horarios de operación.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                         <div className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                            <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-4">Servicios Médicos</h4>
                            <div className="flex flex-wrap gap-2">
                                {form.specialties.filter(Boolean).map((s, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 shadow-sm uppercase tracking-tight">{s}</span>
                                ))}
                                {form.specialties.filter(Boolean).length === 0 && (
                                    <p className="text-[11px] text-slate-400 italic">Especialidades no registradas.</p>
                                )}
                            </div>
                         </div>
                         <PreviewItem icon={CreditCard} label="Liquidez & Cobro" value={form.bankName} subValue={form.paymentMethods.join(' • ')} />
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Syncwave Salud • Clinical Governance System</p>
                </div>
            </div>
        </div>
    );
}

function PreviewItem({ icon: Icon, label, value, subValue }: { icon: any; label: string; value: string; subValue?: string }) {
    return (
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-bold text-slate-700">{value || 'No registrado'}</p>
                {subValue && <p className="text-xs text-indigo-500 font-semibold mt-0.5">{subValue}</p>}
            </div>
        </div>
    );
}
