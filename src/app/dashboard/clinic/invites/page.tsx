import InviteListPage from '@/components/InviteListPage';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { tryRestoreSessionFromCookies } from '@/lib/auth-guards';
import { cookies } from 'next/headers';

type SerializedInvite = {
	id: string;
	email: string;
	token: string;
	role: string;
	used: boolean;
	expiresAt: string; // ISO string (vacío si null)
	createdAt: string; // ISO string
};

export async function getCurrentOrganizationId(supabase: any): Promise<string | null> {
	try {
		let { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			// Intentar restaurar sesión
			const cookieStore = await cookies();
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			
			if (restored) {
				const result = await supabase.auth.getUser();
				user = result.data.user;
				authError = result.error;
			}
		}

		if (authError || !user) {
			if (process.env.NODE_ENV !== 'production') console.log('No supabase session user found.');
			return null;
		}

		const { data: appUser, error } = await supabase
			.from('User')
			.select('organizationId')
			.eq('authId', user.id)
			.limit(1)
			.maybeSingle();

		if (error || !appUser?.organizationId) {
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
	const supabase = await createSupabaseServerClient();
	const organizationId = await getCurrentOrganizationId(supabase);

	if (!organizationId) {
		return (
			<div className="max-w-6xl mx-auto p-6">
				<div className="bg-white rounded-2xl p-8 shadow">
					<h1 className="text-2xl md:text-3xl font-bold text-slate-800">Invitaciones</h1>
					<p className="mt-3 text-slate-600">
						No se detectó la organización en la sesión. Asegúrate de que el usuario esté autenticado y que su <code>authId</code> esté guardado en la tabla <code>User.authId</code>.
					</p>
				</div>
			</div>
		);
	}

	const { data: invitesRaw, error } = await supabase
		.from('invite')
		.select('id, email, token, role, used, expiresAt, createdAt')
		.eq('organizationId', organizationId)
		.order('createdAt', { ascending: false });

	if (error) {
		console.error('Error fetching invites:', error);
		return <div>Error cargando invitaciones</div>;
	}

	// Mapeamos y serializamos
	const invites: SerializedInvite[] = (invitesRaw || []).map((i: any) => ({
		id: i.id,
		email: i.email ?? '',
		token: i.token,
		role: i.role,
		used: !!i.used,
		expiresAt: i.expiresAt ? new Date(i.expiresAt).toISOString() : '',
		createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : new Date().toISOString(),
	}));

	return (
		<div className="max-w-7xl mx-auto p-6">
			<InviteListPage initialInvites={invites} organizationId={organizationId} />
		</div>
	);
}
