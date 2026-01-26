# Solución: Respuesta Vacía de n8n

## Problema

n8n devuelve una respuesta vacía (`Respuesta vacía de n8n`).

## Causas Posibles

### 1. **El workflow NO está activo**

✅ **Solución:** En n8n Cloud, asegúrate de que el workflow esté **ACTIVADO** (toggle en la esquina superior derecha debe estar en verde/ON).

### 2. **El workflow está fallando silenciosamente**

El workflow puede estar fallando en algún nodo antes de llegar a "Respond to Webhook".

**Pasos para depurar:**

1. **Abre el workflow en n8n Cloud**
2. **Ve a "Executions" (Ejecuciones)** en el menú lateral
3. **Busca la ejecución más reciente** y haz clic en ella
4. **Revisa cada nodo** para ver cuál está fallando (nodos rojos = error)

### 3. **El nodo "Descargar Audio" está fallando**

El problema más común es que `audioUrl` no está siendo reconocido.

**Solución:**

-   En el nodo "Descargar Audio", verifica que el campo URL esté en modo **"Expression"** (Expresión)
-   El valor debe ser exactamente: `{{ $('Webhook').item.json.audioUrl }}`
-   Si sigue fallando, usa: `{{ $json.audioUrl }}` (esto funciona si el nodo anterior pasa los datos correctamente)

### 4. **El nodo "Respond to Webhook" no está conectado correctamente**

Verifica que:

-   El nodo "Generar Informe" esté conectado al nodo "Respond to Webhook"
-   El nodo "Respond to Webhook" esté configurado con `"responseMode": "responseNode"` en el Webhook

## Solución Rápida

### Opción 1: Usar el workflow simplificado

Importa `n8n-workflow-generate-report-fixed.json` que ya tiene las correcciones.

### Opción 2: Verificar configuración manual

1. Abre el nodo "Webhook"

    - Verifica que `Response Mode` esté en **"Using 'Respond to Webhook' Node"**
    - Guarda el workflow

2. Abre el nodo "Descargar Audio"

    - Verifica que `URL` esté en modo **"Expression"**
    - Valor: `{{ $('Webhook').item.json.audioUrl }}`

3. **Activa el workflow** (toggle en la esquina superior derecha)

4. Prueba nuevamente desde tu aplicación Next.js

## Verificación Final

Después de aplicar los cambios, verifica:

1. ✅ Workflow está **ACTIVO** (toggle verde)
2. ✅ Nodo "Webhook" tiene `Response Mode = "Using 'Respond to Webhook' Node"`
3. ✅ Nodo "Descargar Audio" tiene `URL = "{{ $('Webhook').item.json.audioUrl }}"`
4. ✅ Nodo "Respond to Webhook" está conectado desde "Generar Informe"

## Si el problema persiste

Revisa los logs de ejecución en n8n Cloud:

1. Ve a **"Executions"**
2. Busca la ejecución más reciente
3. Haz clic en ella para ver el detalle
4. Identifica el nodo que está fallando (marcado en rojo)
5. Lee el mensaje de error específico





