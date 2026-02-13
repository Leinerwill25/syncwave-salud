// app/api/consultations/upload-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const formData = await req.formData();
		const file = formData.get('file') as File;
		const consultationId = formData.get('consultation_id') as string;
		const fileName = formData.get('file_name') as string;

		if (!file || !consultationId) {
			return NextResponse.json({ error: 'Archivo y consultation_id son requeridos' }, { status: 400 });
		}

		// Generate unique file path
		const fileExt = file.name.split('.').pop();
		const filePath = `reports/${consultationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

		// Upload to Supabase Storage
		// Using 'consultation-files' bucket as a safe bet for general files, or 'consultation-images' if strict. 
        // I will try 'consultation-files'.
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('consultation-files')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: false,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			});

		if (uploadError) {
			console.error('Error uploading to storage:', uploadError);
            // Fallback to 'consultation-images' if 'consultation-files' doesn't exist (though semantic mismatch)
            // Or return error
			return NextResponse.json({ error: 'Error al subir archivo: ' + uploadError.message }, { status: 500 });
		}

		// Get public URL
		const { data: urlData } = supabase.storage.from('consultation-files').getPublicUrl(filePath);
		const publicURL = urlData?.publicUrl || null;

        if (!publicURL) {
            return NextResponse.json({ error: 'No se pudo obtener la URL pública' }, { status: 500 });
        }

		// Update consultation table with report_url
        const { error: updateError } = await supabase
            .from('consultation')
            .update({ report_url: publicURL })
            .eq('id', consultationId);

        if (updateError) {
             console.error('Error updating consultation report_url:', updateError);
             return NextResponse.json({ error: 'Error al actualizar la consulta' }, { status: 500 });
        }

		// Save reference in consultation_files table if it exists (optional but good for tracking)
		try {
			await supabase.from('consultation_files').insert([
				{
					consultation_id: consultationId,
					file_name: fileName || file.name,
					path: filePath,
					url: publicURL,
					size: file.size,
					content_type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					created_at: new Date().toISOString(),
				},
			]);
		} catch (err) {
			console.warn('No se pudo insertar en consultation_files (tabla puede no existir aún):', err);
		}

		return NextResponse.json(
			{
				id: uploadData.path,
				url: publicURL,
				name: fileName || file.name,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('❌ Error POST /consultations/upload-report:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}
