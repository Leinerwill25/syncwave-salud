'use client';

// Página del dashboard del paciente para generar y ver su código QR de emergencia

import { useState, useEffect } from 'react';
import { QrCode, Download, RefreshCw, CheckCircle, XCircle, Copy, Shield, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import QREmergencyCard from './QREmergencyCard';

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
			// El API de POST podría no devolver el token/url si solo actualiza el estado
			// Así que recargamos los datos completos para estar seguros
			await loadData();
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
						{/* QR Code NATIVO (Sin dependencia externa) */}
						<div className="flex-shrink-0">
							<div className="bg-white p-6 rounded-2xl border-2 border-slate-100 inline-block shadow-sm">
								{qrData.enabled ? (
									<div className="w-64 h-64 flex items-center justify-center">
										<QRCodeSVG
											value={qrData.url}
											size={240}
											level="H"
											includeMargin={false}
											imageSettings={{
												src: "/3.png",
												height: 45,
												width: 45,
												excavate: true,
											}}
										/>
									</div>
								) : (
									<div className="w-64 h-64 bg-slate-50 flex items-center justify-center rounded-xl border border-dashed border-slate-200">
										<div className="text-center">
											<XCircle className="w-16 h-16 text-slate-300 mx-auto mb-2" />
											<p className="text-slate-400 text-sm font-medium">QR Deshabilitado</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Información y acciones */}
						<div className="flex-1 space-y-5">
							<div>
								<h2 className="text-lg font-semibold text-slate-900 mb-2">URL del QR</h2>
								<div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
									<code className="flex-1 text-xs text-slate-600 break-all">{qrData.url}</code>
									<button
										onClick={copyURL}
										className="p-2 hover:bg-slate-200 rounded transition"
										title="Copiar URL"
									>
										<Copy className="w-4 h-4 text-slate-500" />
									</button>
								</div>
							</div>

							<div className="space-y-3">
								<button
									onClick={() => toggleQR(!qrData.enabled)}
									disabled={toggling}
									className={`w-full px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
										qrData.enabled
											? 'bg-red-600 hover:bg-red-700 text-white'
											: 'bg-green-600 hover:bg-green-700 text-white'
									} disabled:opacity-50 shadow-lg shadow-black/5`}
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
									className="w-full px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50"
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
							</div>

							<div className="pt-4 border-t border-slate-100">
								<h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider text-[10px]">Instrucciones</h3>
								<ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
									<li>Habilita el QR para que funcione en emergencias</li>
									<li>Lleva el QR contigo en caso de emergencias médicas</li>
									<li>Los médicos pueden escanearlo para acceder a tu información crítica</li>
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
						</p>
					</div>
					<div className="flex justify-center bg-slate-50 p-8 rounded-2xl border border-slate-100">
						<QREmergencyCard patient={{ ...patientData, qrUrl: qrData.url }} />
					</div>
				</div>
			)}
		</div>
	);
}
