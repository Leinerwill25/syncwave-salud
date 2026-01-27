# Solución: Informe Vacío - Análisis de Logs

## Logs Actuales Analizados

✅ **Plantilla descargada correctamente:** 508,764 bytes (no está vacía)
✅ **Variables mapeadas:** 254 variables
✅ **Plantilla encontrada:** `INFORME_MEDICO_DRA_CARWIN.docx`

## Información Faltante en los Logs

Necesito que busques estos mensajes específicos en los logs:

### 1. Datos Extraídos
```
[N8N Internal] Datos extraídos:
```
**¿Qué buscar?** Verifica que muestre:
- `motivo_consulta: "dolor en el área del vientre"`
- `alergias: "ninguna"`
- `tamano_mamas: "mediano"`
- etc.

### 2. Variables con Valores
```
[N8N Internal] Variables con valores: X de 254
```
**¿Qué buscar?** 
- Si dice `Variables con valores: 0 de 254` → Los datos no están llegando
- Si dice `Variables con valores: 50 de 254` → Los datos están llegando pero faltan algunas

### 3. Valores de Variables Clave
```
[N8N Internal] Valores de variables clave:
  historia_enfermedad_actual: "..." (string, length: X)
  alergicos: "..." (string, length: X)
  ...
```
**¿Qué buscar?** Verifica que estas variables tengan valores (length > 0)

### 4. Variables Sin Reemplazar
```
[N8N Internal] Variables sin reemplazar en documento: X
[N8N Internal] Ejemplos de variables sin reemplazar: [...]
```
**¿Qué buscar?** Si hay variables sin reemplazar, copia la lista completa

---

## Diagnóstico Basado en los Logs Actuales

### Escenario 1: Variables Mapeadas pero Sin Valores

**Síntoma:** `Variables con valores: 0 de 254`

**Causa:** `extractedFields` está vacío o no está llegando desde N8N

**Solución:**
1. Verifica en el workflow de N8N que el nodo "5. Preparar Generación Word" esté pasando `extractedFields`
2. Verifica que el nodo "AGENTE 3: Ejecutar" esté generando `validated_data` correctamente
3. Revisa los logs de N8N para ver si hay errores en los agentes

### Escenario 2: Variables con Valores pero No se Reemplazan

**Síntoma:** `Variables con valores: 50 de 254` pero el documento está vacío

**Causa:** Las variables en la plantilla no coinciden exactamente con las mapeadas

**Solución:**
1. Descarga la plantilla desde Supabase: `db536d90-2f27-4a81-bdde-05b7b7a3de17/Ginecologia/1768701962559-INFORME_MEDICO_DRA_CARWIN.docx`
2. Abre la plantilla en Word
3. Busca todas las variables `{{}}` (Ctrl+F busca `{{`)
4. Compara con las variables que se mapean en el código:
   - `historia_enfermedad_actual`
   - `alergicos`
   - `quirurgicos`
   - `tamano_mamas`
   - `simetria_mamas`
   - etc.
5. Verifica que coincidan EXACTAMENTE (sin espacios, misma capitalización)

### Escenario 3: Variables Parcialmente Reemplazadas

**Síntoma:** El documento tiene algunas variables reemplazadas pero otras no

**Causa:** Algunas variables en la plantilla tienen nombres diferentes o están mal escritas

**Solución:**
1. Descarga el documento generado
2. Abre en Word y busca `{{` para encontrar variables sin reemplazar
3. Compara esas variables con las que se mapean en el código
4. Corrige las variables en la plantilla para que coincidan

---

## Acción Inmediata

### Paso 1: Obtener Logs Completos

En los logs de producción, busca y copia TODOS los mensajes que empiecen con `[N8N Internal]` de la ejecución más reciente. Especialmente:

```
[N8N Internal] Datos extraídos: {...}
[N8N Internal] Variables con valores: X de Y
[N8N Internal] Valores de variables clave:
[N8N Internal] Variables sin reemplazar en documento: X
```

### Paso 2: Verificar la Plantilla

1. Ve a Supabase Dashboard → Storage → `report-templates`
2. Navega a: `db536d90-2f27-4a81-bdde-05b7b7a3de17/Ginecologia/`
3. Descarga: `1768701962559-INFORME_MEDICO_DRA_CARWIN.docx`
4. Abre en Word
5. Busca todas las variables `{{}}` (Ctrl+F: `{{`)
6. Haz una lista de TODAS las variables que encuentres

### Paso 3: Comparar Variables

Compara las variables de la plantilla con las que se mapean en el código. Las variables principales que deberían estar son:

- `{{historia_enfermedad_actual}}`
- `{{alergicos}}`
- `{{quirurgicos}}`
- `{{antecedentes_madre}}`
- `{{antecedentes_padre}}`
- `{{antecedentes_cancer_mama}}`
- `{{its}}`
- `{{tipo_menstruacion}}`
- `{{patron_menstruacion}}`
- `{{dismenorrea}}`
- `{{primera_relacion_sexual}}`
- `{{parejas_sexuales}}`
- `{{condiciones_generales}}`
- `{{tamano_mamas}}`
- `{{simetria_mamas}}`
- `{{cap_mamas}}`
- `{{secrecion_mamas}}`
- `{{fosas_axilares}}`
- `{{abdomen}}`
- `{{genitales_externos}}`
- `{{especuloscopia}}`
- `{{tacto_cervix}}`
- `{{fondo_sacos}}`
- `{{anexos}}`
- `{{dimensiones_utero}}`
- `{{interfase_endometrial}}`
- `{{dimensiones_ovario_izquierdo}}`
- `{{dimensiones_ovario_derecho}}`
- `{{liquido_fondo_saco}}`
- `{{fur}}` o `{{FUR}}` o `{{ultima_regla}}`
- `{{metodo_anticonceptivo}}`
- `{{ho}}` o `{{HO}}` o `{{historia_obstetrica}}`

---

## Próximos Pasos

1. **Comparte los logs completos** (especialmente los mensajes que faltan)
2. **Comparte la lista de variables** que tiene tu plantilla en Word
3. **Descarga el documento generado** y dime qué variables aparecen sin reemplazar

Con esa información podré darte la solución exacta.

