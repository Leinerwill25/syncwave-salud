const URL = 'https://lyxlnduyzhwwupxjackg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eGxuZHV5emh3d3VweGphY2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5ODE0MSwiZXhwIjoyMDczOTc0MTQxfQ.5Mq_uc0Ob8NPWralOBqXyvSSrp_nJW1PD82gYTfeg4s';

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE DOCTORES ---');
    
    // 1. Buscar organizaciones tipo CONSULTORIO recientes
    const { data: orgs, error: orgsError } = await fetch(
        `${URL}/rest/v1/organization?type=eq.CONSULTORIO&select=id,name,contactEmail&limit=5&order=createdAt.desc`,
        { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    ).then(res => res.json().then(data => ({ data, error: res.ok ? null : data })));

    if (orgsError) {
        console.error('Error buscando organizaciones:', orgsError);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.log('No se encontraron organizaciones tipo CONSULTORIO.');
        return;
    }

    for (const org of orgs) {
        console.log(`\nOrganización: ${org.name} (${org.id}) - Email: ${org.contactEmail}`);
        
        // 2. Buscar usuarios vinculados por organizationId
        const { data: users, error: usersError } = await fetch(
            `${URL}/rest/v1/user?organizationId=eq.${org.id}&select=id,name,email,role`,
            { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
        ).then(res => res.json().then(data => ({ data, error: res.ok ? null : data })));

        console.log(`Usuarios vinculados (${users?.length || 0}):`, users);

        if (users && users.length > 0) {
            for (const user of users) {
                // 3. Buscar perfil médico
                const { data: profile } = await fetch(
                    `${URL}/rest/v1/medic_profile?doctor_id=eq.${user.id}&select=id,specialty`,
                    { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
                ).then(res => res.json().then(data => ({ data: data[0], error: res.ok ? null : data })));
                
                console.log(`  - Usuario: ${user.name} (${user.role}) -> Perfil Médico: ${profile ? 'SÍ (' + profile.id + ')' : 'NO'}`);
            }
        }

        // 4. Buscar usuario por email (fallback)
        if (org.contactEmail) {
            const { data: userByEmail } = await fetch(
                `${URL}/rest/v1/user?email=eq.${org.contactEmail}&select=id,name,role,organizationId`,
                { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
            ).then(res => res.json().then(data => ({ data, error: res.ok ? null : data })));
            
            if (userByEmail && userByEmail.length > 0) {
                console.log(`Usuarios con el email del consultorio (${org.contactEmail}):`, userByEmail);
            }
        }
    }
}

diagnose();
