'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, Heart, MessageCircle, Star, Loader2, Check } from 'lucide-react';

interface RatingOption {
	value: 'yes' | 'no' | 'maybe';
	label: string;
	emoji: string;
	color: string;
	bgColor: string;
}

const ratingOptions: RatingOption[] = [
	{
		value: 'yes',
		label: 'Sí',
		emoji: '✅',
		color: 'text-green-700',
		bgColor: 'bg-green-50 hover:bg-green-100 border-green-300',
	},
	{
		value: 'no',
		label: 'No',
		emoji: '❌',
		color: 'text-red-700',
		bgColor: 'bg-red-50 hover:bg-red-100 border-red-300',
	},
	{
		value: 'maybe',
		label: 'Tal vez',
		emoji: '🤔',
		color: 'text-yellow-700',
		bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300',
	},
];

const questions = [
	{
		id: 'communication',
		title: 'Sobre la Comunicación',
		question: '¿El doctor le explicó su diagnóstico y los pasos a seguir de una manera clara y fácil de entender?',
		description: 'Evalúa si el paciente salió de la consulta sabiendo qué tiene y qué debe hacer.',
		icon: MessageCircle,
		color: 'from-blue-500 to-cyan-500',
	},
	{
		id: 'attention',
		title: 'Sobre la Atención y el Trato',
		question: '¿Sintió que el doctor escuchó sus inquietudes con atención y le dedicó el tiempo suficiente?',
		description: 'Evalúa la empatía y la calidad de la atención humana.',
		icon: Heart,
		color: 'from-pink-500 to-rose-500',
	},
	{
		id: 'satisfaction',
		title: 'Satisfacción General (NPS)',
		question: 'Basado en su experiencia de hoy, ¿recomendaría este doctor a un familiar o amigo?',
		description: 'Es la métrica definitiva de confianza y satisfacción.',
		icon: Star,
		color: 'from-amber-500 to-orange-500',
	},
];

export default function RateConsultationPage() {
	const [consultationId, setConsultationId] = useState<string | null>(null);
	const [ratings, setRatings] = useState<{
		communication: 'yes' | 'no' | 'maybe' | null;
		attention: 'yes' | 'no' | 'maybe' | null;
		satisfaction: 'yes' | 'no' | 'maybe' | null;
	}>({
		communication: null,
		attention: null,
		satisfaction: null,
	});
	const [comments, setComments] = useState('');
	const [loading, setLoading] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [alreadyRated, setAlreadyRated] = useState(false);

	useEffect(() => {
		// Obtener consultation_id de la URL
		const params = new URLSearchParams(window.location.search);
		const id = params.get('consultation_id');
		if (id) {
			setConsultationId(id);
			// Verificar si ya fue calificada
			checkIfAlreadyRated(id);
		} else {
			setError('No se proporcionó un ID de consulta válido');
		}
	}, []);

	const checkIfAlreadyRated = async (id: string) => {
		try {
			const res = await fetch(`/api/consultations/ratings?consultation_id=${id}`);
			const data = await res.json();
			if (data.rating) {
				setAlreadyRated(true);
			}
		} catch (err) {
			console.error('Error verificando calificación:', err);
		}
	};

	const handleRating = (questionId: string, value: 'yes' | 'no' | 'maybe') => {
		setRatings((prev) => ({
			...prev,
			[questionId]: value,
		}));
	};

	const handleSubmit = async () => {
		if (!consultationId) {
			setError('No se proporcionó un ID de consulta válido');
			return;
		}

		if (!ratings.communication || !ratings.attention || !ratings.satisfaction) {
			setError('Por favor, responda todas las preguntas');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/consultations/ratings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					consultation_id: consultationId,
					communication_rating: ratings.communication,
					attention_rating: ratings.attention,
					satisfaction_rating: ratings.satisfaction,
					comments: comments.trim() || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al enviar la calificación');
			}

			setSubmitted(true);
		} catch (err) {
			console.error('Error enviando calificación:', err);
			setError(err instanceof Error ? err.message : 'Error al enviar la calificación');
		} finally {
			setLoading(false);
		}
	};

	if (alreadyRated) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
				>
					<CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias!</h2>
					<p className="text-gray-600">Ya has calificado esta consulta. Tu opinión es muy valiosa para nosotros.</p>
				</motion.div>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
				>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: 'spring' }}
					>
						<CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
					</motion.div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu calificación!</h2>
					<p className="text-gray-600 mb-4">Tu opinión es muy valiosa para nosotros y nos ayuda a mejorar continuamente.</p>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-4xl"
					>
						⭐ 🙏 💙
					</motion.div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 py-12 px-4">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center mb-8"
				>
					<h1 className="text-4xl font-bold text-gray-900 mb-2">⭐ Califica tu Atención</h1>
					<p className="text-lg text-gray-600">Tu opinión nos ayuda a mejorar continuamente</p>
				</motion.div>

				{/* Error Message */}
				<AnimatePresence>
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6"
						>
							{error}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Questions */}
				<div className="space-y-6">
					{questions.map((q, index) => {
						const Icon = q.icon;
						const currentRating = ratings[q.id as keyof typeof ratings];

						return (
							<motion.div
								key={q.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
							>
								<div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${q.color} mb-4`}>
									<Icon className="w-8 h-8 text-white" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">{q.title}</h3>
								<p className="text-lg text-gray-700 mb-2">{q.question}</p>
								<p className="text-sm text-gray-500 mb-6">{q.description}</p>

								{/* Rating Options */}
								<div className="grid grid-cols-3 gap-4">
									{ratingOptions.map((option) => {
										const isSelected = currentRating === option.value;
										return (
											<motion.button
												key={option.value}
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
												onClick={() => handleRating(q.id, option.value)}
												className={`
													p-4 rounded-xl border-2 transition-all
													${isSelected 
														? `${option.bgColor} border-2 border-current shadow-lg transform scale-105` 
														: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
													}
												`}
											>
												<div className="text-4xl mb-2">{option.emoji}</div>
												<div className={`font-semibold ${isSelected ? option.color : 'text-gray-600'}`}>
													{option.label}
												</div>
												{isSelected && (
													<motion.div
														initial={{ scale: 0 }}
														animate={{ scale: 1 }}
														className="mt-2"
													>
														<Check className="w-5 h-5 mx-auto text-green-600" />
													</motion.div>
												)}
											</motion.button>
										);
									})}
								</div>
							</motion.div>
						);
					})}
				</div>

				{/* Comments Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mt-6"
				>
					<h3 className="text-xl font-bold text-gray-900 mb-4">Comentarios adicionales (opcional)</h3>
					<textarea
						value={comments}
						onChange={(e) => setComments(e.target.value)}
						placeholder="¿Tienes algún comentario adicional sobre tu experiencia?"
						className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
						rows={4}
					/>
				</motion.div>

				{/* Submit Button */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="mt-8 text-center"
				>
					<button
						onClick={handleSubmit}
						disabled={loading || !ratings.communication || !ratings.attention || !ratings.satisfaction}
						className={`
							px-8 py-4 rounded-xl font-bold text-lg text-white
							bg-gradient-to-r from-purple-600 to-pink-600
							hover:from-purple-700 hover:to-pink-700
							shadow-lg hover:shadow-xl
							transition-all transform hover:scale-105
							disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
							inline-flex items-center gap-2
						`}
					>
						{loading ? (
							<>
								<Loader2 className="w-5 h-5 animate-spin" />
								Enviando...
							</>
						) : (
							<>
								<Star className="w-5 h-5" />
								Enviar Calificación
							</>
						)}
					</button>
				</motion.div>
			</div>
		</div>
	);
}

