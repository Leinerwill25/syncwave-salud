// app/api/prescriptions/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error('Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
	try {
		const form = await req.formData();

		const consultation_id = (form.get('consultation_id') as string) ?? null;
		const patient_id = (form.get('patient_id') as string) ?? null;
		const doctor_id = (form.get('doctor_id') as string) ?? null;
		const notes = (form.get('notes') as string) ?? null;
		const valid_until = (form.get('valid_until') as string) ?? null;
		const itemsRaw = (form.get('items') as string) ?? '[]';

		// parse items safely
		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
			if (!Array.isArray(items)) items = [];
		} catch {
			items = [];
		}

		if (!consultation_id || !patient_id || !doctor_id) {
			return NextResponse.json({ error: 'Faltan campos requeridos (consultation_id | patient_id | doctor_id).' }, { status: 400 });
		}

		// 1) Crear la prescripción (usar issued_at/created_at defaults en DB)
		const prescriptionPayload: any = {
			patient_id,
			doctor_id,
			consultation_id,
			notes,
			valid_until: valid_until || null,
			status: 'ACTIVE',
			// avoid writing updated_at (no existe en tu schema). created_at y issued_at tienen default DB.
		};

		const { data: presCreated, error: presErr } = await supabaseAdmin.from('prescription').insert([prescriptionPayload]).select().single();

		if (presErr) {
			console.error('Error al crear prescription:', presErr);
			return NextResponse.json({ error: presErr.message ?? 'Error creando prescription' }, { status: 500 });
		}

		const prescriptionId = presCreated.id;

		// 2) Insertar items de prescripción (si hay)
		if (Array.isArray(items) && items.length > 0) {
			const itemsPayload = items.map((it: any) => ({
				prescription_id: prescriptionId,
				medication_id: it.medication_id ?? null,
				name: it.name ?? null,
				dosage: it.dosage ?? null,
				form: it.form ?? null,
				frequency: it.frequency ?? null,
				duration: it.duration ?? null,
				quantity: it.quantity ?? null,
				instructions: it.instructions ?? null,
				// prescription_item.created_at tiene DEFAULT now() en tu schema
			}));

			const { error: itemsErr } = await supabaseAdmin.from('prescription_item').insert(itemsPayload);
			if (itemsErr) {
				console.error('Error al insertar prescription items:', itemsErr);
				// no abortamos la creación principal; informamos en logs
			}
		}

		// 3) Subir archivos adjuntos (si hay)
		const uploadedFiles: Array<{ name: string; path: string; url: string | null }> = [];
		const bucket = 'prescriptions';
		const rawFiles = form.getAll('files') ?? [];

		for (const raw of rawFiles) {
			// validar que sea un File (en runtimes web)
			if (!raw || typeof (raw as any).arrayBuffer !== 'function') {
				console.warn('Archivo inválido o no soportado en formData, se ignora:', raw);
				continue;
			}

			const f = raw as File;
			try {
				const arrayBuffer = await f.arrayBuffer();

				// convertir a Buffer o Uint8Array dependiendo del runtime
				let uploadBody: any;
				if (typeof Buffer !== 'undefined') {
					uploadBody = Buffer.from(arrayBuffer);
				} else {
					uploadBody = new Uint8Array(arrayBuffer);
				}

				const timestamp = Date.now();
				const safeName = encodeURIComponent(f.name.replace(/\s+/g, '_'));
				const path = `${prescriptionId}/${timestamp}_${safeName}`;

				const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(path, uploadBody, { upsert: false });

				if (uploadErr) {
					console.error('Error subiendo archivo al bucket:', uploadErr);
					continue;
				}

				// obtener public URL correctamente
				let publicURL: string | null = null;
				try {
					const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
					publicURL = urlData?.publicUrl ?? null;
				} catch (err) {
					console.warn('No se pudo obtener publicUrl (bucket privado o error):', err);
					publicURL = null;
				}

				uploadedFiles.push({ name: f.name, path, url: publicURL });

				// Intentar insertar metadata en prescription_files si existe (opcional)
				try {
					await supabaseAdmin.from('prescription_files').insert([
						{
							prescription_id: prescriptionId,
							file_name: f.name,
							path,
							url: publicURL,
							size: f.size,
							content_type: f.type,
							created_at: new Date().toISOString(),
						},
					]);
				} catch (err) {
					// Si la tabla no existe o falla, lo ignoramos (pero lo registramos)
					// console.warn('No se pudo insertar metadata en prescription_files:', err);
				}
			} catch (err) {
				console.error('Error procesando archivo:', err);
				continue;
			}
		}

		// 4) NO intento actualizar prescription.attachments aquí porque en tu schema no existe la columna.
		// Si quieres la columna attachments, abajo te dejo el SQL para agregarla y en ese caso podemos actualizarla.

		return NextResponse.json({ success: true, prescription: presCreated, files: uploadedFiles }, { status: 201 });
	} catch (err: any) {
		console.error('Error POST /api/prescriptions:', err);
		return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
	}
}
