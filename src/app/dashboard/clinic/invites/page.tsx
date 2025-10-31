import prisma from '@/lib/prisma';
import InviteListPage from '@/components/InviteListPage';
import { cookies } from 'next/headers';
import createSupabaseServerClient from '@/app/adapters/server'; // no pasamos cookies aquí

type SerializedInvite = {
	id: string;
	email: string;
	token: string;
	role: string;
	used: boolean;
	expiresAt: string; // ISO string (vacío si null)
	createdAt: string; // ISO string
};

export async function getCurrentOrganizationId(): Promise<string | null> {
	try {
		const { supabase } = createSupabaseServerClient();

		const sessionResp = await supabase.auth.getSession();
		console.log('DEBUG supabase.auth.getSession ->', sessionResp);

		let userResp = await supabase.auth.getUser();
		console.log('DEBUG supabase.auth.getUser (initial) ->', userResp);

		if (!userResp?.data?.user) {
			try {
				const cookieStore = await cookies();
				const accessToken = cookieStore.get('sb-access-token')?.value ?? null;

				if (accessToken) {
					console.log('DEBUG: reintentando getUser con sb-access-token desde cookies');
					userResp = await supabase.auth.getUser(accessToken);
					console.log('DEBUG supabase.auth.getUser (from cookie) ->', userResp);
				}
			} catch (e) {
				console.warn('DEBUG: error leyendo cookies para supabase token', e);
			}
		}

		const user = (userResp as any)?.data?.user ?? null;

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

	// Definimos localmente el tipo que corresponde a la selección hecha por prisma.findMany
	type InviteSelect = {
		id: string;
		email: string | null;
		token: string;
		role: string;
		used: boolean;
		expiresAt: Date | null;
		createdAt: Date;
	};

	const invitesRaw = (await prisma.invite.findMany({
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
	})) as InviteSelect[];

	// Mapeamos y serializamos (asegurando no-break si hay nulls)
	const invites: SerializedInvite[] = invitesRaw.map((i) => ({
		id: i.id,
		email: i.email ?? '', // evita nulls en la UI
		token: i.token,
		role: i.role,
		used: !!i.used,
		expiresAt: i.expiresAt ? i.expiresAt.toISOString() : '',
		createdAt: i.createdAt.toISOString(),
	}));

	return (
		<div className="max-w-7xl mx-auto p-6">
			<InviteListPage initialInvites={invites} organizationId={organizationId} />
		</div>
	);
}
