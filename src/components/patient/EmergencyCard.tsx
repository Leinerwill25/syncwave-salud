'use client';

// Componente de tarjeta de emergencia descargable
import { useState, useRef } from 'react';
import { Download, AlertCircle, Droplet, Phone, User, Calendar, CreditCard, Heart } from 'lucide-react';

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
	qrUrl?: string | null; // URL del código QR
};

type Props = {
	data: PatientCardData;
};

export default function EmergencyCard({ data }: Props) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [downloading, setDownloading] = useState(false);

	const downloadCard = async () => {
		if (!cardRef.current) return;

		try {
			setDownloading(true);
			
			// Importación dinámica de html2canvas
			const html2canvas = (await import('html2canvas')).default;
			
			// Obtener el elemento de la tarjeta
			const element = cardRef.current;
			
			// Convertir a canvas con configuración optimizada
			const canvas = await html2canvas(element, {
				backgroundColor: '#ffffff',
				scale: 3, // Alta resolución para buena calidad
				logging: false,
				useCORS: true,
				allowTaint: true,
				foreignObjectRendering: false,
				imageTimeout: 15000,
				removeContainer: true,
			});

			// Convertir canvas a dataURL directamente (más compatible)
			const dataUrl = canvas.toDataURL('image/png', 1.0);
			
			// Crear enlace de descarga
			const link = document.createElement('a');
			link.href = dataUrl;
			link.download = `tarjeta-emergencia-${data.identifier || 'paciente'}.png`;
			
			// Simular click para descargar
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
		} catch (error) {
			console.error('Error al descargar tarjeta:', error);
			// Mostrar error más detallado en consola para debugging
			if (error instanceof Error) {
				console.error('Error details:', error.message, error.stack);
			}
			alert(`Error al descargar la tarjeta: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, intenta de nuevo.`);
		} finally {
			setDownloading(false);
		}
	};

	// Generar URL del QR
	const qrImageUrl = data.qrUrl 
		? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.qrUrl)}`
		: null;

	return (
		<div className="space-y-4">
			{/* Tarjeta de emergencia - Diseño optimizado para cartera/billetera */}
			<div 
				ref={cardRef}
				className="mx-auto"
				style={{ 
					width: '85.6mm', // Tamaño de tarjeta de crédito estándar
					minHeight: '53.98mm',
					maxWidth: '100%',
					backgroundColor: '#ffffff',
					border: '2px solid #000000',
					borderRadius: '8px',
					boxSizing: 'border-box',
					display: 'block',
				}}
			>
				<div className="p-4 flex flex-col" style={{ backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' }}>
					{/* Header compacto */}
					<div className="mb-2 pb-2" style={{ borderBottom: '2px solid #000000' }}>
						<h2 className="font-bold text-xs leading-tight" style={{ color: '#000000' }}>
							⚠️ TARJETA DE EMERGENCIA MÉDICA
						</h2>
					</div>

					{/* Contenido principal - Grid de 2 columnas */}
					<div className="grid grid-cols-[1fr_auto] gap-3" style={{ width: '100%' }}>
						{/* Columna izquierda - Información */}
						<div className="space-y-1.5" style={{ width: '100%', overflow: 'visible', maxWidth: '100%' }}>
							{/* Nombre completo */}
							<div className="flex items-start gap-1.5" style={{ width: '100%' }}>
								<User className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#000000' }} />
								<p className="font-bold text-sm leading-tight flex-1" style={{ color: '#000000', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{data.fullName}</p>
							</div>

							{/* Información clave en grid compacto */}
							<div className="space-y-1 text-[10px]" style={{ width: '100%' }}>
								{data.identifier && (
									<div className="flex items-start gap-1.5" style={{ width: '100%' }}>
										<CreditCard className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" style={{ color: '#000000' }} />
										<span className="font-semibold flex-shrink-0" style={{ color: '#000000' }}>Cédula:</span>
										<span className="flex-1" style={{ color: '#000000', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{data.identifier}</span>
									</div>
								)}
								<div className="grid grid-cols-2 gap-x-2 gap-y-1">
									{(data.age !== null && data.age !== undefined) && (
										<div className="flex items-center gap-1">
											<Calendar className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#000000' }} />
											<span className="font-semibold" style={{ color: '#000000' }}>Edad:</span>
											<span style={{ color: '#000000' }}>{data.age}</span>
										</div>
									)}
									{data.gender && (
										<div className="flex items-center gap-1">
											<Heart className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#000000' }} />
											<span className="font-semibold" style={{ color: '#000000' }}>Sexo:</span>
											<span style={{ color: '#000000' }}>{data.gender}</span>
										</div>
									)}
								</div>
								{data.bloodType && (
									<div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border" style={{ backgroundColor: '#f0f0f0', borderColor: '#000000' }}>
										<Droplet className="w-3 h-3 flex-shrink-0" style={{ color: '#dc2626' }} />
										<span className="font-bold" style={{ color: '#000000' }}>Tipo de Sangre: {data.bloodType}</span>
									</div>
								)}
							</div>

							{/* Alergias - CRÍTICO */}
							{data.allergies && (
								<div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #000000' }}>
									<div className="flex items-start gap-1">
										<AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
										<div className="flex-1 min-w-0">
											<p className="font-bold text-[10px] mb-0.5 leading-tight" style={{ color: '#dc2626' }}>ALERGIAS:</p>
											<p className="text-[9px] leading-tight line-clamp-2" style={{ color: '#000000' }}>{data.allergies}</p>
										</div>
									</div>
								</div>
							)}

							{/* Contacto de emergencia */}
							{data.emergencyContact?.phone && (
								<div className="mt-1 pt-1" style={{ borderTop: '1px solid #000000' }}>
									<div className="flex items-center gap-1">
										<Phone className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#000000' }} />
										<span className="font-semibold text-[10px]" style={{ color: '#000000' }}>Emerg:</span>
										<span className="text-[9px]" style={{ color: '#000000', wordBreak: 'break-word' }}>{data.emergencyContact.phone}</span>
									</div>
								</div>
							)}
						</div>

						{/* Columna derecha - Código QR */}
						{qrImageUrl && (
							<div className="flex flex-col items-center justify-center">
								<div className="p-1.5 rounded shadow-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #000000' }}>
									<img 
										src={qrImageUrl}
										alt="Código QR de Emergencia"
										className="w-20 h-20 object-contain"
										crossOrigin="anonymous"
									/>
								</div>
								<p className="text-[8px] text-center mt-1 leading-tight" style={{ color: '#000000' }}>
									Escanea para<br/>más información
								</p>
							</div>
						)}
					</div>

					{/* Footer compacto */}
					<div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #000000' }}>
						<p className="text-[8px] leading-tight text-center" style={{ color: '#000000' }}>
							En caso de emergencia, mostrar esta tarjeta al personal médico
						</p>
					</div>
				</div>
			</div>

			{/* Botón de descarga */}
			<button
				onClick={downloadCard}
				disabled={downloading}
				className="w-full px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{downloading ? (
					<>
						<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
						Descargando...
					</>
				) : (
					<>
						<Download className="w-5 h-5" />
						Descargar Tarjeta de Emergencia
					</>
				)}
			</button>
		</div>
	);
}
