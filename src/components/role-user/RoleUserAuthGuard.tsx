'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

interface RoleUserSession {
	roleUserId: string;
	roleId: string;
	organizationId: string;
	firstName: string;
	lastName: string;
	identifier: string;
	roleName: string;
	permissions: Array<{
		id: string;
		module: string;
		permissions: Record<string, boolean>;
	}>;
}

export default function RoleUserAuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [session, setSession] = useState<RoleUserSession | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkSession();
	}, []);

	const checkSession = async () => {
		try {
			const res = await fetch('/api/role-users/login', {
				credentials: 'include',
			});

			if (!res.ok) {
				router.push('/login/role-user');
				return;
			}

			const data = await res.json();
			if (data.authenticated && data.user) {
				setSession({
					roleUserId: data.user.id,
					roleId: data.user.role.id,
					organizationId: data.user.organizationId,
					firstName: data.user.firstName,
					lastName: data.user.lastName,
					identifier: data.user.identifier,
					roleName: data.user.role.name,
					permissions: data.user.permissions || [],
				});
			} else {
				router.push('/login/role-user');
			}
		} catch (err) {
			console.error('[Role User Auth] Error:', err);
			router.push('/login/role-user');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
					<p className="text-slate-600">Verificando sesión...</p>
				</div>
			</div>
		);
	}

	if (!session) {
		return null;
	}

	return <>{children}</>;
}

