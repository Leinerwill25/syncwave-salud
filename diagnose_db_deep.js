const URL = 'https://lyxlnduyzhwwupxjackg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eGxuZHV5emh3d3VweGphY2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5ODE0MSwiZXhwIjoyMDczOTc0MTQxfQ.5Mq_uc0Ob8NPWralOBqXyvSSrp_nJW1PD82gYTfeg4s';

async function diagnose() {
    console.log('--- DIAGNÓSTICO PROFUNDO ---');
    
    // 1. Ver cuántos medic_profiles hay en total
    const { data: allProfiles } = await fetch(
        `${URL}/rest/v1/medic_profile?select=id,doctor_id&limit=10`,
        { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    ).then(res => res.json().then(data => ({ data })));

    console.log('Total medic_profiles (primeros 10):', allProfiles);

    // 2. Ver usuarios de la organización problemática
    const orgId = '2a3e1315-f549-4c19-b329-f2bee6308a76';
    const { data: users } = await fetch(
        `${URL}/rest/v1/user?organizationId=eq.${orgId}&select=id,name,email,role,patientProfileId`,
        { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    ).then(res => res.json().then(data => ({ data })));

    console.log(`Usuarios en Org ${orgId}:`, users);

    // 3. ¿Hay algún medic_profile para estos usuarios?
    if (users) {
        for (const user of users) {
             const { data: profile } = await fetch(
                `${URL}/rest/v1/medic_profile?doctor_id=eq.${user.id}&select=*`,
                { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
            ).then(res => res.json().then(data => ({ data })));
            console.log(`Perfil para user ${user.id} (${user.name}):`, profile);
        }
    }
}

diagnose();
