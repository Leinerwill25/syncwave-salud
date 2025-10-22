// src/app/invite/[token]/page.tsx
import React from 'react';
import prisma from '@/lib/prisma';
import InviteRegisterClient from '@/components/InviteRegisterClient';

type InviteRow = {
	id: string;
	email: string | null;
	token: string;
	role: string;
	used: boolean;
	expiresAt: Date;
	createdAt: Date;
	organizationId: string;
	organizationName?: string | null;
};

async function getInviteByToken(token: string): Promise<InviteRow | null> {
	if (!token) return null;

	// Traemos la invitación junto con el nombre de la organización (si existe relación)
	const invite = await prisma.invite.findUnique({
		where: { token },
		select: {
			id: true,
			email: true,
			token: true,
			role: true,
			used: true,
			expiresAt: true,
			createdAt: true,
			organizationId: true,
			// suponiendo que la relación en Prisma se llama `organization`
			organization: {
				select: {
					name: true,
				},
			},
		},
	});

	if (!invite) return null;

	return {
		id: invite.id,
		email: invite.email ?? null,
		token: invite.token,
		role: invite.role,
		used: invite.used,
		expiresAt: invite.expiresAt,
		createdAt: invite.createdAt,
		organizationId: invite.organizationId,
		organizationName: (invite as any).organization?.name ?? null,
	};
}

export default async function InvitePage({ params }: { params: { token: string } }) {
	const { token } = params;
	const invite = await getInviteByToken(token);

	if (!invite) {
		return (
			<div className="max-w-xl mx-auto p-6">
				<div className="bg-white p-6 rounded-lg shadow">Invitación no encontrada o inválida.</div>
			</div>
		);
	}

	const orgLabel = invite.organizationName ?? invite.organizationId;
	const expired = invite.expiresAt < new Date();

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
			<div className="w-full max-w-2xl">
				<div className="bg-white border border-slate-100 rounded-2xl shadow-md p-8">
					<div className="mb-6">
						<h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
							Registro como <span className="text-sky-600">{invite.role}</span>
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Estás siendo invitado a la clínica: <span className="font-medium text-slate-800">{orgLabel}</span>
						</p>
						<div className="mt-3 text-xs text-slate-400">
							Invitación generada: {invite.createdAt.toLocaleString()} • Expira: {invite.expiresAt.toLocaleString()}
						</div>
					</div>

					<div>
						{invite.used ? (
							<div className="rounded-md bg-rose-50 border border-rose-100 p-4 text-rose-800">Esta invitación ya fue usada.</div>
						) : expired ? (
							<div className="rounded-md bg-amber-50 border border-amber-100 p-4 text-amber-800">Esta invitación expiró el {invite.expiresAt.toLocaleString()}.</div>
						) : (
							<InviteRegisterClient
								invite={{
									token: invite.token,
									email: invite.email ?? '',
									role: invite.role,
									organizationId: invite.organizationId,
								}}
								organizationName={invite.organizationName ?? null}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
