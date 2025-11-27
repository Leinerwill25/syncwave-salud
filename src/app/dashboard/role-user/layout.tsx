import React from 'react';
import RoleUserAuthGuard from '@/components/role-user/RoleUserAuthGuard';
import RoleUserSidebar from './components/RoleUserSidebar';

export const metadata = {
	title: 'Dashboard — Personal',
};

export default function RoleUserLayout({ children }: { children: React.ReactNode }) {
	return (
		<RoleUserAuthGuard>
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 w-full max-w-full overflow-x-hidden">
				<div className="max-w-7xl mx-auto p-4 md:p-6 pt-16 md:pt-4">
					<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
						<RoleUserSidebar />
						<div className="flex flex-col gap-4">
							<main className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex-1">{children}</main>
						</div>
					</div>
				</div>
			</div>
		</RoleUserAuthGuard>
	);
}

