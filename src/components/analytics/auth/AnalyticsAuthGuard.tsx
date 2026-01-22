'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AnalyticsAuthGuardProps {
	children: React.ReactNode;
}

export function AnalyticsAuthGuard({ children }: AnalyticsAuthGuardProps) {
	const router = useRouter();
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			const res = await fetch('/api/analytics/login', {
				method: 'GET',
				credentials: 'include',
			});

			const data = await res.json();

			if (data.authenticated) {
				setIsAuthenticated(true);
			} else {
				setIsAuthenticated(false);
				router.push('/login/analytics');
			}
		} catch (err) {
			console.error('[Analytics Auth Guard] Error:', err);
			setIsAuthenticated(false);
			router.push('/login/analytics');
		} finally {
			setLoading(false);
		}
	};

	if (loading || isAuthenticated === null) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="text-gray-600 mt-4">Verificando acceso...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null; // La redirección ya se hizo
	}

	return <>{children}</>;
}

