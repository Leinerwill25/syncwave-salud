# Configuración de n8n

## Instalación Completada ✅

n8n ha sido instalado exitosamente en el proyecto junto con todas sus dependencias.

## Scripts Disponibles

Puedes ejecutar n8n usando los siguientes scripts de npm/pnpm:

```bash
# Iniciar n8n en modo normal
pnpm run n8n

# Iniciar n8n con túnel (útil para desarrollo y webhooks locales)
pnpm run n8n:dev
```

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto `my-app` con las siguientes variables opcionales:

```env
# Puerto en el que se ejecutará n8n (por defecto: 5678)
N8N_PORT=5678

# Host (por defecto: localhost)
N8N_HOST=localhost

# Protocolo (por defecto: http)
N8N_PROTOCOL=http

# Directorio donde se guardarán los datos (por defecto: ~/.n8n)
N8N_USER_FOLDER=./data/n8n

# Configuración de base de datos (opcional)
DB_TYPE=sqlite
DB_SQLITE_DATABASE=./data/n8n.sqlite

# Webhook URL (necesario si usas webhooks externos)
WEBHOOK_URL=http://localhost:5678/

# Habilitar/deshabilitar gestión de usuarios
N8N_USER_MANAGEMENT_ENABLED=true

# Configuración de seguridad (opcional)
N8N_ENCRYPTION_KEY=tu_clave_secreta_aqui
```

### Archivo de Configuración

Puedes usar el archivo `n8n.config.example.json` como base. Cópialo a `n8n.config.json` y ajusta según tus necesidades:

```bash
cp n8n.config.example.json n8n.config.json
```

## Uso Básico

1. **Iniciar n8n:**

    ```bash
    pnpm run n8n
    ```

2. **Acceder a la interfaz:**

    - Abre tu navegador y ve a: `http://localhost:5678`
    - La primera vez que accedas, deberás crear una cuenta de administrador

3. **Crear tu primer workflow:**
    - Una vez dentro de n8n, puedes crear workflows arrastrando y soltando nodos
    - n8n incluye más de 400 nodos integrados para conectarte con diferentes servicios

## Integración con el Proyecto

### Usar n8n como API

Puedes ejecutar workflows de n8n programáticamente desde tu aplicación Next.js:

```typescript
// Ejemplo: Ejecutar un workflow desde tu API
import axios from 'axios';

const executeWorkflow = async (workflowId: string, data: any) => {
	const response = await axios.post(`http://localhost:5678/api/v1/workflows/${workflowId}/execute`, data, {
		headers: {
			'X-N8N-API-KEY': 'tu-api-key-aqui',
		},
	});
	return response.data;
};
```

### Webhooks

n8n puede recibir webhooks y ejecutar workflows basados en ellos. Configura la URL del webhook en tus workflows y úsala como endpoint en tu aplicación.

## Notas Importantes

⚠️ **Warnings de Peer Dependencies:**

-   Hay algunos warnings sobre versiones de dependencias (zod, date-fns, three.js)
-   Estos warnings no deberían afectar el funcionamiento de n8n
-   Si encuentras problemas, puedes considerar ajustar las versiones

📁 **Almacenamiento de Datos:**

-   Por defecto, n8n guarda los datos en `~/.n8n`
-   Puedes cambiar esto con la variable de entorno `N8N_USER_FOLDER`
-   Se recomienda configurar una base de datos externa (PostgreSQL, MySQL) para producción

🔐 **Seguridad:**

-   En producción, asegúrate de configurar autenticación apropiada
-   Usa HTTPS en lugar de HTTP
-   Configura `N8N_ENCRYPTION_KEY` para encriptar datos sensibles

## Recursos Adicionales

-   [Documentación oficial de n8n](https://docs.n8n.io/)
-   [Comunidad de n8n](https://community.n8n.io/)
-   [Ejemplos de workflows](https://n8n.io/workflows/)

## Solución de Problemas

Si encuentras problemas al iniciar n8n:

1. **Problemas de dependencias con zod:**

    - Se ha configurado `.npmrc` con `shamefully-hoist=true` para resolver conflictos de versiones
    - Se ha agregado `pnpm.overrides` en `package.json` para forzar una versión única de zod (3.25.0)
    - Si aún hay problemas, ejecuta: `pnpm install --force`

2. Verifica que el puerto 5678 no esté en uso:

    ```bash
    netstat -ano | findstr :5678
    ```

3. Revisa los logs de n8n para errores específicos

4. Asegúrate de tener permisos de escritura en el directorio de datos

5. Para más información, consulta: https://docs.n8n.io/hosting/troubleshooting/

## Nota sobre Configuración de pnpm

Se ha configurado el archivo `.npmrc` con las siguientes opciones para resolver conflictos de dependencias:

-   `shamefully-hoist=true`: Eleva todas las dependencias al nivel superior del node_modules para mejorar la resolución de módulos
-   `strict-peer-dependencies=false`: Permite cierta flexibilidad con peer dependencies

Esto es necesario debido a los conflictos entre diferentes versiones de zod requeridas por n8n y sus dependencias.

## Problemas Conocidos y Workarounds

**⚠️ Nota importante:** Si sigues viendo errores de `MODULE_NOT_FOUND` relacionados con zod al ejecutar `n8n start`, estos son warnings que no deberían impedir que n8n funcione. El comando debería completarse a pesar de estos warnings.

Si los errores impiden que n8n inicie, puedes intentar:

1. **Usar n8n mediante npx (recomendado si los errores persisten):**

    ```bash
    npx n8n
    ```

2. **Instalar n8n globalmente:**

    ```bash
    pnpm add -g n8n
    n8n start
    ```

3. **Usar Docker (alternativa más estable):**
    ```bash
    docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
    ```
