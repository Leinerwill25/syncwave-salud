'use client';

import React from 'react';

interface QuickValueChipProps {
	label: string;
	currentValue: string;
	options: string[];
	onSelect: (value: string) => void;
}

export default function QuickValueChip({ label, currentValue, options, onSelect }: QuickValueChipProps) {
	return (
		<div className="space-y-2">
			<label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => {
					const isSelected = currentValue === option;
					return (
						<button
							key={option}
							type="button"
							onClick={() => onSelect(isSelected ? '' : option)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
								isSelected 
									? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm' 
									: 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
							}`}
						>
							{option}
						</button>
					);
				})}
			</div>
		</div>
	);
}
