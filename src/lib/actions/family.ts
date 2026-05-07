'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Obtiene los miembros del grupo familiar de un paciente.
 */
export async function getPatientFamily(patientId: string) {
  try {
    // 1. Buscar grupos donde sea el dueño
    const { data: ownedGroups } = await supabaseAdmin
      .from('familygroup')
      .select('id')
      .eq('ownerId', patientId);

    // 2. Buscar grupos donde sea miembro
    const { data: memberGroups } = await supabaseAdmin
      .from('familygroupmember')
      .select('familyGroupId')
      .eq('patientId', patientId);

    const groupIds = [
      ...(ownedGroups || []).map(g => g.id),
      ...(memberGroups || []).map(g => g.familyGroupId)
    ];

    if (groupIds.length === 0) return [];

    // 3. Obtener todos los miembros de esos grupos
    const { data: members, error } = await supabaseAdmin
      .from('familygroupmember')
      .select(`
        patientId,
        patient:patientId (
          id,
          firstName,
          lastName
        )
      `)
      .in('familyGroupId', groupIds);

    if (error) throw error;

    // También incluir a los dueños de esos grupos que no están en familygroupmember
    const { data: owners } = await supabaseAdmin
      .from('familygroup')
      .select(`
        ownerId,
        owner:ownerId (
          id,
          firstName,
          lastName
        )
      `)
      .in('id', groupIds);

    // Unificar y eliminar duplicados (incluyendo al usuario actual si se desea, 
    // pero el componente lo manejará)
    const allPatients = new Map();
    
    owners?.forEach(o => {
      const owner = o.owner as any;
      if (owner) {
        allPatients.set(owner.id, {
          id: owner.id,
          name: `${owner.firstName} ${owner.lastName || ''}`.trim()
        });
      }
    });

    members?.forEach(m => {
      const patient = m.patient as any;
      if (patient) {
        allPatients.set(patient.id, {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName || ''}`.trim()
        });
      }
    });

    return Array.from(allPatients.values());
  } catch (error) {
    console.error('[getPatientFamily] Error:', error);
    return [];
  }
}
