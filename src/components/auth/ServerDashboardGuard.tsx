// components/auth/ServerDashboardGuard.tsx
// Guard de servidor para proteger páginas de dashboard

import { redirect } from 'next/navigation';
import { requireRole, UserRole } from '@/lib/auth-guards';

interface ServerDashboardGuardProps {
	children: React.ReactNode;
	allowedRoles: UserRole[];
}

export default async function ServerDashboardGuard({ children, allowedRoles }: ServerDashboardGuardProps) {
	const user = await requireRole(allowedRoles);

	if (!user) {
		redirect('/login');
	}

	return <>{children}</>;
}

