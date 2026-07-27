// app/api/pharmacy/users/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const supabase = await createSupabaseServerClient();

		// Fetch invites sent by this specific administrator
		const { data: invites, error: invitesErr } = await supabase
			.from('invite')
			.select('id, email, token, role, used, expiresAt, createdAt')
			.eq('organizationId', user.organizationId)
			.eq('invitedById', user.userId)
			.order('createdAt', { ascending: false });

		if (invitesErr) {
			console.error('[API Pharmacy Users GET] invitesError:', invitesErr);
			return NextResponse.json({ message: 'Error consultando invitaciones' }, { status: 500 });
		}

		// Find emails of users who registered from invitations created by this administrator
		const invitedEmails = (invites || [])
			.filter(inv => inv.used && inv.email)
			.map(inv => inv.email.toLowerCase());

		// Include the administrator's own email so they can see themselves in the list
		const allowedEmails = [user.email.toLowerCase(), ...invitedEmails];

		// Fetch active users in the pharmacy organization that match these allowed emails
		const { data: users, error: usersErr } = await supabase
			.from('users')
			.select('id, name, email, role, used, createdAt')
			.eq('organizationId', user.organizationId)
			.in('email', allowedEmails)
			.order('name', { ascending: true });

		if (usersErr) {
			console.error('[API Pharmacy Users GET] usersError:', usersErr);
			return NextResponse.json({ message: 'Error consultando usuarios' }, { status: 500 });
		}

		// Map to transform 'name' to 'fullName' and 'createdAt' to 'created_at' as expected by the frontend
		const mappedUsers = (users || []).map(u => ({
			id: u.id,
			fullName: u.name,
			email: u.email,
			role: u.role,
			used: u.used,
			created_at: u.createdAt
		}));

		return NextResponse.json({
			success: true,
			users: mappedUsers,
			invites: invites || []
		});
	} catch (e: any) {
		console.error('[API Pharmacy Users GET] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
