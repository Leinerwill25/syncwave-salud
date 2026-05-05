'use client';

import { useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { ConsultationSurveyResponse } from '@/types/surveys';
import { submitSurveyResponse } from '@/lib/actions/surveys';
import SurveyQuestion from './SurveyQuestion';

interface SurveyModalProps {
	isOpen: boolean;
	onClose: () => void;
	surveyResponse: ConsultationSurveyResponse;
	onSuccess: () => void;
}

export default function SurveyModal({ isOpen, onClose, surveyResponse, onSuccess }: SurveyModalProps) {
	const [answers, setAnswers] = useState<Record<string, any>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	if (!isOpen) return null;

	const { survey, consultation } = surveyResponse as any; // Cast for easier access based on join
	const questions = survey?.questions || [];
	const doctorName = consultation?.doctor?.name || 'su médico';
	const dateStr = consultation?.started_at 
		? new Date(consultation.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
		: 'reciente';

	// Validate if all required questions have answers
	const isValid = questions.every((q: any) => {
		if (q.required === false) return true;
		const val = answers[q.id];
		return val !== undefined && val !== null && val !== '';
	});

	const handleSubmit = async () => {
		if (!isValid) return;
		setIsSubmitting(true);
		
		try {
			const res = await submitSurveyResponse(surveyResponse.id, answers);
			if (res.error) throw new Error(res.error);
			
			setShowSuccess(true);
			setTimeout(() => {
				onSuccess();
				onClose();
			}, 2000);
		} catch (error) {
			console.error('Error enviando encuesta:', error);
			alert('Ocurrió un error al enviar tus respuestas. Por favor intenta de nuevo.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (showSuccess) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
				<div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in zoom-in duration-300">
					<div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
						<CheckCircle2 className="w-10 h-10" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu opinión!</h2>
					<p className="text-gray-600">Tus respuestas nos ayudan a mejorar continuamente nuestro servicio.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
			<div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in duration-300">
				{/* Header */}
				<div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-indigo-50/30">
					<div>
						<h2 className="text-xl font-bold text-gray-900 mb-1">¿Cómo fue tu consulta?</h2>
						<p className="text-sm text-gray-600">
							Dr. {doctorName} &mdash; {dateStr}
							{consultation?.chief_complaint && <span> &mdash; {consultation.chief_complaint}</span>}
						</p>
					</div>
					<button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-200/50 rounded-full transition-colors text-gray-500">
						<X className="w-5 h-5" />
					</button>
				</div>
				
				{/* Content */}
				<div className="p-6 overflow-y-auto flex-1 bg-white space-y-8">
					{questions.map((q: any) => (
						<SurveyQuestion
							key={q.id}
							question={q}
							value={answers[q.id]}
							onChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
						/>
					))}
				</div>

				{/* Footer */}
				<div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
					<button 
						onClick={onClose}
						className="px-6 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 w-full sm:w-auto transition-colors"
					>
						Ahora no
					</button>
					<button 
						onClick={handleSubmit}
						disabled={!isValid || isSubmitting}
						className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto transition-colors shadow-md flex items-center justify-center gap-2"
					>
						{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
						Enviar respuestas
					</button>
				</div>
			</div>
		</div>
	);
}
