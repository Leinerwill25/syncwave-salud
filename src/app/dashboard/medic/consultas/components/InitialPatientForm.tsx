'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { User, Calendar, Phone, Mail, MapPin, Heart, Pill, Activity, Stethoscope } from 'lucide-react';

export interface InitialPatientData {
	// Datos personales
	firstName: string;
	lastName: string;
	identifier?: string;
	dob?: string;
	sex?: 'M' | 'F' | 'OTHER';
	phone?: string;
	email?: string;
	address?: string;

	// Antecedentes personales
	allergies?: string;
	currentMedication?: string;
	chronicConditions?: string;
	habits?: {
		tobacco?: boolean;
		alcohol?: boolean;
		physicalActivity?: string;
		diet?: string;
	};

	// Antecedentes familiares
	familyHistory?: {
		diabetes?: boolean;
		hypertension?: boolean;
		miOrStroke?: boolean;
		cancer?: boolean;
		hereditaryDiseases?: string;
	};

	// Datos clínicos básicos
	vitals?: {
		weight?: number;
		height?: number;
		bmi?: number;
		bpSystolic?: number;
		bpDiastolic?: number;
		heartRate?: number;
		respiratoryRate?: number;
		spo2?: number;
		temperature?: number;
		capillaryGlucose?: number;
	};

	// Motivo de consulta
	chiefComplaint?: string;
}

interface InitialPatientFormProps {
	initialData?: Partial<InitialPatientData>;
	onSubmit: (data: InitialPatientData) => void;
	onCancel?: () => void;
	loading?: boolean;
}

export default function InitialPatientForm({ initialData, onSubmit, onCancel, loading }: InitialPatientFormProps) {
	const [formData, setFormData] = useState<InitialPatientData>({
		firstName: initialData?.firstName || '',
		lastName: initialData?.lastName || '',
		identifier: initialData?.identifier || '',
		dob: initialData?.dob || '',
		sex: initialData?.sex,
		phone: initialData?.phone || '',
		email: initialData?.email || '',
		address: initialData?.address || '',
		allergies: initialData?.allergies || '',
		currentMedication: initialData?.currentMedication || '',
		chronicConditions: initialData?.chronicConditions || '',
		habits: initialData?.habits || {},
		familyHistory: initialData?.familyHistory || {},
		vitals: initialData?.vitals || {},
		chiefComplaint: initialData?.chiefComplaint || '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Calcular IMC automáticamente
	const calculateBMI = (weight?: number, height?: number) => {
		if (!weight || !height || height === 0) return undefined;
		const heightInMeters = height / 100;
		return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
	};

	const handleVitalChange = (field: string, value: string) => {
		const numValue = value === '' ? undefined : Number(value);
		setFormData((prev) => ({
			...prev,
			vitals: {
				...prev.vitals,
				[field]: numValue,
				...(field === 'weight' || field === 'height'
					? {
							bmi: calculateBMI(field === 'weight' ? numValue : prev.vitals?.weight, field === 'height' ? numValue : prev.vitals?.height),
					  }
					: {}),
			},
		}));
	};

	const handleHabitChange = (field: string, value: boolean | string) => {
		setFormData((prev) => ({
			...prev,
			habits: {
				...prev.habits,
				[field]: value,
			},
		}));
	};

	const handleFamilyHistoryChange = (field: string, value: boolean | string) => {
		setFormData((prev) => ({
			...prev,
			familyHistory: {
				...prev.familyHistory,
				[field]: value,
			},
		}));
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
		if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es obligatorio';
		if (!formData.chiefComplaint?.trim()) newErrors.chiefComplaint = 'El motivo de consulta es obligatorio';
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validate()) {
			onSubmit(formData);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<User size={20} />
					Formulario Inicial del Paciente
				</h2>
				<p className="text-sm text-white/90 mt-1">Complete la información básica del paciente antes de continuar con la consulta especializada</p>
			</div>

			{/* Datos Personales */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<User size={18} />
					Datos Personales
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="firstName">Nombre *</Label>
						<Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Nombre" />
						{errors.firstName && <p className="text-xs text-rose-600 mt-1">{errors.firstName}</p>}
					</div>
					<div>
						<Label htmlFor="lastName">Apellido *</Label>
						<Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Apellido" />
						{errors.lastName && <p className="text-xs text-rose-600 mt-1">{errors.lastName}</p>}
					</div>
					<div>
						<Label htmlFor="identifier">Cédula / ID</Label>
						<Input id="identifier" value={formData.identifier} onChange={(e) => setFormData({ ...formData, identifier: e.target.value })} placeholder="Cédula o identificación" />
					</div>
					<div>
						<Label htmlFor="dob">Fecha de Nacimiento</Label>
						<Input id="dob" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
					</div>
					<div>
						<Label htmlFor="sex">Sexo</Label>
						<select id="sex" value={formData.sex || ''} onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'M' | 'F' | 'OTHER' | undefined })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="M">Masculino</option>
							<option value="F">Femenino</option>
							<option value="OTHER">Otro</option>
						</select>
					</div>
					<div>
						<Label htmlFor="phone">Teléfono</Label>
						<div className="relative">
							<Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
							<Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Teléfono" className="pl-10" />
						</div>
					</div>
					<div>
						<Label htmlFor="email">Correo (opcional)</Label>
						<div className="relative">
							<Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
							<Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="correo@ejemplo.com" className="pl-10" />
						</div>
					</div>
					<div>
						<Label htmlFor="address">Dirección (opcional)</Label>
						<div className="relative">
							<MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
							<Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Dirección" className="pl-10" />
						</div>
					</div>
				</div>
			</Card>

			{/* Antecedentes Personales */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Heart size={18} />
					Antecedentes Personales
				</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="allergies">Alergias</Label>
						<Textarea id="allergies" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} placeholder="Lista de alergias conocidas" rows={2} />
					</div>
					<div>
						<Label htmlFor="currentMedication">Medicación Habitual</Label>
						<Textarea id="currentMedication" value={formData.currentMedication} onChange={(e) => setFormData({ ...formData, currentMedication: e.target.value })} placeholder="Medicamentos que toma regularmente" rows={2} />
					</div>
					<div>
						<Label htmlFor="chronicConditions">Enfermedades Crónicas</Label>
						<Textarea id="chronicConditions" value={formData.chronicConditions} onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })} placeholder="Enfermedades crónicas diagnosticadas" rows={2} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label>Hábitos</Label>
							<div className="space-y-2 mt-2">
								<label className="flex items-center gap-2">
									<input type="checkbox" checked={formData.habits?.tobacco || false} onChange={(e) => handleHabitChange('tobacco', e.target.checked)} className="rounded" />
									<span className="text-sm">Tabaco</span>
								</label>
								<label className="flex items-center gap-2">
									<input type="checkbox" checked={formData.habits?.alcohol || false} onChange={(e) => handleHabitChange('alcohol', e.target.checked)} className="rounded" />
									<span className="text-sm">Alcohol</span>
								</label>
								<div>
									<Label htmlFor="physicalActivity" className="text-xs">Actividad Física</Label>
									<Input id="physicalActivity" value={formData.habits?.physicalActivity || ''} onChange={(e) => handleHabitChange('physicalActivity', e.target.value)} placeholder="Ej: 3 veces/semana" />
								</div>
								<div>
									<Label htmlFor="diet" className="text-xs">Dieta</Label>
									<Input id="diet" value={formData.habits?.diet || ''} onChange={(e) => handleHabitChange('diet', e.target.value)} placeholder="Ej: Vegetariana, Normal" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card>

			{/* Antecedentes Familiares */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Activity size={18} />
					Antecedentes Familiares
				</h3>
				<div className="space-y-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.familyHistory?.diabetes || false} onChange={(e) => handleFamilyHistoryChange('diabetes', e.target.checked)} className="rounded" />
						<span className="text-sm">Diabetes Mellitus (DM)</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.familyHistory?.hypertension || false} onChange={(e) => handleFamilyHistoryChange('hypertension', e.target.checked)} className="rounded" />
						<span className="text-sm">Hipertensión Arterial (HTA)</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.familyHistory?.miOrStroke || false} onChange={(e) => handleFamilyHistoryChange('miOrStroke', e.target.checked)} className="rounded" />
						<span className="text-sm">Infarto Agudo de Miocardio (IAM) / Accidente Cerebrovascular (ACV)</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.familyHistory?.cancer || false} onChange={(e) => handleFamilyHistoryChange('cancer', e.target.checked)} className="rounded" />
						<span className="text-sm">Cáncer</span>
					</label>
					<div>
						<Label htmlFor="hereditaryDiseases">Enfermedades Hereditarias</Label>
						<Textarea id="hereditaryDiseases" value={formData.familyHistory?.hereditaryDiseases || ''} onChange={(e) => handleFamilyHistoryChange('hereditaryDiseases', e.target.value)} placeholder="Especificar enfermedades hereditarias" rows={2} />
					</div>
				</div>
			</Card>

			{/* Datos Clínicos Básicos */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Stethoscope size={18} />
					Signos Vitales y Datos Clínicos
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<Label htmlFor="weight">Peso (kg)</Label>
						<Input id="weight" type="number" step="0.1" value={formData.vitals?.weight || ''} onChange={(e) => handleVitalChange('weight', e.target.value)} placeholder="kg" />
					</div>
					<div>
						<Label htmlFor="height">Talla (cm)</Label>
						<Input id="height" type="number" step="0.1" value={formData.vitals?.height || ''} onChange={(e) => handleVitalChange('height', e.target.value)} placeholder="cm" />
					</div>
					<div>
						<Label htmlFor="bmi">IMC</Label>
						<Input id="bmi" type="number" step="0.1" value={formData.vitals?.bmi || ''} readOnly className="bg-slate-50" placeholder="Calculado automáticamente" />
					</div>
					<div>
						<Label htmlFor="bpSystolic">PA Sistólica</Label>
						<Input id="bpSystolic" type="number" value={formData.vitals?.bpSystolic || ''} onChange={(e) => handleVitalChange('bpSystolic', e.target.value)} placeholder="mmHg" />
					</div>
					<div>
						<Label htmlFor="bpDiastolic">PA Diastólica</Label>
						<Input id="bpDiastolic" type="number" value={formData.vitals?.bpDiastolic || ''} onChange={(e) => handleVitalChange('bpDiastolic', e.target.value)} placeholder="mmHg" />
					</div>
					<div>
						<Label htmlFor="heartRate">FC (bpm)</Label>
						<Input id="heartRate" type="number" value={formData.vitals?.heartRate || ''} onChange={(e) => handleVitalChange('heartRate', e.target.value)} placeholder="bpm" />
					</div>
					<div>
						<Label htmlFor="respiratoryRate">FR (rpm)</Label>
						<Input id="respiratoryRate" type="number" value={formData.vitals?.respiratoryRate || ''} onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)} placeholder="rpm" />
					</div>
					<div>
						<Label htmlFor="spo2">Sat O₂ (%)</Label>
						<Input id="spo2" type="number" value={formData.vitals?.spo2 || ''} onChange={(e) => handleVitalChange('spo2', e.target.value)} placeholder="%" />
					</div>
					<div>
						<Label htmlFor="temperature">Temperatura (°C)</Label>
						<Input id="temperature" type="number" step="0.1" value={formData.vitals?.temperature || ''} onChange={(e) => handleVitalChange('temperature', e.target.value)} placeholder="°C" />
					</div>
					<div>
						<Label htmlFor="capillaryGlucose">Glicemia Capilar (opcional)</Label>
						<Input id="capillaryGlucose" type="number" step="0.1" value={formData.vitals?.capillaryGlucose || ''} onChange={(e) => handleVitalChange('capillaryGlucose', e.target.value)} placeholder="mg/dL" />
					</div>
				</div>
			</Card>

			{/* Motivo de Consulta */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Stethoscope size={18} />
					Motivo de Consulta *
				</h3>
				<div>
					<Textarea id="chiefComplaint" value={formData.chiefComplaint} onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })} placeholder="Describa el motivo principal de la consulta" rows={3} required />
					{errors.chiefComplaint && <p className="text-xs text-rose-600 mt-1">{errors.chiefComplaint}</p>}
				</div>
			</Card>

			{/* Actions */}
			<div className="flex items-center justify-end gap-3">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
						Cancelar
					</Button>
				)}
				<Button type="submit" disabled={loading} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
					{loading ? 'Guardando...' : 'Continuar con Consulta Especializada'}
				</Button>
			</div>
		</form>
	);
}

