'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Baby, Syringe, Heart } from 'lucide-react';

export interface PediaFormData {
	representative?: {
		name?: string;
		relationship?: string;
		phone?: string;
	};
	vaccines?: {
		upToDate?: boolean;
		missing?: string;
		notes?: string;
	};
	pregnancy?: {
		weeks?: number;
		complications?: string;
		delivery?: string; // Parto vaginal, cesárea
	};
	breastfeeding?: {
		exclusive?: boolean;
		duration?: string;
		formula?: boolean;
	};
	chronicProblems?: string;
	anthropometry?: {
		weight?: number;
		height?: number;
		headCircumference?: number; // PC - Perímetro Cefálico
	};
	hydration?: {
		scale?: string; // Escala de hidratación
		assessment?: string;
	};
}

interface PediaFormProps {
	initialData?: Partial<PediaFormData>;
	onChange: (data: PediaFormData) => void;
}

export default function PediaForm({ initialData, onChange }: PediaFormProps) {
	const [formData, setFormData] = useState<PediaFormData>(initialData || {});

	const updateFormData = (updates: Partial<PediaFormData>) => {
		const newData = { ...formData, ...updates };
		setFormData(newData);
		onChange(newData);
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Baby size={20} />
					Formulario de Pediatría
				</h2>
			</div>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Datos del Representante</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="repName">Nombre del Representante</Label>
						<Input id="repName" value={formData.representative?.name || ''} onChange={(e) => updateFormData({ representative: { ...formData.representative, name: e.target.value } })} placeholder="Nombre completo" />
					</div>
					<div>
						<Label htmlFor="repRelationship">Parentesco</Label>
						<Input id="repRelationship" value={formData.representative?.relationship || ''} onChange={(e) => updateFormData({ representative: { ...formData.representative, relationship: e.target.value } })} placeholder="Madre, padre, tutor" />
					</div>
					<div>
						<Label htmlFor="repPhone">Teléfono</Label>
						<Input id="repPhone" type="tel" value={formData.representative?.phone || ''} onChange={(e) => updateFormData({ representative: { ...formData.representative, phone: e.target.value } })} placeholder="Teléfono de contacto" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<Syringe size={18} />
					Vacunas
				</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.vaccines?.upToDate || false} onChange={(e) => updateFormData({ vaccines: { ...formData.vaccines, upToDate: e.target.checked } })} className="rounded" />
						<span className="text-sm">Esquema de vacunación al día</span>
					</label>
					<div>
						<Label htmlFor="missingVaccines">Vacunas Faltantes</Label>
						<Input id="missingVaccines" value={formData.vaccines?.missing || ''} onChange={(e) => updateFormData({ vaccines: { ...formData.vaccines, missing: e.target.value } })} placeholder="Lista de vacunas pendientes" />
					</div>
					<div>
						<Label htmlFor="vaccineNotes">Notas sobre Vacunación</Label>
						<Textarea id="vaccineNotes" value={formData.vaccines?.notes || ''} onChange={(e) => updateFormData({ vaccines: { ...formData.vaccines, notes: e.target.value } })} placeholder="Reacciones adversas, observaciones" rows={2} />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Gestación y Parto</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="pregnancyWeeks">Semanas de Gestación</Label>
						<Input id="pregnancyWeeks" type="number" value={formData.pregnancy?.weeks || ''} onChange={(e) => updateFormData({ pregnancy: { ...formData.pregnancy, weeks: e.target.value ? Number(e.target.value) : undefined } })} placeholder="Semanas" />
					</div>
					<div>
						<Label htmlFor="pregnancyComplications">Complicaciones del Embarazo</Label>
						<Textarea id="pregnancyComplications" value={formData.pregnancy?.complications || ''} onChange={(e) => updateFormData({ pregnancy: { ...formData.pregnancy, complications: e.target.value } })} placeholder="Preeclampsia, diabetes gestacional, etc." rows={2} />
					</div>
					<div>
						<Label htmlFor="delivery">Tipo de Parto</Label>
						<select id="delivery" value={formData.pregnancy?.delivery || ''} onChange={(e) => updateFormData({ pregnancy: { ...formData.pregnancy, delivery: e.target.value } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="Vaginal">Parto Vaginal</option>
							<option value="Cesarea">Cesárea</option>
							<option value="Instrumental">Parto Instrumental</option>
						</select>
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Lactancia</h3>
				<div className="space-y-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.breastfeeding?.exclusive || false} onChange={(e) => updateFormData({ breastfeeding: { ...formData.breastfeeding, exclusive: e.target.checked } })} className="rounded" />
						<span className="text-sm">Lactancia Materna Exclusiva</span>
					</label>
					<div>
						<Label htmlFor="breastfeedingDuration">Duración de la Lactancia</Label>
						<Input id="breastfeedingDuration" value={formData.breastfeeding?.duration || ''} onChange={(e) => updateFormData({ breastfeeding: { ...formData.breastfeeding, duration: e.target.value } })} placeholder="Ej: 6 meses, 1 año" />
					</div>
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={formData.breastfeeding?.formula || false} onChange={(e) => updateFormData({ breastfeeding: { ...formData.breastfeeding, formula: e.target.checked } })} className="rounded" />
						<span className="text-sm">Uso de Fórmula</span>
					</label>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Problemas Crónicos</h3>
				<div>
					<Label htmlFor="chronicProblems">Enfermedades o Problemas Crónicos</Label>
					<Textarea id="chronicProblems" value={formData.chronicProblems || ''} onChange={(e) => updateFormData({ chronicProblems: e.target.value })} placeholder="Asma, alergias, condiciones congénitas, etc." rows={2} />
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Antropometría</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<Label htmlFor="pedWeight">Peso (kg)</Label>
						<Input id="pedWeight" type="number" step="0.1" value={formData.anthropometry?.weight || ''} onChange={(e) => updateFormData({ anthropometry: { ...formData.anthropometry, weight: e.target.value ? Number(e.target.value) : undefined } })} placeholder="kg" />
					</div>
					<div>
						<Label htmlFor="pedHeight">Talla (cm)</Label>
						<Input id="pedHeight" type="number" step="0.1" value={formData.anthropometry?.height || ''} onChange={(e) => updateFormData({ anthropometry: { ...formData.anthropometry, height: e.target.value ? Number(e.target.value) : undefined } })} placeholder="cm" />
					</div>
					<div>
						<Label htmlFor="headCirc">Perímetro Cefálico (PC) (cm)</Label>
						<Input id="headCirc" type="number" step="0.1" value={formData.anthropometry?.headCircumference || ''} onChange={(e) => updateFormData({ anthropometry: { ...formData.anthropometry, headCircumference: e.target.value ? Number(e.target.value) : undefined } })} placeholder="cm" />
					</div>
				</div>
			</Card>

			<Card className="p-5">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Escala de Hidratación</h3>
				<div className="space-y-4">
					<div>
						<Label htmlFor="hydrationScale">Evaluación</Label>
						<select id="hydrationScale" value={formData.hydration?.scale || ''} onChange={(e) => updateFormData({ hydration: { ...formData.hydration, scale: e.target.value } })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
							<option value="">Seleccionar</option>
							<option value="Bien hidratado">Bien Hidratado</option>
							<option value="Deshidratación leve">Deshidratación Leve</option>
							<option value="Deshidratación moderada">Deshidratación Moderada</option>
							<option value="Deshidratación severa">Deshidratación Severa</option>
						</select>
					</div>
					<div>
						<Label htmlFor="hydrationAssessment">Evaluación Detallada</Label>
						<Textarea id="hydrationAssessment" value={formData.hydration?.assessment || ''} onChange={(e) => updateFormData({ hydration: { ...formData.hydration, assessment: e.target.value } })} placeholder="Fontanela, mucosas, turgencia cutánea, llanto" rows={2} />
					</div>
				</div>
			</Card>
		</div>
	);
}

