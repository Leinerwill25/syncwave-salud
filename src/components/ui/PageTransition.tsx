'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface PageTransitionProps {
	children: ReactNode;
	isLoading?: boolean;
}

/**
 * Componente para transiciones suaves entre páginas
 * Mejora la percepción de velocidad al mostrar un loading state optimizado
 */
export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
	const pathname = usePathname();

	return (
		<AnimatePresence mode="wait">
			{isLoading ? (
				<motion.div
					key="loading"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="flex items-center justify-center min-h-[400px]"
				>
					<div className="flex flex-col items-center gap-3">
						<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
						<p className="text-sm text-slate-600">Cargando...</p>
					</div>
				</motion.div>
			) : (
				<motion.div
					key={pathname}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ duration: 0.2, ease: 'easeOut' }}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

