# Variables de Colposcopia para Informes

## Formato de Variables

Las variables se usan en la plantilla con el formato: `{{nombre_variable}}`

## Variables Disponibles para Colposcopia

### Información General de Colposcopia

| Variable                       | Descripción                                     | Valores Posibles                                                     |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| `{{colposcopia_acetico_5}}`    | Colposcopia Acetico 5%                          | SATISFACTORIO, NO SATISFACTORIO, NORMAL                              |
| `{{colposcopia_ectocervix}}`   | I. localizada en ectocérvix, totalmente visible | Texto libre                                                          |
| `{{colposcopia_tipo}}`         | Tipo de Colposcopia                             | ALTERADA, NORMAL                                                     |
| `{{colposcopia_extension}}`    | Extensión (solo si es ALTERADA)                 | Extensión < 25%, Extensión 25-50%, Extensión 50-75%, Extensión > 75% |
| `{{colposcopia_descripcion}}`  | Descripción                                     | NORMAL, CAMBIOS MENORES, CAMBIOS MAYORES                             |
| `{{colposcopia_localizacion}}` | Localización                                    | Texto libre                                                          |

### Epitelio Acetoblanco

| Variable                              | Descripción                       | Valores Posibles                                                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{colposcopia_acetowhite}}`          | Epitelio acetoblanco              | Negativo, Tenue, Denso                                                                                                                                                                                                                                  |
| `{{colposcopia_acetowhite_detalles}}` | Detalles del Epitelio Acetoblanco | Que aparece rápido y desaparece lento, blanco ostraceo / Cambió acetoblanco débil que aparece TARDE y desaparece pronto / Glandular acetoblanco denso sobre epitelio columnar / Imagen de blanco sobre blanco, borde interno / SIN CAMBIOS ACENTOBLANCO |

### Patrones de Vascularización

| Variable                         | Descripción    | Valores Posibles                                                               |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `{{colposcopia_mosaico}}`        | MOSAICO        | No, Fino, Grueso, Mosaico ancho con losetas de distintos tamaños               |
| `{{colposcopia_punteado}}`       | PUNTEADO       | No, Fino, Grueso                                                               |
| `{{colposcopia_vasos_atipicos}}` | VASOS ATÍPICOS | No, Stops, Horquilla, Brusco cambio, Vasos de distintos calibres, Dilataciones |

### Características de la Lesión

| Variable                             | Descripción                     | Valores Posibles        |
| ------------------------------------ | ------------------------------- | ----------------------- |
| `{{colposcopia_carcinoma_invasivo}}` | Sugestiva de carcinoma invasivo | No, Ulceración, Otros   |
| `{{colposcopia_bordes}}`             | BORDES                          | No, Irregular, Regular  |
| `{{colposcopia_situacion}}`          | SITUACIÓN                       | No, Central, Periférica |
| `{{colposcopia_elevacion}}`          | ELEVACIÓN                       | No, Plano, Sobrelevado  |

### Pruebas Complementarias

| Variable                               | Descripción            | Valores Posibles                                                                                                                                   |
| -------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{colposcopia_biopsia}}`              | TOMA DE BIOPSIA        | No, Si                                                                                                                                             |
| `{{colposcopia_biopsia_localizacion}}` | LOCALIZACIÓN (Biopsia) | Texto libre                                                                                                                                        |
| `{{colposcopia_lugol}}`                | LUGOL (Test Schiller)  | IODOPOSITIVO, IODO PARCIALMENTE NEGATIVO (positividad débil, parcialmente moteado), IODONEGATIVO (amarillo mostaza sobre epitelio acetoblanco), NO |

### Variables Existentes (ya implementadas)

| Variable              | Descripción        |
| --------------------- | ------------------ |
| `{{test_hinselmann}}` | Test de Hinselmann |
| `{{test_schiller}}`   | Test de Schiller   |

## Ejemplo de Uso en Plantilla

```
INFORME COLPOSCÓPICO

Colposcopia Acetico 5%: {{colposcopia_acetico_5}}
Tipo: {{colposcopia_tipo}}
{{#if colposcopia_extension}}Extensión: {{colposcopia_extension}}{{/if}}
Descripción: {{colposcopia_descripcion}}
Localización: {{colposcopia_localizacion}}

Epitelio Acetoblanco: {{colposcopia_acetowhite}}
Detalles: {{colposcopia_acetowhite_detalles}}

Patrones de Vascularización:
- MOSAICO: {{colposcopia_mosaico}}
- PUNTEADO: {{colposcopia_punteado}}
- VASOS ATÍPICOS: {{colposcopia_vasos_atipicos}}

Características:
- Sugestiva de carcinoma invasivo: {{colposcopia_carcinoma_invasivo}}
- BORDES: {{colposcopia_bordes}}
- SITUACIÓN: {{colposcopia_situacion}}
- ELEVACIÓN: {{colposcopia_elevacion}}

Pruebas Complementarias:
- TOMA DE BIOPSIA: {{colposcopia_biopsia}}
{{#if colposcopia_biopsia_localizacion}}- LOCALIZACIÓN: {{colposcopia_biopsia_localizacion}}{{/if}}
- LUGOL (Test Schiller): {{colposcopia_lugol}}
```

## Notas

-   Todas las variables devolverán una cadena vacía (`''`) si el campo no tiene valor
-   Las variables son case-insensitive (no importan mayúsculas/minúsculas)
-   Se pueden combinar con otros marcadores existentes en la plantilla
