'use client';

import { SurveyQuestion as SurveyQuestionType } from '@/types/surveys';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface SurveyQuestionProps {
	question: SurveyQuestionType;
	value: any;
	onChange: (value: any) => void;
}

export default function SurveyQuestion({ question, value, onChange }: SurveyQuestionProps) {
	
	if (question.type === 'rating') {
		return (
			<div className="space-y-3">
				<label className="block text-sm font-semibold text-gray-900">
					{question.label} {question.required !== false && <span className="text-red-500">*</span>}
				</label>
				<div className="flex items-center gap-2">
					{Array.from({ length: question.max }).map((_, i) => {
						const rating = i + 1;
						const isSelected = value >= rating;
						return (
							<button
								key={rating}
								type="button"
								onClick={() => onChange(rating)}
								className={`p-2 rounded-full transition-all transform hover:scale-110 ${
									isSelected ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'
								}`}
							>
								<Star className={`w-8 h-8 ${isSelected ? 'fill-current' : ''}`} />
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	if (question.type === 'single_choice') {
		return (
			<div className="space-y-3">
				<label className="block text-sm font-semibold text-gray-900">
					{question.label} {question.required !== false && <span className="text-red-500">*</span>}
				</label>
				<div className="flex flex-wrap gap-2">
					{question.options.map((opt) => (
						<button
							key={opt}
							type="button"
							onClick={() => onChange(opt)}
							className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
								value === opt 
									? 'bg-indigo-600 border-indigo-600 text-white' 
									: 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
							}`}
						>
							{opt}
						</button>
					))}
				</div>
			</div>
		);
	}

	if (question.type === 'boolean') {
		return (
			<div className="space-y-3">
				<label className="block text-sm font-semibold text-gray-900">
					{question.label} {question.required !== false && <span className="text-red-500">*</span>}
				</label>
				<div className="flex gap-4">
					<button
						type="button"
						onClick={() => onChange(true)}
						className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
							value === true 
								? 'bg-green-50 border-green-500 text-green-700' 
								: 'bg-white border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50'
						}`}
					>
						<ThumbsUp className={`w-5 h-5 ${value === true ? 'fill-current' : ''}`} />
						<span className="font-medium">Sí</span>
					</button>
					<button
						type="button"
						onClick={() => onChange(false)}
						className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
							value === false 
								? 'bg-red-50 border-red-500 text-red-700' 
								: 'bg-white border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50'
						}`}
					>
						<ThumbsDown className={`w-5 h-5 ${value === false ? 'fill-current' : ''}`} />
						<span className="font-medium">No</span>
					</button>
				</div>
			</div>
		);
	}

	if (question.type === 'text') {
		const textValue = value || '';
		return (
			<div className="space-y-3">
				<label className="block text-sm font-semibold text-gray-900">
					{question.label} {question.required !== false && <span className="text-red-500">*</span>}
				</label>
				<textarea
					value={textValue}
					onChange={(e) => {
						if (question.max_length && e.target.value.length > question.max_length) return;
						onChange(e.target.value);
					}}
					placeholder="Escribe aquí tu respuesta..."
					className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm px-4 py-3 border min-h-[100px] resize-none"
				/>
				{question.max_length && (
					<p className="text-right text-xs text-gray-400">
						{textValue.length}/{question.max_length}
					</p>
				)}
			</div>
		);
	}

	return null;
}
