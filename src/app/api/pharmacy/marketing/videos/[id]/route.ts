import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

interface RouteParams {
	params: Promise<{ id: string }>;
}

function getEmbedUrl(url: string): { embedUrl: string; platform: string } {
	const trimmed = url.trim();
	// YouTube check
	let match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
	if (match && match[1]) {
		return {
			embedUrl: `https://www.youtube.com/embed/${match[1]}`,
			platform: 'youtube'
		};
	}
	// YouTube shorts check
	match = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
	if (match && match[1]) {
		return {
			embedUrl: `https://www.youtube.com/embed/${match[1]}`,
			platform: 'youtube'
		};
	}

	// Instagram check
	match = trimmed.match(/instagram\.com\/(?:p|reel)\/([^"&?\/\s]+)/i);
	if (match && match[1]) {
		const postId = match[1].replace(/\/$/, '');
		return {
			embedUrl: `https://www.instagram.com/p/${postId}/embed`,
			platform: 'instagram'
		};
	}

	// Google Drive check
	match = trimmed.match(/drive\.google\.com\/file\/d\/([^"&?\/\s]+)/i);
	if (match && match[1]) {
		return {
			embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
			platform: 'googledrive'
		};
	}

	return {
		embedUrl: trimmed,
		platform: trimmed.includes('youtube') ? 'youtube' : trimmed.includes('instagram') ? 'instagram' : trimmed.includes('drive') ? 'googledrive' : 'other'
	};
}

export async function PUT(req: Request, { params }: RouteParams) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const body = await req.json().catch(() => ({}));
		const { title, video_url, sort_order, is_active } = body;

		if (!title || title.trim() === '') {
			return NextResponse.json({ message: 'El título es obligatorio' }, { status: 400 });
		}
		if (!video_url || video_url.trim() === '') {
			return NextResponse.json({ message: 'La URL del video es obligatoria' }, { status: 400 });
		}

		const { embedUrl, platform } = getEmbedUrl(video_url);

		const { data, error } = await supabase
			.from('pharmacy_videos')
			.update({
				title: title.trim(),
				video_url: video_url.trim(),
				platform,
				embed_url: embedUrl,
				sort_order: typeof sort_order === 'number' ? sort_order : 0,
				is_active: !!is_active
			})
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('[API Video PUT]', error);
			return NextResponse.json({ message: 'Error al actualizar el video' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Video no encontrado' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Video PUT] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: RouteParams) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const { error } = await supabase
			.from('pharmacy_videos')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Video DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar el video' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Video eliminado' });
	} catch (e: any) {
		console.error('[API Video DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
