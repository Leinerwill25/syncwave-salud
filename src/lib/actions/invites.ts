'use server';

import { createSupabaseServerClient } from '@/app/adapters/server';
import { sendNotificationEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

const NEXT_PUBLIC_INVITE_BASE_URL = process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? '';
const NEXT_PUBLIC_VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL ?? '';

function generateToken() {
    return randomBytes(32).toString('hex');
}

export async function bulkUploadAndSendInvites(organizationId: string, emails: string[]) {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        sentEmails: [] as string[]
    };

    if (!organizationId) {
        return { ...results, errors: ['Organización no identificada.'] };
    }

    const supabase = await createSupabaseServerClient();

    // Obtener info de la organización una vez
    const { data: organization, error: orgError } = await supabase
        .from('organization')
        .select('name, inviteBaseUrl')
        .eq('id', organizationId)
        .single();

    if (orgError || !organization) {
        return { ...results, errors: ['Organización no encontrada.'] };
    }

    const inviteBaseUrl = organization.inviteBaseUrl ?? NEXT_PUBLIC_INVITE_BASE_URL ?? '';
    const origin = inviteBaseUrl ? inviteBaseUrl.replace(/\/$/, '') : NEXT_PUBLIC_VERCEL_URL ? `https://${NEXT_PUBLIC_VERCEL_URL}` : '';

    for (const email of emails) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
            results.failed++;
            results.errors.push(`Email inválido: ${email}`);
            continue;
        }

        try {
            // Verificar si ya existe invitación para este email en esta org
            const { data: existingInvite } = await supabase
                .from('invite')
                .select('*')
                .eq('email', normalizedEmail)
                .eq('organizationId', organizationId)
                .maybeSingle();

            let invite = existingInvite;

            if (!invite) {
                // Crear nueva invitación
                const { data: newInvite, error: createError } = await supabase
                    .from('invite')
                    .insert({
                        email: normalizedEmail,
                        organizationId,
                        token: generateToken(),
                        role: 'MEDICO', // Por defecto MEDICO para especialistas
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                invite = newInvite;
            } else {
                // Si existe y no ha sido usada, actualizamos token y fecha
                if (!invite.used) {
                    const { data: updatedInvite, error: updateError } = await supabase
                        .from('invite')
                        .update({
                            token: generateToken(), // Regenerar token para seguridad
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        })
                        .eq('id', invite.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    invite = updatedInvite;
                } else {
                    // Si ya fue usada, no enviamos nada (o podríamos avisar)
                    results.failed++;
                    results.errors.push(`El usuario ${email} ya aceptó una invitación previamente.`);
                    continue;
                }
            }

            // Enviar correo
            const url = `${origin}/invite/${invite.token}`;
            const emailResult = await sendNotificationEmail('INVITE', normalizedEmail, {
                inviteUrl: url,
                organizationName: organization.name,
                role: invite.role.toString(),
            });

            if (emailResult.success) {
                results.success++;
                results.sentEmails.push(normalizedEmail);
            } else {
                results.failed++;
                results.errors.push(`Error enviando correo a ${email}: ${emailResult.error}`);
            }

        } catch (error: any) {
            console.error(`Error processing invite for ${email}:`, error);
            results.failed++;
            results.errors.push(`Error interno procesando ${email}`);
        }
    }

    return results;
}

export async function assignEmailToInvite(inviteId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        return { success: false, error: 'Email inválido' };
    }

    const supabase = await createSupabaseServerClient();

    try {
        // Obtener invitación con organización
        const { data: invite, error: fetchError } = await supabase
            .from('invite')
            .select('*, organization:organizationId (name, inviteBaseUrl)')
            .eq('id', inviteId)
            .single();

        if (fetchError || !invite) {
            return { success: false, error: 'Invitación no encontrada' };
        }

        if (invite.used) {
            return { success: false, error: 'Esta invitación ya fue usada' };
        }

        // Verificar si el email ya está en uso en otra invitación de la misma org
        const { data: existing } = await supabase
            .from('invite')
            .select('id')
            .eq('email', normalizedEmail)
            .eq('organizationId', invite.organizationId)
            .neq('id', inviteId)
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'Este correo ya tiene otra invitación asignada en esta organización.' };
        }

        // Actualizar invitación
        const { data: updatedInvite, error: updateError } = await supabase
            .from('invite')
            .update({ 
                email: normalizedEmail,
                token: generateToken(), // Regenerar token por seguridad
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', inviteId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Enviar correo
        // Nota: Supabase devuelve la relación como objeto simple si se usa select('..., organization(...)')
        // pero aquí invite ya tiene la data vieja. Usamos esa data vieja para el nombre de org.
        const organization = (invite as any).organization;
        const inviteBaseUrl = organization?.inviteBaseUrl ?? NEXT_PUBLIC_INVITE_BASE_URL ?? '';
        const origin = inviteBaseUrl ? inviteBaseUrl.replace(/\/$/, '') : NEXT_PUBLIC_VERCEL_URL ? `https://${NEXT_PUBLIC_VERCEL_URL}` : '';
        const url = `${origin}/invite/${updatedInvite.token}`;

        const emailResult = await sendNotificationEmail('INVITE', normalizedEmail, {
            inviteUrl: url,
            organizationName: organization?.name ?? 'Clínica',
            role: updatedInvite.role.toString(),
        });

        if (!emailResult.success) {
            return { success: false, error: `Invitación actualizada pero falló el envío del correo: ${emailResult.error}` };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error assigning email to invite:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function assignToFirstAvailableInvite(organizationId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        return { success: false, error: 'Email inválido' };
    }

    const supabase = await createSupabaseServerClient();

    try {
        // Buscar primer cupo disponible (email null y no usada)
        const { data: availableInvite, error } = await supabase
            .from('invite')
            .select('id')
            .eq('organizationId', organizationId)
            .is('email', null)
            .eq('used', false)
            .limit(1)
            .maybeSingle();

        if (error) {
             console.error('Error finding available invite:', error);
             return { success: false, error: 'Error buscando cupos.' };
        }

        if (!availableInvite) {
            return { success: false, error: 'No hay cupos disponibles. Por favor contacta a soporte para adquirir más licencias.' };
        }

        // Usar la función existente para asignar y enviar
        return await assignEmailToInvite(availableInvite.id, normalizedEmail);

    } catch (error: any) {
        console.error('Error finding available invite:', error);
        return { success: false, error: 'Error interno buscando cupos disponibles.' };
    }
}
