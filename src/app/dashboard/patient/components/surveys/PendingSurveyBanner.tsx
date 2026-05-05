'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { getPendingSurvey, dismissSurvey } from '@/lib/actions/surveys';
import SurveyModal from './SurveyModal';
import { ConsultationSurveyResponse } from '@/types/surveys';

export default function PendingSurveyBanner() {
	const [pendingSurvey, setPendingSurvey] = useState<ConsultationSurveyResponse | null>(null);
	const [count, setCount] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const loadPending = async () => {
		try {
			const res = await getPendingSurvey();
			if (res.data) {
				setPendingSurvey(res.data as ConsultationSurveyResponse);
				setCount(res.count || 0);
				setIsVisible(true);
			} else {
				setPendingSurvey(null);
				setIsVisible(false);
			}
		} catch (error) {
			console.error('Error loading pending surveys:', error);
		}
	};

	useEffect(() => {
		loadPending();
	}, []);

	const handleDismiss = async () => {
		if (!pendingSurvey) return;
		setIsVisible(false);
		try {
			await dismissSurvey(pendingSurvey.id);
			// Load again in case there are more
			setTimeout(loadPending, 300);
		} catch (error) {
			console.error('Error dismissing survey:', error);
		}
	};

	if (!isVisible || !pendingSurvey) return null;

	const { consultation } = pendingSurvey as any;
	const doctorName = consultation?.doctor?.name || 'su médico';
	const dateStr = consultation?.started_at 
		? new Date(consultation.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
		: 'reciente';

	return (
		<>
			<div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 relative overflow-hidden group">
				{/* Decoration */}
				<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50 -mr-10 -mt-10 pointer-events-none" />
				
				<div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div className="flex items-start sm:items-center gap-4">
						<div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 text-indigo-600">
							<ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
						</div>
						<div>
							<h3 className="font-bold text-gray-900 text-sm sm:text-base">¿Cómo te fue en tu última consulta?</h3>
							<p className="text-xs sm:text-sm text-gray-600 mt-0.5">
								Tienes una encuesta pendiente de tu consulta con el <strong>Dr. {doctorName}</strong> el {dateStr}.
								{count > 1 && <span className="ml-1 text-indigo-600 font-medium">(y {count - 1} más)</span>}
							</p>
						</div>
					</div>
					
					<div className="flex items-center gap-3 w-full sm:w-auto">
						<button
							onClick={() => setModalOpen(true)}
							className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
						>
							Responder ahora
						</button>
						<button
							onClick={handleDismiss}
							className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
							title="Descartar"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>

			<SurveyModal 
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				surveyResponse={pendingSurvey}
				onSuccess={loadPending}
			/>
		</>
	);
}
