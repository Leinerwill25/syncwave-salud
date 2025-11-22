'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Smile } from 'lucide-react';

// Standard tooth numbering system (FDI notation)
const TOOTH_NUMBERS = [
	// Upper right quadrant (1)
	18, 17, 16, 15, 14, 13, 12, 11,
	// Upper left quadrant (2)
	21, 22, 23, 24, 25, 26, 27, 28,
	// Lower left quadrant (3)
	38, 37, 36, 35, 34, 33, 32, 31,
	// Lower right quadrant (4)
	41, 42, 43, 44, 45, 46, 47, 48,
];

const TOOTH_CONDITIONS = {
	HEALTHY: 'healthy',
	CARIES: 'caries',
	FILLING: 'filling',
	EXTRACTED: 'extracted',
	ROOT_CANAL: 'root_canal',
	CROWN: 'crown',
	MISSING: 'missing',
	OTHER: 'other',
} as const;

type ToothCondition = (typeof TOOTH_CONDITIONS)[keyof typeof TOOTH_CONDITIONS];

export interface OdontogramData {
	[toothNumber: number]: {
		condition: ToothCondition;
		notes?: string;
	};
}

interface OdontogramProps {
	initialData?: OdontogramData;
	onChange: (data: OdontogramData) => void;
}

const conditionColors: Record<ToothCondition, string> = {
	healthy: 'bg-white border-green-500',
	caries: 'bg-red-200 border-red-500',
	filling: 'bg-blue-200 border-blue-500',
	extracted: 'bg-gray-300 border-gray-500',
	root_canal: 'bg-purple-200 border-purple-500',
	crown: 'bg-yellow-200 border-yellow-500',
	missing: 'bg-slate-400 border-slate-600',
	other: 'bg-orange-200 border-orange-500',
};

const conditionLabels: Record<ToothCondition, string> = {
	healthy: 'Sano',
	caries: 'Caries',
	filling: 'Obturación',
	extracted: 'Extraído',
	root_canal: 'Endodoncia',
	crown: 'Corona',
	missing: 'Ausente',
	other: 'Otro',
};

export default function Odontogram({ initialData, onChange }: OdontogramProps) {
	const [toothData, setToothData] = useState<OdontogramData>(initialData || {});
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

	const handleToothClick = (toothNumber: number) => {
		setSelectedTooth(toothNumber);
	};

	const handleConditionChange = (toothNumber: number, condition: ToothCondition) => {
		const newData = {
			...toothData,
			[toothNumber]: {
				...toothData[toothNumber],
				condition,
			},
		};
		setToothData(newData);
		onChange(newData);
	};

	const handleNotesChange = (toothNumber: number, notes: string) => {
		const newData = {
			...toothData,
			[toothNumber]: {
				...toothData[toothNumber],
				condition: toothData[toothNumber]?.condition || TOOTH_CONDITIONS.HEALTHY,
				notes,
			},
		};
		setToothData(newData);
		onChange(newData);
	};

	const getToothClass = (toothNumber: number) => {
		const condition = toothData[toothNumber]?.condition || TOOTH_CONDITIONS.HEALTHY;
		const baseClass = 'w-12 h-12 rounded-lg border-2 cursor-pointer transition-all hover:scale-110 flex items-center justify-center text-xs font-semibold';
		return `${baseClass} ${conditionColors[condition]} ${selectedTooth === toothNumber ? 'ring-4 ring-teal-400' : ''}`;
	};

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 rounded-xl text-white">
				<h2 className="text-xl font-semibold flex items-center gap-2">
					<Smile size={20} />
					Odontograma
				</h2>
				<p className="text-sm text-white/90 mt-1">Haga clic en un diente para registrar su estado</p>
			</div>

			<Card className="p-5">
				{/* Legend */}
				<div className="mb-6">
					<Label className="text-sm font-semibold mb-3 block">Leyenda</Label>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
						{Object.entries(conditionLabels).map(([key, label]) => {
							const condition = key as ToothCondition;
							return (
								<div key={key} className="flex items-center gap-2 text-xs">
									<div className={`w-4 h-4 rounded border ${conditionColors[condition]}`} />
									<span>{label}</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Odontogram Grid */}
				<div className="space-y-4">
					{/* Upper Jaw */}
					<div className="bg-blue-50 p-4 rounded-lg">
						<Label className="text-sm font-semibold mb-2 block">Arco Superior</Label>
						<div className="flex flex-wrap gap-2 justify-center">
							{TOOTH_NUMBERS.slice(0, 16).map((toothNumber) => (
								<div key={toothNumber} className="flex flex-col items-center">
									<div className={getToothClass(toothNumber)} onClick={() => handleToothClick(toothNumber)}>
										{toothNumber}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Lower Jaw */}
					<div className="bg-green-50 p-4 rounded-lg">
						<Label className="text-sm font-semibold mb-2 block">Arco Inferior</Label>
						<div className="flex flex-wrap gap-2 justify-center">
							{TOOTH_NUMBERS.slice(16).map((toothNumber) => (
								<div key={toothNumber} className="flex flex-col items-center">
									<div className={getToothClass(toothNumber)} onClick={() => handleToothClick(toothNumber)}>
										{toothNumber}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Tooth Details */}
				{selectedTooth && (
					<div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
						<Label className="text-sm font-semibold mb-3 block">
							Diente {selectedTooth} - Detalles
						</Label>
						<div className="space-y-3">
							<div>
								<Label className="text-xs mb-1 block">Condición</Label>
								<select
									value={toothData[selectedTooth]?.condition || TOOTH_CONDITIONS.HEALTHY}
									onChange={(e) => handleConditionChange(selectedTooth, e.target.value as ToothCondition)}
									className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-sm"
								>
									{Object.entries(conditionLabels).map(([key, label]) => (
										<option key={key} value={key}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div>
								<Label className="text-xs mb-1 block">Notas</Label>
								<textarea
									value={toothData[selectedTooth]?.notes || ''}
									onChange={(e) => handleNotesChange(selectedTooth, e.target.value)}
									placeholder="Notas adicionales sobre este diente"
									rows={2}
									className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
								/>
							</div>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
}

