// components/NavbarSwitcher.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import PublicNavBar from '@/components/NavBar';
import DashboardNavBar from '@/components/DashboardNavBar';

export default function NavbarSwitcher() {
	const pathname = usePathname() ?? '/';
	const isDashboard = pathname.startsWith('/dashboard');
	const isSafecareLogin = pathname.startsWith('/safecare/login');

	if (isSafecareLogin) return null;

	return isDashboard ? <DashboardNavBar /> : <PublicNavBar />;
}
