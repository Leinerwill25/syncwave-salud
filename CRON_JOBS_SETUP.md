# Configuración de Cron Jobs (Sin Vercel)

Para evitar costos en Vercel, los cron jobs se han configurado para usar servicios externos gratuitos.

## Endpoints Disponibles

### 1. Envío de Emails de Consultas
**Endpoint:** `/api/cron/send-consultation-emails`  
**Frecuencia recomendada:** Cada minuto  
**Método:** GET  
**Headers requeridos:**
```
Authorization: Bearer {CRON_SECRET}
```

### 2. Actualización de Tasa de Cambio
**Endpoint:** `/api/cron/update-currency-rate`  
**Frecuencia recomendada:** Diario a las 18:01 (6:01 PM)  
**Método:** GET  
**Headers requeridos:**
```
Authorization: Bearer {CRON_SECRET}
```

### 3. Verificación de Pagos Pendientes
**Endpoint:** `/api/cron/check-pending-payments`  
**Frecuencia recomendada:** Cada hora  
**Método:** GET  
**Headers requeridos:**
```
Authorization: Bearer {CRON_SECRET}
```

**Nota:** Este endpoint está deshabilitado por defecto y usa polling desde el cliente. Solo habilitar si es necesario.

## Configuración con cron-job.org (Gratis)

1. Crear cuenta en [cron-job.org](https://cron-job.org) (gratis)
2. Agregar nuevo cron job con la siguiente configuración:

### Para Envío de Emails:
- **URL:** `https://tu-dominio.vercel.app/api/cron/send-consultation-emails`
- **Método:** GET
- **Headers:**
  - Key: `Authorization`
  - Value: `Bearer {tu-CRON_SECRET}`
- **Frecuencia:** Cada minuto (`* * * * *`)

### Para Actualización de Tasa de Cambio:
- **URL:** `https://tu-dominio.vercel.app/api/cron/update-currency-rate`
- **Método:** GET
- **Headers:**
  - Key: `Authorization`
  - Value: `Bearer {tu-CRON_SECRET}`
- **Frecuencia:** Diario a las 18:01 (`1 18 * * *`)

## Configuración de Variables de Entorno

Asegúrate de configurar `CRON_SECRET` en las variables de entorno de Vercel:

```bash
CRON_SECRET=tu-secreto-super-seguro-aqui
```

## Alternativas Gratuitas

### GitHub Actions (Para repos públicos)
Puedes crear un workflow en `.github/workflows/cron.yml`:

```yaml
name: Cron Jobs
on:
  schedule:
    - cron: '* * * * *'  # Cada minuto
    - cron: '1 18 * * *'  # Diario a las 18:01

jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://tu-dominio.vercel.app/api/cron/send-consultation-emails
```

### Otros Servicios Gratuitos
- [EasyCron](https://www.easycron.com/) - 1 cron job gratis
- [UptimeRobot](https://uptimerobot.com/) - Monitoreo + cron jobs
- [Cronitor](https://cronitor.io/) - Plan gratuito disponible

## Verificación

Para verificar que los cron jobs funcionan correctamente:

1. Llama manualmente al endpoint con el header de autorización:
```bash
curl -X GET \
  -H "Authorization: Bearer tu-CRON_SECRET" \
  https://tu-dominio.vercel.app/api/cron/send-consultation-emails
```

2. Revisa los logs en Vercel para confirmar que se ejecutó correctamente.

## Notas Importantes

- **Seguridad:** Nunca compartas tu `CRON_SECRET` públicamente
- **Límites:** Algunos servicios gratuitos tienen límites de ejecuciones por mes
- **Monitoreo:** Considera agregar alertas si un cron job falla múltiples veces
- **Backup:** Si un servicio falla, puedes configurar múltiples servicios como respaldo

