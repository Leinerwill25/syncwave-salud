async function testProductionData() {
    console.log('1. Iniciando sesión en producción...');
    try {
        const response = await fetch('https://ashira.click/api/analytics/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'superadmin',
                password: 'Ashira2026!'
            })
        });

        if (!response.ok) {
            console.log('Fallo en el login. Status:', response.status);
            return;
        }

        console.log('¡Login exitoso!');
        
        // Extraer la cookie de la respuesta
        const setCookie = response.headers.get('set-cookie');
        
        console.log('2. Consultando detalle de clínicas (Datos Reales)...');
        const dataResponse = await fetch('https://ashira.click/api/analytics/data?type=clinicas-detalle&start=2026-01-01T00:00:00Z&end=2026-12-31T23:59:59Z', {
            headers: {
                'Cookie': setCookie || ''
            }
        });

        const result = await dataResponse.json();
        
        console.log('--- RESULTADO ---');
        // Mostramos las 2 primeras clínicas con su equipo para ver la estructura
        if (result.data && result.data.length > 0) {
            console.log(JSON.stringify(result.data.slice(0, 2), null, 2));
            console.log(`\nTotal de clínicas encontradas: ${result.data.length}`);
        } else {
            console.log('No se devolvieron datos o el array está vacío:', result);
        }
        
    } catch (error) {
        console.log('Error de conexión:', error.message);
    }
}

testProductionData();
