# Estructura de Datos de Colposcopia

## Almacenamiento en Base de Datos

Los datos de colposcopia se almacenan en el campo `vitals` de la tabla `consultation`. Este campo es de tipo `JSONB` en PostgreSQL y permite almacenar estructuras JSON complejas.

### Estructura JSON

Los datos de colposcopia se almacenan dentro de `vitals.gynecology.colposcopy` con la siguiente estructura:

```json
{
  "gynecology": {
    "colposcopy": {
      "acetic_5": "SATISFACTORIO" | "NO SATISFACTORIO" | "NORMAL",
      "ectocervix": "string (texto libre)",
      "type": "ALTERADA" | "NORMAL",
      "extension": "Extensión < 25%" | "Extensión 25-50%" | "Extensión 50-75%" | "Extensión > 75%" | "",
      "description": "NORMAL" | "CAMBIOS MENORES" | "CAMBIOS MAYORES" | "",
      "location": "string (texto libre)",
      "acetowhite": "Negativo" | "Tenue" | "Denso",
      "acetowhite_details": "string (opciones específicas)",
      "mosaic": "No" | "Fino" | "Grueso" | "Mosaico ancho con losetas de distintos tamaños",
      "punctation": "No" | "Fino" | "Grueso",
      "atypical_vessels": "No" | "Stops" | "Horquilla" | "Brusco cambio" | "Vasos de distintos calibres" | "Dilataciones",
      "invasive_carcinoma": "No" | "Ulceración" | "Otros",
      "borders": "No" | "Irregular" | "Regular",
      "situation": "No" | "Central" | "Periférica",
      "elevation": "No" | "Plano" | "Sobrelevado",
      "biopsy": "No" | "Si",
      "biopsy_location": "string (texto libre)",
      "lugol": "IODOPOSITIVO" | "IODO PARCIALMENTE NEGATIVO (positividad débil, parcialmente moteado)" | "IODONEGATIVO (amarillo mostaza sobre epitelio acetoblanco)" | "NO" | ""
    }
  }
}
```

## Verificación de Schema

El campo `vitals` en la tabla `consultation` debe ser de tipo `JSONB`. Para verificar:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'consultation' AND column_name = 'vitals';
```

Resultado esperado:
- `column_name`: vitals
- `data_type`: jsonb
- `is_nullable`: YES

## Ejemplo de Consulta

Para obtener los datos de colposcopia de una consulta:

```sql
SELECT 
  id,
  vitals->'gynecology'->'colposcopy' as colposcopy_data
FROM consultation
WHERE id = 'uuid-de-consulta';
```

## Notas

- No se requiere migración SQL adicional ya que el campo `vitals` ya existe como JSONB
- Los datos se guardan automáticamente cuando se actualiza una consulta a través del API
- El campo `vitals` puede contener múltiples especialidades además de ginecología

