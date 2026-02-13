import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    const supabase = await createSupabaseServerClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: templates, error } = await supabase
            .from('prescription_templates')
            .select('*')
            .eq('doctor_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            return NextResponse.json({ error: 'Error fetching templates' }, { status: 500 });
        }

        // Generate signed URLs for each template (valid for 1 hour)
        const templatesWithUrls = await Promise.all(templates.map(async (t) => {
            if (t.file_path) {
                const { data } = await supabase.storage
                    .from('prescription-templates')
                    .createSignedUrl(t.file_path, 3600); // 1 hour
                
                return { ...t, file_url: data?.signedUrl || null };
            }
            return t;
        }));

        return NextResponse.json({ templates: templatesWithUrls });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseServerClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        if (!file || !name) {
            return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
        }

        // Validate file type
        if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
             return NextResponse.json({ error: 'Only .docx or .doc files are allowed' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${uuidv4()}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('prescription-templates')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
        }

        // 2. Insert into DB
        const { data: inserted, error: dbError } = await supabase
            .from('prescription_templates')
            .insert({
                doctor_id: user.id,
                name,
                description,
                file_path: fileName
            })
            .select()
            .single();

        if (dbError) {
            console.error('DB Insert error:', dbError);
            // Cleanup: delete uploaded file if DB insert fails
            await supabase.storage.from('prescription-templates').remove([fileName]);
            return NextResponse.json({ error: 'Error saving template record' }, { status: 500 });
        }

        return NextResponse.json({ template: inserted }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = await createSupabaseServerClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Get template to find file path
        const { data: template, error: fetchError } = await supabase
            .from('prescription_templates')
            .select('*')
            .eq('id', id)
            .eq('doctor_id', user.id)
            .single();
        
        if (fetchError || !template) {
             return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // 1. Delete from Storage
        if (template.file_path) {
            const { error: storageError } = await supabase.storage
                .from('prescription-templates')
                .remove([template.file_path]);
            
            if (storageError) {
                console.warn('Error deleting file from storage:', storageError);
                // Continue to delete from DB even if storage delete fails
            }
        }

        // 2. Delete from DB
        const { error: deleteError } = await supabase
            .from('prescription_templates')
            .delete()
            .eq('id', id)
            .eq('doctor_id', user.id); // Extra safety

        if (deleteError) {
             return NextResponse.json({ error: 'Error deleting template record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
