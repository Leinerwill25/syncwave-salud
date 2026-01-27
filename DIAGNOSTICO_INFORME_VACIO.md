# Diagnóstico: Informe Generado pero Vacío

## Problema
El informe se genera exitosamente (status 200) pero el documento Word está vacío o no tiene contenido.

## Pasos de Diagnóstico

### 1. Verificar Logs del Servidor en Producción

**En Vercel/Netlify/Plataforma de hosting:**
1. Ve a los logs de producción
2. Busca la ejecución más reciente del endpoint `/api/n8n/generate-report-internal`
3. Busca estos mensajes específicos:

```
[N8N Internal] Datos extraídos:
```

**¿Qué buscar?**
- Verifica que `extractedFields` tenga datos
- Verifica que `motivo_consulta`, `antecedentes`, `ginecologicos`, etc. tengan valores

**Si `extractedFields` está vacío o incompleto:**
→ El problema está en N8N, no en el código de Next.js
→ Verifica que el workflow de N8N esté pasando `extractedFields` correctamente

---

### 2. Verificar Variables Mapeadas

En los logs, busca:

```
[N8N Internal] Total de variables mapeadas para plantilla: X
[N8N Internal] Variables con valores: X de Y
```

**¿Qué buscar?**
- Si `Variables con valores: 0 de X` → Los datos no están llegando
- Si `Variables con valores: X de Y` donde X > 0 → Los datos están llegando pero no se están reemplazando

---

### 3. Verificar Variables Sin Reemplazar

En los logs, busca:

```
[N8N Internal] Variables sin reemplazar en documento: X
[N8N Internal] Ejemplos de variables sin reemplazar: [...]
```

**¿Qué buscar?**
- Si hay variables sin reemplazar, copia los ejemplos
- Compara esas variables con las que están en tu plantilla

---

### 4. Verificar la Plantilla en Supabase Storage

**Pasos:**
1. Ve a Supabase Dashboard → Storage → `report-templates`
2. Encuentra la plantilla que corresponde al doctor `db536d90-2f27-4a81-bdde-05b7b7a3de17`
3. Descarga la plantilla
4. Ábrela en Word
5. Verifica que tenga variables `{{}}` como:
   - `{{historia_enfermedad_actual}}`
   - `{{alergicos}}`
   - `{{quirurgicos}}`
   - `{{tamano_mamas}}`
   - etc.

**¿Qué buscar?**
- ¿Las variables coinciden exactamente con las del código?
- ¿Hay espacios extra en las variables? (ej: `{{ historia_enfermedad_actual }}` vs `{{historia_enfermedad_actual}}`)
- ¿Las variables están en mayúsculas/minúsculas diferentes?

---

### 5. Comparar Plantilla Local vs Producción

**Pasos:**
1. Descarga la plantilla que usas localmente
2. Descarga la plantilla de producción desde Supabase
3. Compara:
   - ¿Tienen las mismas variables `{{}}`?
   - ¿El formato es el mismo?
   - ¿Hay diferencias en los nombres de las variables?

**Si son diferentes:**
→ Sube la plantilla local a Supabase Storage para reemplazar la de producción

---

### 6. Verificar el Payload que N8N Envía

**En el workflow de N8N:**
1. Abre el nodo "6. Generar Documento Word"
2. Verifica que el `jsonBody` incluya:
   ```json
   {
     "consultationId": "...",
     "doctorId": "...",
     "reportType": "gynecology",
     "extractedFields": {
       "motivo_consulta": "...",
       "antecedentes": {...},
       "ginecologicos": {...},
       ...
     }
   }
   ```

**¿Qué buscar?**
- ¿`extractedFields` está presente y tiene datos?
- ¿Los datos están estructurados correctamente?

---

### 7. Descargar y Verificar el Documento Generado

**Pasos:**
1. Descarga el documento desde la URL del informe generado
2. Ábrelo en Word
3. Verifica:
   - ¿Está completamente vacío?
   - ¿Tiene el texto de la plantilla pero con `{{variables}}` sin reemplazar?
   - ¿Tiene algún contenido parcial?

**Si tiene `{{variables}}` sin reemplazar:**
→ Las variables no coinciden exactamente
→ Compara los nombres de las variables en el documento con las que se mapean en el código

---

## Soluciones Comunes

### Solución 1: Plantilla Diferente en Producción

**Problema:** La plantilla en producción es diferente a la local

**Solución:**
1. Descarga tu plantilla local
2. Ve a Supabase Dashboard → Storage → `report-templates`
3. Sube la plantilla local para reemplazar la de producción
4. Asegúrate de que el path sea el mismo (ej: `Ginecologia/plantilla.docx`)

---

### Solución 2: Variables No Coinciden

**Problema:** Las variables en la plantilla no coinciden exactamente con las del código

**Solución:**
1. Abre la plantilla en Word
2. Busca todas las variables `{{}}`
3. Compara con las variables que se mapean en el código:
   - `historia_enfermedad_actual`
   - `alergicos`
   - `quirurgicos`
   - `tamano_mamas`
   - `simetria_mamas`
   - etc.
4. Asegúrate de que coincidan exactamente (sin espacios, misma capitalización)

---

### Solución 3: extractedFields Vacío desde N8N

**Problema:** N8N no está enviando `extractedFields` correctamente

**Solución:**
1. En el workflow de N8N, verifica el nodo "5. Preparar Generación Word"
2. Asegúrate de que esté pasando `extractedFields` o `validatedData` correctamente
3. Verifica que el nodo "AGENTE 3: Ejecutar" esté generando los datos correctamente

---

### Solución 4: Plantilla Corrupta

**Problema:** La plantilla en Supabase está corrupta

**Solución:**
1. Descarga la plantilla desde Supabase
2. Intenta abrirla en Word
3. Si no se abre o está corrupta, sube una nueva plantilla

---

## Checklist Rápido

- [ ] Verificar logs: `[N8N Internal] Datos extraídos:` tiene datos
- [ ] Verificar logs: `[N8N Internal] Variables con valores:` es > 0
- [ ] Verificar logs: `[N8N Internal] Variables sin reemplazar:` muestra qué variables faltan
- [ ] Descargar plantilla de Supabase y verificar que tenga variables `{{}}`
- [ ] Comparar plantilla local vs producción
- [ ] Verificar que `extractedFields` llegue desde N8N
- [ ] Descargar documento generado y verificar si tiene `{{variables}}` sin reemplazar

---

## Información Necesaria para Diagnosticar

Para ayudarte mejor, necesito que compartas:

1. **Logs de producción** (especialmente los mensajes `[N8N Internal]`)
2. **Screenshot o lista de variables** en la plantilla de producción
3. **Screenshot del documento generado** (si tiene `{{variables}}` sin reemplazar)
4. **Payload que N8N envía** al endpoint (puedes verlo en el nodo "6. Generar Documento Word")

Con esta información podremos identificar exactamente qué está fallando.

