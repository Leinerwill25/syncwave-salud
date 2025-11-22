// API endpoint to upload images for consultations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function POST(req: NextRequest) {
	try {
		const { supabase } = createSupabaseServerClient();
		const formData = await req.formData();
		const file = formData.get('file') as File;
		const consultationId = formData.get('consultation_id') as string;
		const fileName = formData.get('file_name') as string;

		if (!file || !consultationId) {
			return NextResponse.json({ error: 'Archivo y consultation_id son requeridos' }, { status: 400 });
		}

		// Generate unique file path
		const fileExt = file.name.split('.').pop();
		const filePath = `consultations/${consultationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

		// Upload to Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('consultation-images')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: false,
			});

		if (uploadError) {
			console.error('Error uploading to storage:', uploadError);
			return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
		}

		// Get public URL
		const { data: urlData } = supabase.storage.from('consultation-images').getPublicUrl(filePath);

		// Store reference in consultation vitals or create a separate table
		// For now, we'll store it in the consultation vitals JSONB field
		const { data: consultation } = await supabase.from('consultation').select('vitals').eq('id', consultationId).single();

		const vitals = consultation?.vitals || {};
		const images = vitals.images || [];
		images.push({
			id: uploadData.path,
			url: urlData.publicUrl,
			name: fileName || file.name,
			type: file.type,
			size: file.size,
			uploadedAt: new Date().toISOString(),
		});

		const { error: updateError } = await supabase
			.from('consultation')
			.update({ vitals: { ...vitals, images } })
			.eq('id', consultationId);

		if (updateError) {
			console.error('Error updating consultation:', updateError);
			return NextResponse.json({ error: 'Error al guardar referencia' }, { status: 500 });
		}

		return NextResponse.json(
			{
				id: uploadData.path,
				url: urlData.publicUrl,
				name: fileName || file.name,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('❌ Error POST /consultations/upload-image:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { supabase } = createSupabaseServerClient();
		const url = new URL(req.url);
		const imageId = url.searchParams.get('id');

		if (!imageId) {
			return NextResponse.json({ error: 'ID de imagen requerido' }, { status: 400 });
		}

		// Delete from storage
		const { error: deleteError } = await supabase.storage.from('consultation-images').remove([imageId]);

		if (deleteError) {
			console.error('Error deleting from storage:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error DELETE /consultations/upload-image:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

