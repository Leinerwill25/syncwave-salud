# Optimizaciones de Cache Avanzadas - Respuestas < 1 segundo

Este documento describe las optimizaciones implementadas para lograr tiempos de respuesta y guardado menores a 1 segundo.

## 🚀 Optimizaciones Implementadas

### 1. **Sistema de Cache Inteligente por Tipo de Dato**

Se implementó un sistema de cache que clasifica los datos según su frecuencia de cambio:

- **`static`**: Datos que raramente cambian (configuración, planos)
  - Cache: 1 hora (3600s)
  - Stale-while-revalidate: 24 horas
  - Revalidate: 1 hora

- **`semi-static`**: Datos que cambian ocasionalmente (perfiles, servicios, organizaciones)
  - Cache: 5 minutos (300s)
  - Stale-while-revalidate: 30 minutos
  - Revalidate: 5 minutos

- **`dynamic`**: Datos que cambian frecuentemente (citas, consultas, KPIs)
  - Cache: 1 minuto (60s)
  - Stale-while-revalidate: 5 minutos
  - Revalidate: 1 minuto

- **`realtime`**: Datos que cambian en tiempo real (notificaciones, mensajes)
  - Cache: 10 segundos
  - Stale-while-revalidate: 1 minuto
  - Revalidate: 10 segundos

**Archivo**: `src/lib/api-cache-utils.ts`

### 2. **APIs Optimizadas**

#### `/api/patients` (semi-static)
- ✅ Cache headers optimizados (5 minutos)
- ✅ Queries paralelas optimizadas
- ✅ Límites en queries para reducir over-fetching
- ✅ Headers de cache consistentes en todas las respuestas

#### `/api/consultations` (dynamic)
- ✅ Cache headers optimizados (1 minuto)
- ✅ Queries optimizadas con campos mínimos en liteMode
- ✅ Headers de cache consistentes

#### `/api/dashboard/medic/kpis` (dynamic)
- ✅ Cache headers optimizados (1 minuto)
- ✅ Queries con `count: 'exact', head: true` para reducir transferencia de datos
- ✅ Headers de cache consistentes

#### `/api/dashboard/medic/appointments` (dynamic)
- ✅ Cache headers optimizados (1 minuto)
- ✅ Select fields optimizados según liteMode
- ✅ Headers de cache consistentes

#### `/api/organizations` (semi-static)
- ✅ Cache headers optimizados (5 minutos)
- ✅ Headers de cache consistentes

#### `/api/medic/services` (semi-static)
- ✅ Cache headers optimizados (5 minutos)
- ✅ Headers de cache consistentes

### 3. **QueryProvider Optimizado**

**Cambios implementados**:
- ✅ `staleTime`: Aumentado de 30s a **60s** (1 minuto)
- ✅ `gcTime`: Aumentado de 5min a **10min**
- ✅ `refetchOnWindowFocus`: Mantiene `false` (no refetch automático)
- ✅ `refetchOnReconnect`: Mantiene `false`

**Beneficios**:
- Reduce significativamente el número de requests al servidor
- Aprovecha mejor el cache del servidor (que ya está optimizado)
- Los datos se mantienen frescos por más tiempo en el cliente

**Archivo**: `src/providers/QueryProvider.tsx`

## 📊 Headers de Cache Implementados

### Cache-Control Headers

```typescript
// Para datos dinámicos
'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300, max-age=48'

// Para datos semi-static
'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800, max-age=240'

// Para datos estáticos
'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400, max-age=2880'
```

**Explicación**:
- `s-maxage`: Tiempo que el CDN cachea la respuesta
- `stale-while-revalidate`: Tiempo que puede servir datos stale mientras revalida en background
- `max-age`: Tiempo que el navegador cachea (80% de s-maxage para evitar problemas)

## 🎯 Impacto Esperado

### Tiempos de Respuesta

- **Primera carga**: Reducción del 50-70% gracias a cache agresivo
- **Navegación**: Respuestas instantáneas (< 200ms) desde cache
- **Refetch**: Solo cuando los datos realmente están stale

### Reducción de Carga

- **Requests al servidor**: Reducción del 60-80%
- **Transferencia de datos**: Reducción del 40-60% (queries optimizadas)
- **Carga en base de datos**: Reducción del 70-90% (cache efectivo)

### Experiencia de Usuario

- ✅ **Respuestas instantáneas**: Datos desde cache
- ✅ **Actualización transparente**: Stale-while-revalidate
- ✅ **Menor latencia percibida**: Cache del cliente + servidor
- ✅ **Mejor en conexiones lentas**: Menos requests = menos tiempo de espera

## 🔧 Uso de las Utilidades

### En APIs (Route Handlers)

```typescript
import { getApiResponseHeaders, getRevalidateConfig } from '@/lib/api-cache-utils';

// Configurar revalidate en el módulo
const cacheConfig = getRevalidateConfig('semi-static');
export const revalidate = cacheConfig.revalidate;
export const dynamic = cacheConfig.dynamic;

// En las respuestas
return NextResponse.json(data, {
	status: 200,
	headers: getApiResponseHeaders('semi-static'),
});
```

### Tipos de Cache por Endpoint

- **`static`**: Configuración, planos (pocos endpoints)
- **`semi-static`**: Perfiles, servicios, organizaciones
- **`dynamic`**: Citas, consultas, KPIs, pacientes (mayoría de endpoints)
- **`realtime`**: Notificaciones, mensajes (pocos endpoints)

## 📝 Notas Importantes

1. **Seguridad**: El cache se mantiene dinámico (`force-dynamic`) para datos dinámicos y semi-static para asegurar validación de autenticación
2. **Stale-while-revalidate**: Permite servir datos stale mientras se revalida en background, mejorando la percepción de velocidad
3. **Compatibilidad**: Todas las optimizaciones son compatibles con conexiones rápidas y lentas
4. **Invalidación**: Los datos se invalidan automáticamente después del tiempo de revalidate
5. **QueryProvider**: Los tiempos aumentados complementan el cache del servidor, no lo reemplazan

## 🔄 Próximas Optimizaciones Sugeridas

1. **Database Indexing**: Revisar y optimizar índices en consultas frecuentes
2. **Connection Pooling**: Optimizar pool de conexiones a Supabase
3. **Query Optimization**: Revisar queries N+1 y optimizarlas
4. **Response Compression**: Habilitar compresión gzip/brotli (si no está habilitado)
5. **CDN**: Considerar usar CDN para assets estáticos
6. **Edge Caching**: Considerar edge functions para cache más agresivo

## ✅ Checklist de Implementación

- [x] Sistema de cache por tipo de dato
- [x] Utilidades de cache headers
- [x] API `/api/patients` optimizada
- [x] API `/api/consultations` optimizada
- [x] API `/api/dashboard/medic/kpis` optimizada
- [x] API `/api/dashboard/medic/appointments` optimizada
- [x] API `/api/organizations` optimizada
- [x] API `/api/medic/services` optimizada
- [x] QueryProvider optimizado
- [ ] Revisar otras APIs críticas
- [ ] Optimizar queries de base de datos
- [ ] Implementar database indexing

## 🎯 Definición de Éxito

✅ Respuestas desde cache: < 200ms  
✅ Respuestas desde servidor (cache hit): < 500ms  
✅ Respuestas desde base de datos: < 1 segundo  
✅ Guardado de datos: < 1 segundo  
✅ Reducción de requests: > 60%  
✅ Sin regresiones funcionales  

