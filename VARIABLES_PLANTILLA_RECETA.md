# Variables Disponibles para la Plantilla de Receta

Este documento lista todas las variables que puedes usar en tu plantilla de receta Word (`.docx`).

## Formato de Variables

Todas las variables deben estar entre dobles llaves: `{{variable}}`

Ejemplo: `{{paciente}}` se reemplazará con el nombre del paciente.

---

## 📋 Variables del Paciente

| Variable                                                     | Descripción                        | Ejemplo      |
| ------------------------------------------------------------ | ---------------------------------- | ------------ |
| `{{paciente}}` o `{{patient}}`                               | Nombre completo del paciente       | "Juan Pérez" |
| `{{edad}}` o `{{age}}`                                       | Edad del paciente                  | "35"         |
| `{{cedula}}` o `{{identificacion}}` o `{{cedula_identidad}}` | Cédula/identificación del paciente | "12345678"   |

---

## 👨‍⚕️ Variables del Médico

| Variable                    | Descripción       | Ejemplo                |
| --------------------------- | ----------------- | ---------------------- |
| `{{medico}}` o `{{doctor}}` | Nombre del médico | "Dr. Carlos Rodríguez" |

---

## 📅 Variables de Fecha

| Variable                                               | Descripción                         | Ejemplo                                   |
| ------------------------------------------------------ | ----------------------------------- | ----------------------------------------- |
| `{{fecha}}` o `{{date}}`                               | Fecha de emisión de la prescripción | "15 de enero de 2024"                     |
| `{{validez}}` o `{{valid_until}}` o `{{valido_hasta}}` | Fecha límite de validez             | "22 de enero de 2024" o "No especificada" |

---

## 💊 Variables de Medicamentos

### Variable: `{{recipe}}`, `{{receta}}`, `{{RECIPES}}`, `{{RECIPE}}`, o `{{medicamento}}`

**Descripción:** Lista de todos los medicamentos prescritos, uno por línea. Incluye: nombre del medicamento + presentación (form) + gramaje (dosage), todo en mayúsculas.

**Formato de salida:**

```
CIPROFLOXACINA TABLETAS 500MG
GENLET ( FLAVOXATO) COMP 10MG
VITAMINA C CAPSULA 500MG
```

**Nota:** El formato incluye el nombre del medicamento, seguido de la presentación (si está disponible) y el gramaje/dosaje (si está disponible).

**Ejemplo en plantilla:**

```
RÉCIPE:
{{recipe}}
```

---

### Variable: `{{instrucciones}}` o `{{instructions}}`

**Descripción:** Instrucciones específicas de cada medicamento. Formato: "NOMBRE_MEDICAMENTO: INSTRUCCIONES"

**Formato de salida:**

```
CIPROFLOXACINA: 1 TABLETAS CADA 12 HORAS POR 7 DÍAS
GENLET ( FLAVOXATO): 1 COMP CADA 8 HORAS
VITAMINA C CAPSULA 500MG: 1 CAPSULA CADA 24 HORAS POR 10 DÍAS
```

**Ejemplo en plantilla:**

```
INSTRUCCIONES:
{{instrucciones}}
```

**Nota:** Si el medicamento tiene instrucciones específicas escritas, se usarán esas. Si no, se construirán automáticamente desde:

-   Cantidad (quantity)
-   Forma/presentación (form)
-   Frecuencia (frequency)
-   Duración (duration)

---

### Variable: `{{indicaciones}}`, `{{INDICACIONES}}`, o `{{indications}}`

**Descripción:** Indicaciones generales de la prescripción (notas generales).

**Formato de salida:**

```
Tomar con alimentos. Evitar alcohol durante el tratamiento.
```

**Ejemplo en plantilla:**

```
INDICACIONES GENERALES:
{{indicaciones}}
```

**Nota:** Esta variable contiene las notas generales de la prescripción. Si no hay notas, estará vacía.

---

## 📝 Ejemplo Completo de Plantilla

```
PRESCRIPCIÓN MÉDICA

Paciente: {{paciente}}
Cédula: {{cedula}}
Edad: {{edad}} años

Médico: {{medico}}
Fecha: {{fecha}}
Válido hasta: {{validez}}

═══════════════════════════════════════

RÉCIPE:

{{RECIPES}}

═══════════════════════════════════════

INSTRUCCIONES:

{{instrucciones}}

═══════════════════════════════════════

INDICACIONES GENERALES:

{{INDICACIONES}}
```

---

## ⚙️ Configuración Automática

-   **Tamaño de fuente:** Se aplica automáticamente 11pt a todo el contenido
-   **Fuente:** Se usa la fuente seleccionada en el formulario (Arial, Calibri, Georgia, Cambria, Garamond, Microsoft JhengHei)
-   **Alineación:** El contenido se alinea a la izquierda automáticamente

---

## 🔍 Notas Importantes

1. **Variables en mayúsculas y minúsculas:** Las variables funcionan tanto en mayúsculas como en minúsculas:

    - `{{recipe}}` = `{{RECIPE}}` = `{{Recipe}}`
    - `{{instrucciones}}` = `{{INSTRUCCIONES}}`
    - `{{indicaciones}}` = `{{INDICACIONES}}`

2. **Variables de medicamentos:**

    - `{{recipe}}` / `{{receta}}` / `{{RECIPES}}` muestra solo los nombres de los medicamentos
    - `{{instrucciones}}` muestra el nombre del medicamento seguido de las instrucciones
    - `{{indicaciones}}` muestra las notas generales de la prescripción

3. **Formato de fechas:** Las fechas se muestran en formato largo en español (ej: "15 de enero de 2024")

4. **Valores por defecto:** Si algún dato no está disponible, se mostrará "N/A" o un valor por defecto apropiado.

---

## ✅ Checklist para tu Plantilla

-   [ ] Incluir `{{paciente}}` o `{{patient}}`
-   [ ] Incluir `{{cedula}}` o `{{identificacion}}`
-   [ ] Incluir `{{edad}}` o `{{age}}`
-   [ ] Incluir `{{medico}}` o `{{doctor}}`
-   [ ] Incluir `{{fecha}}` o `{{date}}`
-   [ ] Incluir `{{recipe}}` o `{{RECIPES}}` para la lista de medicamentos
-   [ ] Incluir `{{instrucciones}}` o `{{instructions}}` para las instrucciones
-   [ ] Incluir `{{indicaciones}}` o `{{INDICACIONES}}` para las notas generales (opcional)
