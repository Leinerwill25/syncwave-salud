'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Copy, Check } from 'lucide-react';

export default function FamilyCodesPage() {
	const [loading, setLoading] = useState(true);
	const [code, setCode] = useState<string>('');
	const [remainingSeconds, setRemainingSeconds] = useState(30);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		loadCode();
		const interval = setInterval(() => {
			loadCode();
		}, 30000); // Recargar cada 30 segundos

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		// Actualizar código cada vez que remainingSeconds llegue a 0
		if (remainingSeconds === 0) {
			loadCode();
		}
	}, [remainingSeconds]);

	useEffect(() => {
		if (remainingSeconds > 0) {
			const timer = setTimeout(() => {
				setRemainingSeconds(prev => {
					if (prev <= 1) {
						loadCode();
						return 30;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [remainingSeconds]);

	const loadCode = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/access-code', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar código');

			const data = await res.json();
			setCode(data.code);
			setRemainingSeconds(data.remainingSeconds || 30);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleRegenerate = async () => {
		if (!confirm('¿Está seguro de que desea regenerar el código? El código anterior dejará de funcionar.')) {
			return;
		}

		try {
			const res = await fetch('/api/patient/access-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'regenerate' }),
			});

			if (!res.ok) throw new Error('Error al regenerar código');

			loadCode();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al regenerar el código');
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<Shield className="w-8 h-8 text-purple-600" />
						Códigos de Acceso Médico
					</h1>
					<p className="text-gray-600">
						Comparte este código con especialistas para que puedan acceder temporalmente a tu información médica
					</p>
				</div>

				{/* Código TOTP */}
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="text-center">
						<div className="mb-6">
							<div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-4">
								{loading ? (
									<div className="animate-pulse text-white text-2xl font-bold">...</div>
								) : (
									<span className="text-white text-4xl font-bold tracking-widest">{code}</span>
								)}
							</div>
						</div>

						<div className="mb-6">
							<div className="flex items-center justify-center gap-2 mb-2">
								<div className={`w-3 h-3 rounded-full ${remainingSeconds > 10 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
								<span className="text-sm text-gray-600">
									El código se actualiza en {remainingSeconds} segundos
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
									style={{ width: `${(remainingSeconds / 30) * 100}%` }}
								></div>
							</div>
						</div>

						<div className="flex items-center justify-center gap-4">
							<button
								onClick={handleCopy}
								className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
							>
								{copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
								{copied ? 'Copiado' : 'Copiar Código'}
							</button>
							<button
								onClick={handleRegenerate}
								className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
							>
								<RefreshCw className="w-5 h-5" />
								Regenerar
							</button>
						</div>
					</div>
				</div>

				{/* Información */}
				<div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
					<h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
					<ul className="space-y-2 text-sm text-blue-800">
						<li>• El código se regenera automáticamente cada 30 segundos</li>
						<li>• Comparte este código con especialistas médicos cuando necesites que accedan a tu información</li>
						<li>• El código es válido por 30 segundos</li>
						<li>• Puedes regenerar el código en cualquier momento</li>
						<li>• El acceso médico es temporal y seguro</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
