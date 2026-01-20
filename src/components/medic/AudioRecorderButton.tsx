'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Check, X, AlertCircle } from 'lucide-react';

interface AudioRecorderButtonProps {
	consultationId: string;
	reportType: string;
	specialty: string;
	onSuccess?: (reportUrl: string, transcription?: string) => void;
	onError?: (error: string) => void;
	className?: string;
}

export default function AudioRecorderButton({
	consultationId,
	reportType,
	specialty,
	onSuccess,
	onError,
	className = '',
}: AudioRecorderButtonProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
	const [recordingTime, setRecordingTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const [progressMessage, setProgressMessage] = useState('Iniciando procesamiento...');
	
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			// Limpiar al desmontar
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
		};
	}, []);

	const startRecording = async () => {
		try {
			setError(null);
			setSuccess(null);
			setRecordedAudio(null);
			setAudioChunks([]);
			setRecordingTime(0);

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const recorder = new MediaRecorder(stream, {
				mimeType: 'audio/webm;codecs=opus',
			});

			const chunks: Blob[] = [];
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, { type: 'audio/webm' });
				setRecordedAudio(audioBlob);
				setAudioChunks([]);
			};

			recorder.start();
			setMediaRecorder(recorder);
			setIsRecording(true);

			// Iniciar temporizador
			timerRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);

		} catch (err: any) {
			console.error('Error al iniciar grabación:', err);
			setError('No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.');
			if (onError) {
				onError('Error al iniciar grabación');
			}
		}
	};

	const stopRecording = () => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			mediaRecorder.stream.getTracks().forEach((track) => track.stop());
			setIsRecording(false);

			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const handleSubmit = async () => {
		if (!recordedAudio) {
			setError('No hay audio grabado');
			return;
		}

		setIsProcessing(true);
		setError(null);
		setSuccess(null);
		setProgress(0);
		setProgressMessage('Subiendo audio...');

		// Simular progreso (aunque sea aproximado)
		let currentProgress = 0;
		progressIntervalRef.current = setInterval(() => {
			currentProgress += Math.random() * 3; // Incremento aleatorio entre 0-3%
			if (currentProgress >= 95) {
				currentProgress = 95; // No llegar a 100% hasta que termine
			}
			setProgress(currentProgress);

			// Cambiar mensaje según el progreso
			if (currentProgress < 20) {
				setProgressMessage('Subiendo audio...');
			} else if (currentProgress < 40) {
				setProgressMessage('Transcribiendo audio...');
			} else if (currentProgress < 60) {
				setProgressMessage('Analizando contenido...');
			} else if (currentProgress < 80) {
				setProgressMessage('Generando informe...');
			} else {
				setProgressMessage('Finalizando...');
			}
		}, 800); // Actualizar cada 800ms

		try {
			const formData = new FormData();
			formData.append('audio', recordedAudio, `audio-${Date.now()}.webm`);
			formData.append('reportType', reportType);
			formData.append('specialty', specialty);

			const response = await fetch(
				`/api/consultations/${consultationId}/generate-report-from-audio`,
				{
					method: 'POST',
					body: formData,
				}
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Error al procesar el audio');
			}

			// Obtener reportUrl de la respuesta
			const reportUrl = result.report_url || result.reportUrl;
			
			if (!reportUrl) {
				throw new Error('No se recibió la URL del informe generado');
			}

			// Limpiar intervalo de progreso
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			
			// Completar progreso
			setProgress(100);
			setProgressMessage('Informe generado exitosamente');
			
			setSuccess('Informe generado exitosamente');
			setRecordedAudio(null);

			if (onSuccess) {
				onSuccess(reportUrl, result.transcription);
			}

			// Descargar automáticamente el informe si está disponible
			if (reportUrl) {
				setTimeout(() => {
					try {
						// Intentar descargar usando fetch para obtener el blob
						fetch(reportUrl)
							.then(response => {
								if (!response.ok) throw new Error('Error al descargar el archivo');
								return response.blob();
							})
							.then(blob => {
								const url = window.URL.createObjectURL(blob);
								const link = document.createElement('a');
								link.href = url;
								link.download = `informe-consulta-${consultationId}-${new Date().toISOString().split('T')[0]}.docx`;
								link.style.display = 'none';
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
								// Limpiar la URL del objeto después de un tiempo
								setTimeout(() => window.URL.revokeObjectURL(url), 100);
							})
							.catch(downloadError => {
								console.warn('Error al descargar automáticamente:', downloadError);
								// Si falla, abrir en nueva pestaña como fallback
								window.open(reportUrl, '_blank');
							});
					} catch (error) {
						console.warn('Error al iniciar descarga automática:', error);
						// Si falla, abrir en nueva pestaña como fallback
						window.open(reportUrl, '_blank');
					}
				}, 1500); // Esperar 1.5 segundos para asegurar que el archivo esté disponible
			}

			// Limpiar después de 5 segundos
			setTimeout(() => {
				setSuccess(null);
			}, 5000);

		} catch (err: any) {
			// Limpiar intervalo de progreso
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			
			console.error('Error al enviar audio:', err);
			const errorMessage = err.message || 'Error al procesar el audio. Intenta nuevamente.';
			setError(errorMessage);
			setProgress(0);
			setProgressMessage('');
			if (onError) {
				onError(errorMessage);
			}
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancel = () => {
		setRecordedAudio(null);
		setError(null);
		setSuccess(null);
		if (mediaRecorder && isRecording) {
			stopRecording();
		}
	};

	return (
		<div className={`flex flex-col gap-3 ${className}`}>
			{/* Botón de grabar/detener */}
			{!recordedAudio && (
				<div className="flex items-center gap-3">
					{!isRecording ? (
						<button
							type="button"
							onClick={startRecording}
							disabled={isProcessing}
							className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Mic size={18} />
							<span>Grabar Audio</span>
						</button>
					) : (
						<button
							type="button"
							onClick={stopRecording}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
						>
							<Square size={18} />
							<span>Detener Grabación</span>
						</button>
					)}

					{isRecording && (
						<div className="flex items-center gap-2 text-red-600">
							<div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
							<span className="text-sm font-medium">{formatTime(recordingTime)}</span>
						</div>
					)}
				</div>
			)}

			{/* Audio grabado - Mostrar controles */}
			{recordedAudio && !isProcessing && (
				<div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<Check size={16} className="text-green-600" />
							<span>Audio grabado ({Math.round(recordedAudio.size / 1024)} KB)</span>
						</div>
						<audio
							src={URL.createObjectURL(recordedAudio)}
							controls
							className="max-w-xs"
						/>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isProcessing}
							className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isProcessing ? (
								<>
									<Loader2 size={18} className="animate-spin" />
									<span>Procesando...</span>
								</>
							) : (
								<>
									<Check size={18} />
									<span>Generar Informe desde Audio</span>
								</>
							)}
						</button>

						<button
							type="button"
							onClick={handleCancel}
							disabled={isProcessing}
							className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<X size={18} />
							<span>Cancelar</span>
						</button>
					</div>
				</div>
			)}

			{/* Mensajes de error y éxito */}
			{error && (
				<div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
					<AlertCircle size={16} />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
					<Check size={16} />
					<span>{success}</span>
				</div>
			)}

			{/* Pantalla de carga con barra de progreso */}
			{isProcessing && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
						<div className="flex flex-col items-center gap-6">
							<Loader2 size={48} className="animate-spin text-blue-600" />
							<div className="w-full">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
									Generando Informe
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
									{progressMessage}
								</p>
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300 ease-out rounded-full"
										style={{ width: `${progress}%` }}
									/>
								</div>
								<p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
									{Math.round(progress)}% completado
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

