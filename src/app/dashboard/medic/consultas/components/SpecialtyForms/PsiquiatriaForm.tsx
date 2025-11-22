'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Brain, AlertTriangle, Lock } from 'lucide-react';

export interface PsiquiatriaFormData {
	psychiatricHistory?: {
		previous?: boolean;
		diagnoses?: string;
		treatments?: string;
	};
	hospitalizations?: {
		psychiatric?: boolean;
		count?: number;
		last?: string;
		reason?: string;
	};
	substances?: {
		alcohol?: boolean;
		tobacco?: boolean;
		drugs?: string;
	};
	mentalExam?: {
		appearance?: string;
		behavior?: string;
		speech?: string;
		mood?: string;
		affect?: string;
		thought?: string;
		perception?: string;
		cognition?: string;
		insight?: string;
		judgment?: string;
	};
	phq9?: {
		score?: number;
		items?: number[]; // Array de 9 items (0-3 cada uno)
	};
	gad7?: {
		score?: number;
		items?: number[]; // Array de 7 items (0-3 cada uno)
	};
	suicideScale?: {
		ideation?: boolean;
		plan?: boolean;
		attempts?: number;
		risk?: string; // Bajo, Moderado, Alto
	};
	privateNotes?: string; // Notas privadas NO visibles al paciente
}

interface PsiquiatriaFormProps {
	initialData?: Partial<PsiquiatriaFormData>;
	onChange: (data: PsiquiatriaFormData) => void;
}

export default function PsiquiatriaForm({ initialData, onChange }: PsiquiatriaFormProps) {
	const [formData, setFormData] = useState<PsiquiatriaFormData>(initialData || {});

	const updateFormData = (updates: Partial<PsiquiatriaFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	const calculatePHQ9 = (items?: number[]) => {
		if (!items || items.length !== 9) return undefined;
		return items.reduce((sum, val) => sum + (val || 0), 0);
	};

	const calculateGAD7 = (items?: number[]) => {
		if (!items || items.length !== 7) return undefined;
		return items.reduce((sum, val) => sum + (val || 0), 0);
	};

	const handlePHQ9Change = (index: number, value: string) => {
		const numValue = value === '' ? 0 : Number(value);
		const newItems = [...(formData.phq9?.items || Array(9).fill(0))];
		newItems[index] = numValue;
		const score = calculatePHQ9(newItems);
		updateFormData({ phq9: { items: newItems, score } });
	};

	const handleGAD7Change = (index: number, value: string) => {
		const numValue = value === '' ? 0 : Number(value);
		const newItems = [...(formData.gad7?.items || Array(7).fill(0))];
		newItems[index] = numValue;
		const score = calculateGAD7(newItems);
		updateFormData({ gad7: { items: newItems, score } });
	};

	const phq9Questions = [
		'Poco interés o placer en hacer las cosas',
		'Se sintió triste, deprimido o sin esperanza',
		'Dificultad para quedarse o permanecer dormido, o durmió demasiado',
		'Se sintió cansado o con poca energía',
		'Poco apetito o comió en exceso',
		'Se sintió mal consigo mismo - o que es un fracaso o que ha decepcionado a su familia',
		'Dificultad para concentrarse en cosas tales como leer el periódico o ver la televisión',
		'Se movió o habló tan lento que otras personas podrían haberlo notado. O lo contrario - tan inquieto o agitado que se ha estado moviendo mucho más de lo normal',
		'Pensamientos de que estaría mejor muerto o de lastimarse de alguna manera',
	];

	const gad7Questions = [
		'Sentirse nervioso, ansioso o muy tenso',
		'No poder dejar de preocuparse o controlar las preocupaciones',
		'Preocuparse demasiado por diferentes cosas',
		'Dificultad para relajarse',
		'Estar tan inquieto que es difícil permanecer quieto',
		'Enfadarse o irritarse fácilmente',
		'Sentir miedo como si algo terrible fuera a suceder',
	];

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-slate-700 to-slate-900 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Brain size={20} />
					Formulario de Psiquiatría
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Antecedentes Psiquiátricos</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.psychiatricHistory?.previous || false} onChange={(e) => updateFormData({ psychiatricHistory: { ...formData.psychiatricHistory, previous: e.target.checked } })} className="rounded" />
						<span className="text-sm">Antecedentes psiquiátricos previos</span>
					</label>
					{formData.psychiatricHistory?.previous && (
						<>
							<div>
								<Label htmlFor="psychDiagnoses">Diagnósticos Previos</Label>
								<Textarea id="psychDiagnoses" value={formData.psychiatricHistory?.diagnoses || ''} onChange={(e) => updateFormData({ psychiatricHistory: { ...formData.psychiatricHistory, diagnoses: e.target.value } })} placeholder="Depresión, ansiedad, trastorno bipolar, etc." rows={2} />
							</div>
							<div>
								<Label htmlFor="psychTreatments">Tratamientos Previos</Label>
								<Textarea id="psychTreatments" value={formData.psychiatricHistory?.treatments || ''} onChange={(e) => updateFormData({ psychiatricHistory: { ...formData.psychiatricHistory, treatments: e.target.value } })} placeholder="Medicamentos, psicoterapia, hospitalizaciones" rows={2} />
							</div>
						</>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Hospitalizaciones Psiquiátricas</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.hospitalizations?.psychiatric || false} onChange={(e) => updateFormData({ hospitalizations: { ...formData.hospitalizations, psychiatric: e.target.checked } })} className="rounded" />
						<span className="text-sm">Hospitalizaciones psiquiátricas previas</span>
					</label>
					{formData.hospitalizations?.psychiatric && (
						<>
							<div>
								<Label htmlFor="hospCount">Número de Hospitalizaciones</Label>
								<Input id="hospCount" type="number" value={formData.hospitalizations?.count || ''} onChange={(e) => updateFormData({ hospitalizations: { ...formData.hospitalizations, count: e.target.value ? Number(e.target.value) : undefined } })} placeholder="Número" />
							</div>
							<div>
								<Label htmlFor="lastHosp">Última Hospitalización</Label>
								<Input id="lastHosp" type="date" value={formData.hospitalizations?.last || ''} onChange={(e) => updateFormData({ hospitalizations: { ...formData.hospitalizations, last: e.target.value } })} />
							</div>
							<div>
								<Label htmlFor="hospReason">Motivo</Label>
								<Textarea id="hospReason" value={formData.hospitalizations?.reason || ''} onChange={(e) => updateFormData({ hospitalizations: { ...formData.hospitalizations, reason: e.target.value } })} placeholder="Motivo de hospitalización" rows={2} />
							</div>
						</>
					)}
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Consumo de Sustancias</h3>
				<div className="space-y-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.substances?.alcohol || false} onChange={(e) => updateFormData({ substances: { ...formData.substances, alcohol: e.target.checked } })} className="rounded" />
						<span className="text-sm">Alcohol</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.substances?.tobacco || false} onChange={(e) => updateFormData({ substances: { ...formData.substances, tobacco: e.target.checked } })} className="rounded" />
						<span className="text-sm">Tabaco</span>
					</label>
					<div>
						<Label htmlFor="drugs">Drogas</Label>
						<Textarea id="drugs" value={formData.substances?.drugs || ''} onChange={(e) => updateFormData({ substances: { ...formData.substances, drugs: e.target.value } })} placeholder="Tipo y frecuencia de consumo" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Examen del Estado Mental</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="appearance">Apariencia</Label>
						<Textarea id="appearance" value={formData.mentalExam?.appearance || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, appearance: e.target.value } })} placeholder="Vestimenta, higiene, aspecto general" rows={2} />
					</div>
					<div>
						<Label htmlFor="behavior">Comportamiento</Label>
						<Textarea id="behavior" value={formData.mentalExam?.behavior || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, behavior: e.target.value } })} placeholder="Actitud, contacto visual, postura" rows={2} />
					</div>
					<div>
						<Label htmlFor="speech">Habla</Label>
						<Textarea id="speech" value={formData.mentalExam?.speech || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, speech: e.target.value } })} placeholder="Volumen, velocidad, tono" rows={2} />
					</div>
					<div>
						<Label htmlFor="mood">Estado de Ánimo</Label>
						<Input id="mood" value={formData.mentalExam?.mood || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, mood: e.target.value } })} placeholder="Cómo se siente subjetivamente" />
					</div>
					<div>
						<Label htmlFor="affect">Afecto</Label>
						<Input id="affect" value={formData.mentalExam?.affect || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, affect: e.target.value } })} placeholder="Expresión emocional observada" />
					</div>
					<div>
						<Label htmlFor="thought">Pensamiento</Label>
						<Textarea id="thought" value={formData.mentalExam?.thought || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, thought: e.target.value } })} placeholder="Contenido, forma, curso" rows={2} />
					</div>
					<div>
						<Label htmlFor="perception">Percepción</Label>
						<Textarea id="perception" value={formData.mentalExam?.perception || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, perception: e.target.value } })} placeholder="Alucinaciones, ilusiones" rows={2} />
					</div>
					<div>
						<Label htmlFor="cognition">Cognición</Label>
						<Textarea id="cognition" value={formData.mentalExam?.cognition || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, cognition: e.target.value } })} placeholder="Orientación, memoria, atención" rows={2} />
					</div>
					<div>
						<Label htmlFor="insight">Introspección</Label>
						<Input id="insight" value={formData.mentalExam?.insight || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, insight: e.target.value } })} placeholder="Comprensión de su condición" />
					</div>
					<div>
						<Label htmlFor="judgment">Juicio</Label>
						<Input id="judgment" value={formData.mentalExam?.judgment || ''} onChange={(e) => updateFormData({ mentalExam: { ...formData.mentalExam, judgment: e.target.value } })} placeholder="Capacidad de tomar decisiones" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">PHQ-9 (Escala de Depresión)</h3>
				<div className="space-y-3">
					{phq9Questions.map((question, index) => (
						<div key={index}>
							<Label className="text-sm">{question}</Label>
							<select value={formData.phq9?.items?.[index] || 0} onChange={(e) => handlePHQ9Change(index, e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1">
								<option value="0">Nada (0)</option>
								<option value="1">Varios días (1)</option>
								<option value="2">Más de la mitad de los días (2)</option>
								<option value="3">Casi todos los días (3)</option>
							</select>
						</div>
					))}
					<div className="mt-4 p-3 bg-blue-50 rounded-lg">
						<Label className="font-semibold">Puntuación Total PHQ-9</Label>
						<div className="text-2xl font-bold text-blue-700">{formData.phq9?.score ?? 0}</div>
						<p className="text-xs text-slate-600 mt-1">
							{formData.phq9?.score === undefined
								? 'Complete los items para calcular'
								: formData.phq9.score < 5
									? 'Depresión mínima'
									: formData.phq9.score < 10
										? 'Depresión leve'
										: formData.phq9.score < 15
											? 'Depresión moderada'
											: formData.phq9.score < 20
												? 'Depresión moderadamente severa'
												: 'Depresión severa'}
						</p>
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">GAD-7 (Escala de Ansiedad)</h3>
				<div className="space-y-3">
					{gad7Questions.map((question, index) => (
						<div key={index}>
							<Label className="text-sm">{question}</Label>
							<select value={formData.gad7?.items?.[index] || 0} onChange={(e) => handleGAD7Change(index, e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1">
								<option value="0">Nada (0)</option>
								<option value="1">Varios días (1)</option>
								<option value="2">Más de la mitad de los días (2)</option>
								<option value="3">Casi todos los días (3)</option>
							</select>
						</div>
					))}
					<div className="mt-4 p-3 bg-purple-50 rounded-lg">
						<Label className="font-semibold">Puntuación Total GAD-7</Label>
						<div className="text-2xl font-bold text-purple-700">{formData.gad7?.score ?? 0}</div>
						<p className="text-xs text-slate-600 mt-1">
							{formData.gad7?.score === undefined
								? 'Complete los items para calcular'
								: formData.gad7.score < 5
									? 'Ansiedad mínima'
									: formData.gad7.score < 10
										? 'Ansiedad leve'
										: formData.gad7.score < 15
											? 'Ansiedad moderada'
											: 'Ansiedad severa'}
						</p>
					</div>
				</div>
			</Card>

			<Card className="p-5 border-2 border-rose-200 bg-rose-50">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<AlertTriangle size={18} className="text-rose-600" />
					Escala de Riesgo Suicida
				</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.suicideScale?.ideation || false} onChange={(e) => updateFormData({ suicideScale: { ...formData.suicideScale, ideation: e.target.checked } })} className="rounded" />
						<span className="text-sm font-medium">Ideación Suicida</span>
					</label>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.suicideScale?.plan || false} onChange={(e) => updateFormData({ suicideScale: { ...formData.suicideScale, plan: e.target.checked } })} className="rounded" />
						<span className="text-sm font-medium">Plan Suicida</span>
					</label>
					<div>
						<Label htmlFor="suicideAttempts">Intentos Previos</Label>
						<Input id="suicideAttempts" type="number" value={formData.suicideScale?.attempts || ''} onChange={(e) => updateFormData({ suicideScale: { ...formData.suicideScale, attempts: e.target.value ? Number(e.target.value) : undefined } })} placeholder="Número de intentos" />
					</div>
					<div>
						<Label htmlFor="suicideRisk">Nivel de Riesgo</Label>
						<select id="suicideRisk" value={formData.suicideScale?.risk || ''} onChange={(e) => updateFormData({ suicideScale: { ...formData.suicideScale, risk: e.target.value } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="Bajo">Bajo</option>
							<option value="Moderado">Moderado</option>
							<option value="Alto">Alto</option>
						</select>
					</div>
				</div>
			</Card>

			<Card className="p-5 border-2 border-amber-200 bg-amber-50">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Lock size={18} className="text-amber-600" />
					Notas Privadas (NO visibles al paciente)
				</h3>
				<div>
					<Label htmlFor="privateNotes">Notas Confidenciales</Label>
					<Textarea id="privateNotes" value={formData.privateNotes || ''} onChange={(e) => updateFormData({ privateNotes: e.target.value })} placeholder="Notas privadas que solo el especialista puede ver. NO serán visibles para el paciente." rows={4} className="bg-white" />
					<p className="text-xs text-amber-700 mt-2">⚠️ Estas notas son completamente privadas y no aparecerán en el historial visible del paciente.</p>
				</div>
			</Card>
		</div>
	);
}

