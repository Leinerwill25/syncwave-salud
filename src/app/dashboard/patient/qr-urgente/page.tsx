'use client';

// Página del dashboard del paciente para generar y ver su código QR de emergencia

import { useState, useEffect } from 'react';
import { QrCode, Download, RefreshCw, AlertCircle, CheckCircle, XCircle, Copy, Shield, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import EmergencyCard from '@/components/patient/EmergencyCard';

// Función para generar URL del QR usando servicio público
function generateQRCode(value: string, size: number = 256): string {
	// Usaremos una URL de servicio QR público como fallback
	// En producción, podrías usar una librería como qrcode
	return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

type QRData = {
	token: string;
	enabled: boolean;
	url: string;
};

type PatientCardData = {
	firstName: string;
	lastName: string;
	fullName: string;
	identifier?: string | null;
	dob?: string | null;
	age?: number | null;
	gender?: string | null;
	phone?: string | null;
	bloodType?: string | null;
	allergies?: string | null;
	emergencyContact?: {
		name: string | null;
		phone: string | null;
		relationship: string | null;
	} | null;
};

export default function QREmergencyPage() {
	const [loading, setLoading] = useState(true);
	const [qrData, setQrData] = useState<QRData | null>(null);
	const [patientData, setPatientData] = useState<PatientCardData | null>(null);
	const [toggling, setToggling] = useState(false);
	const [regenerating, setRegenerating] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setLoading(true);
			const [qrResponse, cardResponse] = await Promise.all([
				fetch('/api/patient/emergency-qr'),
				fetch('/api/patient/card-data'),
			]);

			if (!qrResponse.ok) {
				throw new Error('Error al cargar datos del QR');
			}
			const qrData = await qrResponse.json();
			setQrData(qrData);

			if (cardResponse.ok) {
				const cardData = await cardResponse.json();
				setPatientData(cardData);
			}
		} catch (error: any) {
			console.error('Error loading data:', error);
			toast.error('Error al cargar los datos');
		} finally {
			setLoading(false);
		}
	};

	const toggleQR = async (enabled: boolean) => {
		try {
			setToggling(true);
			const response = await fetch('/api/patient/emergency-qr', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled }),
			});

			if (!response.ok) {
				throw new Error('Error al actualizar estado del QR');
			}

			const data = await response.json();
			setQrData({ ...qrData!, ...data });
			toast.success(enabled ? 'QR de emergencia habilitado' : 'QR de emergencia deshabilitado');
		} catch (error: any) {
			console.error('Error toggling QR:', error);
			toast.error('Error al actualizar el estado del QR');
		} finally {
			setToggling(false);
		}
	};

	const regenerateToken = async () => {
		if (!confirm('¿Estás seguro de regenerar el código QR? El código anterior dejará de funcionar.')) {
			return;
		}

		try {
			setRegenerating(true);
			const response = await fetch('/api/patient/emergency-qr', {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Error al regenerar token');
			}

			const data = await response.json();
			setQrData({ ...qrData!, ...data });
			toast.success('Código QR regenerado exitosamente');
		} catch (error: any) {
			console.error('Error regenerating token:', error);
			toast.error('Error al regenerar el código QR');
		} finally {
			setRegenerating(false);
		}
	};

	const copyURL = () => {
		if (!qrData?.url) return;
		navigator.clipboard.writeText(qrData.url);
		toast.success('URL copiada al portapapeles');
	};

	const downloadQR = () => {
		if (!qrData?.url) return;
		const img = document.getElementById('qr-code-img') as HTMLImageElement;
		if (!img || !img.src) return;

		// Crear un enlace temporal para descargar la imagen
		const a = document.createElement('a');
		a.href = img.src;
		a.download = `qr-emergencia-${qrData.token.substring(0, 8)}.png`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!qrData) {
		return (
			<div className="bg-white rounded-xl shadow-md p-6">
				<div className="text-center text-red-600">
					<XCircle className="w-12 h-12 mx-auto mb-4" />
					<p>Error al cargar los datos del código QR</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white rounded-xl shadow-md p-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
							<QrCode className="w-8 h-8 text-indigo-600" />
							Código QR de Emergencia
						</h1>
						<p className="text-slate-600">
							Genera un código QR personalizado para que en caso de emergencia, los médicos puedan acceder
							rápidamente a tu información médica crítica.
						</p>
					</div>
					<div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
						qrData.enabled 
							? 'bg-green-100 text-green-700' 
							: 'bg-slate-100 text-slate-600'
					}`}>
						{qrData.enabled ? (
							<CheckCircle className="w-5 h-5" />
						) : (
							<XCircle className="w-5 h-5" />
						)}
						<span className="font-medium">
							{qrData.enabled ? 'Habilitado' : 'Deshabilitado'}
						</span>
					</div>
				</div>
			</div>

			{/* Información de seguridad */}
			<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
				<div className="flex items-start gap-3">
					<Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
					<div className="text-sm text-blue-900">
						<p className="font-semibold mb-1">Información de Seguridad</p>
						<p>
							Tu código QR solo muestra información médica crítica necesaria para emergencias.
							Puedes deshabilitarlo o regenerarlo en cualquier momento. Solo funciona cuando está habilitado.
						</p>
					</div>
				</div>
			</div>

			{/* QR Code Display */}
			<div className="bg-white rounded-xl shadow-md p-8">
				<div className="max-w-2xl mx-auto">
					<div className="flex flex-col md:flex-row gap-8 items-start">
						{/* QR Code */}
						<div className="flex-shrink-0">
							<div className="bg-white p-4 rounded-lg border-2 border-slate-200 inline-block">
								{qrData.enabled ? (
									<div className="w-64 h-64 flex items-center justify-center">
										<img
											id="qr-code-img"
											src={generateQRCode(qrData.url, 256)}
											alt="Código QR de Emergencia"
											className="w-full h-full object-contain"
										/>
									</div>
								) : (
									<div className="w-64 h-64 bg-slate-100 flex items-center justify-center rounded-lg">
										<div className="text-center">
											<XCircle className="w-16 h-16 text-slate-400 mx-auto mb-2" />
											<p className="text-slate-500 text-sm">QR Deshabilitado</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Información y acciones */}
						<div className="flex-1 space-y-4">
							<div>
								<h2 className="text-lg font-semibold text-slate-900 mb-2">URL del QR</h2>
								<div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
									<code className="flex-1 text-sm text-slate-700 break-all">{qrData.url}</code>
									<button
										onClick={copyURL}
										className="p-2 hover:bg-slate-200 rounded transition"
										title="Copiar URL"
									>
										<Copy className="w-4 h-4 text-slate-600" />
									</button>
								</div>
							</div>

							<div className="space-y-2">
								<button
									onClick={() => toggleQR(!qrData.enabled)}
									disabled={toggling}
									className={`w-full px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
										qrData.enabled
											? 'bg-red-600 hover:bg-red-700 text-white'
											: 'bg-green-600 hover:bg-green-700 text-white'
									} disabled:opacity-50 disabled:cursor-not-allowed`}
								>
									{toggling ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Procesando...
										</>
									) : qrData.enabled ? (
										<>
											<XCircle className="w-5 h-5" />
											Deshabilitar QR
										</>
									) : (
										<>
											<CheckCircle className="w-5 h-5" />
											Habilitar QR
										</>
									)}
								</button>

								<button
									onClick={regenerateToken}
									disabled={regenerating || !qrData.enabled}
									className="w-full px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{regenerating ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Regenerando...
										</>
									) : (
										<>
											<RefreshCw className="w-5 h-5" />
											Regenerar Código
										</>
									)}
								</button>

								{qrData.enabled && (
									<button
										onClick={downloadQR}
										className="w-full px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
									>
										<Download className="w-5 h-5" />
										Descargar QR
									</button>
								)}
							</div>

							<div className="pt-4 border-t border-slate-200">
								<h3 className="text-sm font-semibold text-slate-900 mb-2">Instrucciones</h3>
								<ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
									<li>Habilita el QR para que funcione en emergencias</li>
									<li>Guarda el código QR en tu teléfono o imprímelo</li>
									<li>Lleva el QR contigo en caso de emergencias médicas</li>
									<li>Los médicos pueden escanearlo para acceder a tu información crítica</li>
									<li>Puedes deshabilitarlo o regenerarlo en cualquier momento</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Tarjeta de Emergencia Descargable */}
			{patientData && qrData && (
				<div className="bg-white rounded-xl shadow-md p-6">
					<div className="mb-6">
						<h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
							<CreditCard className="w-7 h-7 text-indigo-600" />
							Tarjeta de Emergencia Personalizada
						</h2>
						<p className="text-slate-600">
							Descarga tu tarjeta de emergencia médica personalizada para llevar en tu cartera o billetera.
							Esta tarjeta contiene información crítica y un código QR que puede ser vital en caso de emergencia médica.
						</p>
					</div>
					<div className="flex justify-center bg-slate-50 p-6 rounded-lg">
						<EmergencyCard data={{ ...patientData, qrUrl: qrData.url }} />
					</div>
					<div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
						<p className="text-sm text-blue-900 mb-2">
							<strong>¿Cómo funciona?</strong>
						</p>
						<p className="text-sm text-blue-800">
							Esta tarjeta contiene información médica esencial que los profesionales de salud pueden consultar 
							rápidamente en caso de emergencia. Incluye datos críticos como tipo de sangre, alergias, contacto 
							de emergencia y un código QR que proporciona acceso completo a tu historial médico. 
							<strong className="block mt-2">Llévala siempre contigo en tu cartera o billetera.</strong>
						</p>
					</div>
				</div>
			)}

			{/* Vista previa del contenido */}
			<div className="bg-white rounded-xl shadow-md p-6">
				<h2 className="text-lg font-semibold text-slate-900 mb-4">Vista Previa del Contenido</h2>
				<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
					<p className="text-sm text-slate-600 mb-3">
						Los médicos verán la siguiente información al escanear tu QR:
					</p>
					<ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
						<li>Información básica (nombre, edad, identificación, tipo de sangre)</li>
						<li>Alergias conocidas (si aplica)</li>
						<li>Medicaciones activas</li>
						<li>Condiciones crónicas y discapacidades</li>
						<li>Últimos signos vitales registrados</li>
						<li>Resultados de laboratorio críticos</li>
						<li>Última consulta médica</li>
						<li>Contacto de emergencia</li>
						<li>Directivas anticipadas (si aplica)</li>
					</ul>
					<a
						href={qrData.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
					>
						Ver vista previa completa
					</a>
				</div>
			</div>
		</div>
	);
}

