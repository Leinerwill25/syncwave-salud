'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertModalProps {
	isOpen: boolean;
	onClose: () => void;
	type: AlertType;
	title: string;
	message: string;
	onConfirm?: () => void;
	confirmText?: string;
	cancelText?: string;
	showCancel?: boolean;
}

const icons = {
	success: CheckCircle,
	error: AlertCircle,
	info: Info,
	warning: AlertTriangle,
};

const colors = {
	success: {
		bg: 'from-green-500 to-emerald-600',
		iconBg: 'bg-green-100',
		iconColor: 'text-green-600',
		button: 'bg-green-600 hover:bg-green-700',
	},
	error: {
		bg: 'from-red-500 to-rose-600',
		iconBg: 'bg-red-100',
		iconColor: 'text-red-600',
		button: 'bg-red-600 hover:bg-red-700',
	},
	info: {
		bg: 'from-blue-500 to-indigo-600',
		iconBg: 'bg-blue-100',
		iconColor: 'text-blue-600',
		button: 'bg-blue-600 hover:bg-blue-700',
	},
	warning: {
		bg: 'from-yellow-500 to-amber-600',
		iconBg: 'bg-yellow-100',
		iconColor: 'text-yellow-600',
		button: 'bg-yellow-600 hover:bg-yellow-700',
	},
};

export default function AlertModal({
	isOpen,
	onClose,
	type,
	title,
	message,
	onConfirm,
	confirmText = 'Aceptar',
	cancelText = 'Cancelar',
	showCancel = false,
}: AlertModalProps) {
	const Icon = icons[type];
	const colorScheme = colors[type];

	const handleConfirm = () => {
		if (onConfirm) {
			onConfirm();
		}
		onClose();
	};

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
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					>
						{/* Modal */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
						>
							{/* Header */}
							<div className={`bg-gradient-to-r ${colorScheme.bg} text-white p-6`}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className={`p-3 ${colorScheme.iconBg} rounded-xl`}>
											<Icon className={`w-6 h-6 ${colorScheme.iconColor}`} />
										</div>
										<h2 className="text-2xl font-bold">{title}</h2>
									</div>
									<button
										onClick={onClose}
										className="p-2 hover:bg-white/20 rounded-lg transition-colors"
										aria-label="Cerrar"
									>
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Content */}
							<div className="p-6">
								<p className="text-gray-700 text-lg leading-relaxed">{message}</p>
							</div>

							{/* Actions */}
							<div className={`px-6 pb-6 flex gap-3 ${showCancel ? 'justify-end' : 'justify-center'}`}>
								{showCancel && (
									<button
										onClick={onClose}
										className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
									>
										{cancelText}
									</button>
								)}
								<button
									onClick={handleConfirm}
									className={`px-6 py-3 ${colorScheme.button} text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl`}
								>
									{confirmText}
								</button>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

