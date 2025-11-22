'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Heart, Activity, AlertCircle } from 'lucide-react';

export interface CardioFormData {
	riskFactors?: {
		smoking?: boolean;
		hypertension?: boolean;
		diabetes?: boolean;
		dyslipidemia?: boolean;
		familyHistory?: boolean;
		obesity?: boolean;
		sedentary?: boolean;
	};
	cardiacHistory?: {
		mi?: boolean;
		angina?: boolean;
		arrhythmia?: boolean;
		heartFailure?: boolean;
		surgery?: string;
	};
	chestPain?: {
		present?: boolean;
		characteristics?: string;
		triggers?: string;
		relief?: string;
	};
	dyspnea?: {
		nyha?: string; // NYHA I, II, III, IV
		description?: string;
	};
	edema?: {
		present?: boolean;
		location?: string;
		severity?: string;
	};
	palpitations?: {
		present?: boolean;
		description?: string;
	};
	cardiopulmonaryExam?: {
		heartSounds?: string;
		murmurs?: string;
		lungSounds?: string;
		jvp?: string; // Jugular Venous Pressure
	};
}

interface CardioFormProps {
	initialData?: Partial<CardioFormData>;
	onChange: (data: CardioFormData) => void;
}

export default function CardioForm({ initialData, onChange }: CardioFormProps) {
	const [formData, setFormData] = useState<CardioFormData>(initialData || {});

	const updateFormData = (updates: Partial<CardioFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Heart size={20} />
					Formulario de Cardiología
				</h2>
			</div>

			{/* Factores de Riesgo */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Factores de Riesgo Cardiovascular</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.smoking || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, smoking: e.target.checked } })} className="rounded" />
						<span className="text-sm">Tabaquismo</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.hypertension || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, hypertension: e.target.checked } })} className="rounded" />
						<span className="text-sm">Hipertensión</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.diabetes || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, diabetes: e.target.checked } })} className="rounded" />
						<span className="text-sm">Diabetes</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.dyslipidemia || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, dyslipidemia: e.target.checked } })} className="rounded" />
						<span className="text-sm">Dislipidemia</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.familyHistory || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, familyHistory: e.target.checked } })} className="rounded" />
						<span className="text-sm">Antecedentes Familiares</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.obesity || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, obesity: e.target.checked } })} className="rounded" />
						<span className="text-sm">Obesidad</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.riskFactors?.sedentary || false} onChange={(e) => updateFormData({ riskFactors: { ...formData.riskFactors, sedentary: e.target.checked } })} className="rounded" />
						<span className="text-sm">Sedentarismo</span>
					</label>
				</div>
			</Card>

			{/* Antecedentes Cardiacos */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Antecedentes Cardiacos</h3>
				<div className="space-y-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.cardiacHistory?.mi || false} onChange={(e) => updateFormData({ cardiacHistory: { ...formData.cardiacHistory, mi: e.target.checked } })} className="rounded" />
						<span className="text-sm">Infarto Agudo de Miocardio (IAM)</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.cardiacHistory?.angina || false} onChange={(e) => updateFormData({ cardiacHistory: { ...formData.cardiacHistory, angina: e.target.checked } })} className="rounded" />
						<span className="text-sm">Angina</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.cardiacHistory?.arrhythmia || false} onChange={(e) => updateFormData({ cardiacHistory: { ...formData.cardiacHistory, arrhythmia: e.target.checked } })} className="rounded" />
						<span className="text-sm">Arritmias</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.cardiacHistory?.heartFailure || false} onChange={(e) => updateFormData({ cardiacHistory: { ...formData.cardiacHistory, heartFailure: e.target.checked } })} className="rounded" />
						<span className="text-sm">Insuficiencia Cardiaca</span>
					</label>
					<div>
						<Label htmlFor="cardiacSurgery">Cirugías Cardiacas Previas</Label>
						<Input id="cardiacSurgery" value={formData.cardiacHistory?.surgery || ''} onChange={(e) => updateFormData({ cardiacHistory: { ...formData.cardiacHistory, surgery: e.target.value } })} placeholder="Ej: Bypass, stent, válvula" />
					</div>
				</div>
			</Card>

			{/* Dolor Torácico */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Dolor Torácico</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.chestPain?.present || false} onChange={(e) => updateFormData({ chestPain: { ...formData.chestPain, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presente</span>
					</label>
					{formData.chestPain?.present && (
						<>
							<div>
								<Label htmlFor="chestPainChar">Características</Label>
								<Textarea id="chestPainChar" value={formData.chestPain?.characteristics || ''} onChange={(e) => updateFormData({ chestPain: { ...formData.chestPain, characteristics: e.target.value } })} placeholder="Tipo, intensidad, duración" rows={2} />
							</div>
							<div>
								<Label htmlFor="chestPainTriggers">Factores Desencadenantes</Label>
								<Input id="chestPainTriggers" value={formData.chestPain?.triggers || ''} onChange={(e) => updateFormData({ chestPain: { ...formData.chestPain, triggers: e.target.value } })} placeholder="Ej: esfuerzo, reposo, estrés" />
							</div>
							<div>
								<Label htmlFor="chestPainRelief">Factores de Alivio</Label>
								<Input id="chestPainRelief" value={formData.chestPain?.relief || ''} onChange={(e) => updateFormData({ chestPain: { ...formData.chestPain, relief: e.target.value } })} placeholder="Ej: reposo, nitroglicerina" />
							</div>
						</>
					)}
				</div>
			</Card>

			{/* Disnea */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Disnea</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="dyspneaNYHA">Clasificación NYHA</Label>
						<select id="dyspneaNYHA" value={formData.dyspnea?.nyha || ''} onChange={(e) => updateFormData({ dyspnea: { ...formData.dyspnea, nyha: e.target.value } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="NYHA I">NYHA I - Sin limitación</option>
							<option value="NYHA II">NYHA II - Limitación leve</option>
							<option value="NYHA III">NYHA III - Limitación marcada</option>
							<option value="NYHA IV">NYHA IV - Limitación en reposo</option>
						</select>
					</div>
					<div>
						<Label htmlFor="dyspneaDesc">Descripción</Label>
						<Textarea id="dyspneaDesc" value={formData.dyspnea?.description || ''} onChange={(e) => updateFormData({ dyspnea: { ...formData.dyspnea, description: e.target.value } })} placeholder="Descripción de la disnea" rows={2} />
					</div>
				</div>
			</Card>

			{/* Edema */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Edema</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.edema?.present || false} onChange={(e) => updateFormData({ edema: { ...formData.edema, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presente</span>
					</label>
					{formData.edema?.present && (
						<>
							<div>
								<Label htmlFor="edemaLocation">Localización</Label>
								<Input id="edemaLocation" value={formData.edema?.location || ''} onChange={(e) => updateFormData({ edema: { ...formData.edema, location: e.target.value } })} placeholder="Ej: miembros inferiores, generalizado" />
							</div>
							<div>
								<Label htmlFor="edemaSeverity">Severidad</Label>
								<Input id="edemaSeverity" value={formData.edema?.severity || ''} onChange={(e) => updateFormData({ edema: { ...formData.edema, severity: e.target.value } })} placeholder="Leve, moderado, severo" />
							</div>
						</>
					)}
				</div>
			</Card>

			{/* Palpitaciones */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Palpitaciones</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.palpitations?.present || false} onChange={(e) => updateFormData({ palpitations: { ...formData.palpitations, present: e.target.checked } })} className="rounded" />
						<span className="text-sm">Presentes</span>
					</label>
					{formData.palpitations?.present && (
						<div>
							<Label htmlFor="palpitationsDesc">Descripción</Label>
							<Textarea id="palpitationsDesc" value={formData.palpitations?.description || ''} onChange={(e) => updateFormData({ palpitations: { ...formData.palpitations, description: e.target.value } })} placeholder="Características de las palpitaciones" rows={2} />
						</div>
					)}
				</div>
			</Card>

			{/* Examen Cardiopulmonar */}
			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Examen Cardiopulmonar</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="heartSounds">Ruidos Cardiacos</Label>
						<Textarea id="heartSounds" value={formData.cardiopulmonaryExam?.heartSounds || ''} onChange={(e) => updateFormData({ cardiopulmonaryExam: { ...formData.cardiopulmonaryExam, heartSounds: e.target.value } })} placeholder="R1, R2, R3, R4" rows={2} />
					</div>
					<div>
						<Label htmlFor="murmurs">Soplos</Label>
						<Textarea id="murmurs" value={formData.cardiopulmonaryExam?.murmurs || ''} onChange={(e) => updateFormData({ cardiopulmonaryExam: { ...formData.cardiopulmonaryExam, murmurs: e.target.value } })} placeholder="Localización, tipo, intensidad" rows={2} />
					</div>
					<div>
						<Label htmlFor="lungSounds">Ruidos Pulmonares</Label>
						<Textarea id="lungSounds" value={formData.cardiopulmonaryExam?.lungSounds || ''} onChange={(e) => updateFormData({ cardiopulmonaryExam: { ...formData.cardiopulmonaryExam, lungSounds: e.target.value } })} placeholder="Vesicular, crepitantes, sibilancias" rows={2} />
					</div>
					<div>
						<Label htmlFor="jvp">Presión Venosa Yugular (JVP)</Label>
						<Input id="jvp" value={formData.cardiopulmonaryExam?.jvp || ''} onChange={(e) => updateFormData({ cardiopulmonaryExam: { ...formData.cardiopulmonaryExam, jvp: e.target.value } })} placeholder="cm H2O" />
					</div>
				</div>
			</Card>
		</div>
	);
}

