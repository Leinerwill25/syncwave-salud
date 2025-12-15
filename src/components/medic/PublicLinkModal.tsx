'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ExternalLink, Share2, Sparkles, Globe, Instagram, Facebook, MessageCircle } from 'lucide-react';

interface PublicLinkModalProps {
	isOpen: boolean;
	onClose: () => void;
	organizationId: string | null;
}

export default function PublicLinkModal({ isOpen, onClose, organizationId }: PublicLinkModalProps) {
	const [copied, setCopied] = useState(false);
	const [publicUrl, setPublicUrl] = useState<string>('');

	useEffect(() => {
		if (isOpen && organizationId) {
			// Construir la URL pública
			const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
			const url = `${baseUrl}/c/${organizationId}`;
			setPublicUrl(url);
		}
	}, [isOpen, organizationId]);

	const handleCopy = async () => {
		if (!publicUrl) return;

		try {
			await navigator.clipboard.writeText(publicUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
			// Fallback para navegadores antiguos
			const textArea = document.createElement('textarea');
			textArea.value = publicUrl;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			} catch (e) {
				console.error('Error con fallback:', e);
			}
			document.body.removeChild(textArea);
		}
	};

	const handleShare = async () => {
		if (!publicUrl) return;

		if (navigator.share) {
			try {
				await navigator.share({
					title: 'Mi Consultorio - ASHIRA',
					text: 'Visita mi consultorio médico',
					url: publicUrl,
				});
			} catch (err) {
				// El usuario canceló o hubo un error
				console.log('Error compartiendo:', err);
			}
		} else {
			// Fallback: copiar al portapapeles
			handleCopy();
		}
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					>
						{/* Modal */}
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 20 }}
							onClick={(e) => e.stopPropagation()}
							className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
						>
							{/* Header con gradiente */}
							<div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-6 text-white relative overflow-hidden">
								{/* Patrón decorativo */}
								<div className="absolute inset-0 opacity-20">
									<div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16" />
									<div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12" />
								</div>
								<div className="relative z-10">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
												<Sparkles className="w-6 h-6" />
											</div>
											<h2 className="text-2xl font-bold">Link Público</h2>
										</div>
										<button
											onClick={onClose}
											className="p-2 hover:bg-white/20 rounded-lg transition-colors"
											aria-label="Cerrar"
										>
											<X className="w-5 h-5" />
										</button>
									</div>
									<p className="text-teal-50 text-sm">
										Comparte este enlace en tus redes sociales para que los pacientes conozcan tu consultorio
									</p>
								</div>
							</div>

							{/* Contenido */}
							<div className="p-6 space-y-6">
								{/* URL Display */}
								<div className="space-y-3">
									<label className="block text-sm font-semibold text-slate-700">Tu Link Público</label>
									<div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus-within:border-teal-500 transition">
										<Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
										<input
											type="text"
											value={publicUrl}
											readOnly
											className="flex-1 bg-transparent text-slate-700 text-sm font-mono focus:outline-none"
										/>
										<button
											onClick={handleCopy}
											className={`p-2 rounded-lg transition-all ${
												copied
													? 'bg-green-100 text-green-600'
													: 'bg-teal-100 text-teal-600 hover:bg-teal-200'
											}`}
											title={copied ? 'Copiado!' : 'Copiar'}
										>
											{copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
										</button>
									</div>
									{copied && (
										<motion.p
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-sm text-green-600 font-medium flex items-center gap-2"
										>
											<Check className="w-4 h-4" />
											¡Link copiado al portapapeles!
										</motion.p>
									)}
								</div>

								{/* Botones de acción */}
								<div className="grid grid-cols-2 gap-3">
									<button
										onClick={handleCopy}
										className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition hover:scale-105"
									>
										<Copy className="w-5 h-5" />
										{copied ? 'Copiado' : 'Copiar Link'}
									</button>
									<button
										onClick={handleShare}
										className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-teal-600 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition hover:scale-105"
									>
										<Share2 className="w-5 h-5" />
										Compartir
									</button>
								</div>

								{/* Sugerencias de uso */}
								<div className="pt-4 border-t border-slate-200">
									<p className="text-sm font-semibold text-slate-700 mb-3">Comparte en:</p>
									<div className="grid grid-cols-3 gap-2">
										<a
											href={`https://www.instagram.com/`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition hover:scale-105"
										>
											<Instagram className="w-5 h-5" />
											<span className="text-xs font-medium">Instagram</span>
										</a>
										<a
											href={`https://www.facebook.com/`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-col items-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:shadow-lg transition hover:scale-105"
										>
											<Facebook className="w-5 h-5" />
											<span className="text-xs font-medium">Facebook</span>
										</a>
										<a
											href={`https://wa.me/?text=${encodeURIComponent(`Visita mi consultorio: ${publicUrl}`)}`}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-col items-center gap-2 p-3 bg-green-500 text-white rounded-lg hover:shadow-lg transition hover:scale-105"
										>
											<MessageCircle className="w-5 h-5" />
											<span className="text-xs font-medium">WhatsApp</span>
										</a>
									</div>
								</div>

								{/* Preview Link */}
								<div className="pt-4 border-t border-slate-200">
									<a
										href={publicUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition group"
									>
										<span>Ver página pública</span>
										<ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</a>
								</div>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

