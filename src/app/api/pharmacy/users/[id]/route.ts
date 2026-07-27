// app/api/pharmacy/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteParams) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const body = await req.json().catch(() => ({}));
		const { used } = body;

		if (used === undefined) {
			return NextResponse.json({ message: 'El estado "used" es requerido' }, { status: 400 });
		}

		// Fetch the email of the target user first to verify ownership/origin
		const { data: targetUser, error: targetUserErr } = await supabase
			.from('users')
			.select('email')
			.eq('id', id)
			.eq('organizationId', user.organizationId)
			.maybeSingle();

		if (targetUserErr || !targetUser) {
			console.error('[API Pharmacy User PUT] Find user error:', targetUserErr);
			return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
		}

		// Check if the user is modifying themselves or a user they invited
		const isSelf = targetUser.email.toLowerCase() === user.email.toLowerCase();
		let isInvitedByMe = false;

		if (!isSelf) {
			const { data: inviteRecord } = await supabase
				.from('invite')
				.select('id')
				.eq('email', targetUser.email.toLowerCase())
				.eq('invitedById', user.userId)
				.eq('used', true)
				.maybeSingle();

			if (inviteRecord) {
				isInvitedByMe = true;
			}
		}

		if (!isSelf && !isInvitedByMe) {
			return NextResponse.json({ message: 'No tienes permisos para modificar este usuario (debe haber sido creado por ti)' }, { status: 403 });
		}

		// Update user row and check tenant isolation using organizationId
		const { data, error } = await supabase
			.from('users')
			.update({ used: !!used })
			.eq('id', id)
			.eq('organizationId', user.organizationId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('[API Pharmacy User PUT] Update error:', error);
			return NextResponse.json({ message: 'Error al actualizar el usuario' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Usuario no encontrado al intentar actualizar' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Pharmacy User PUT] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
