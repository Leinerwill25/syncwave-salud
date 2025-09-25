// src/app/invites/page.tsx
import React from 'react';
import prisma from '@/lib/prisma';
import InviteListPage from '@/components/InviteListPage';
import createSupabaseServerClient from '@/app/adapters/server'; // no pasamos cookies aquí

type SerializedInvite = {
	id: string;
	email: string;
	token: string;
	role: string;
	used: boolean;
	expiresAt: string; // ISO
	createdAt: string; // ISO
};

export async function getCurrentOrganizationId(): Promise<string | null> {
	try {
		// AWAIT al adapter (ahora async)
		const { supabase } = await createSupabaseServerClient();

		// DEBUG: comprobar sesión/usuario en el servidor
		const sessionResp = await supabase.auth.getSession();
		console.log('DEBUG supabase.auth.getSession ->', sessionResp);

		const userResp = await supabase.auth.getUser();
		console.log('DEBUG supabase.auth.getUser ->', userResp);

		const error = (userResp as any)?.error ?? null;
		const user = (userResp as any)?.data?.user ?? null;

		if (error) {
			if (process.env.NODE_ENV !== 'production') console.warn('supabase.auth.getUser error:', error);
			return null;
		}

		if (!user?.id) {
			if (process.env.NODE_ENV !== 'production') console.log('No supabase session user found.');
			return null;
		}

		const appUser = await prisma.user.findFirst({
			where: { authId: user.id },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			if (process.env.NODE_ENV !== 'production') console.warn('No app user or organizationId for authId=', user.id);
			return null;
		}

		return appUser.organizationId;
	} catch (err) {
		console.error('getCurrentOrganizationId error:', err);
		return null;
	}
}
export default async function InvitesPage() {
	const organizationId = await getCurrentOrganizationId();

	if (!organizationId) {
		return (
			<div className="max-w-6xl mx-auto p-6">
				<div className="bg-white rounded-2xl p-8 shadow">
					<h1 className="text-2xl md:text-3xl font-bold text-slate-800">Invitaciones</h1>
					<p className="mt-3 text-slate-600">
						No se detectó la organización en la sesión. Asegúrate de que el usuario esté autenticado y que su <code>authId</code> esté guardado en la tabla <code>User.authId</code>.
					</p>
					<div className="mt-6 text-sm text-slate-500">
						Revisa que las cookies de sesión de Supabase estén llegando al servidor y que exista la relación <code>User.authId</code> → <code>User</code> en la base de datos.
					</div>
				</div>
			</div>
		);
	}

	// trae invitaciones asociadas y serializa fechas a ISO (InviteList espera strings)
	const invitesRaw = await prisma.invite.findMany({
		where: { organizationId },
		select: {
			id: true,
			email: true,
			token: true,
			role: true,
			used: true,
			expiresAt: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
	});

	const invites: SerializedInvite[] = invitesRaw.map((i) => ({
		id: i.id,
		email: i.email,
		token: i.token,
		role: i.role,
		used: i.used,
		expiresAt: i.expiresAt.toISOString(),
		createdAt: i.createdAt.toISOString(),
	}));

	return (
		<div className="max-w-7xl mx-auto p-6">
			<div className="bg-white rounded-2xl p-6 border shadow-sm">
				<h1 className="text-2xl font-bold text-slate-900 mb-2">Invitaciones</h1>
				<p className="text-sm text-slate-600 mb-4">Gestiona las invitaciones enviadas a especialistas.</p>

				{/* InviteListPage es client component — le pasamos initialInvites + organizationId */}
				<InviteListPage initialInvites={invites} organizationId={organizationId} />
			</div>
		</div>
	);
}
