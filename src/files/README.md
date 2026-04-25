# ASHIRA · Ash Onboarding v2 — Integración Final

## Archivos entregados

```
src/
├── app/
│   ├── api/ash-onboarding/
│   │   └── route.ts        ← NUEVO — Route handler Gemini (API key server-side)
│   └── register/
│       └── page.tsx        ← MODIFICADO — Solo 2 líneas agregadas
└── components/AshOnboarding/
    └── index.tsx           ← NUEVO — Widget de chat flotante
```

---

## Integración en 4 pasos

### 1. Copiar los dos archivos nuevos

```bash
# Rutas exactas donde van:
src/app/api/ash-onboarding/route.ts
src/components/AshOnboarding/index.tsx
```

### 2. Modificar register/page.tsx

Solo agregar estas 2 líneas en tu `page.tsx` existente:

```tsx
// Al inicio del archivo:
import AshOnboarding from '@/components/AshOnboarding';

// Al final del return, antes del cierre de </main>:
<AshOnboarding />
```

### 3. Obtener API key de Gemini (gratis)

1. Ir a https://aistudio.google.com/
2. Crear proyecto → "Get API Key"
3. Copiar la clave

### 4. Configurar variable de entorno

**.env.local** (local):
```
GEMINI_API_KEY=AIzaSy...tu_clave_aqui
```

**Vercel Dashboard** → Settings → Environment Variables:
```
Name: GEMINI_API_KEY
Value: AIzaSy...tu_clave_aqui
Environments: Production + Preview + Development
```

---

## Qué sabe Ash exactamente

El system prompt contiene todos los campos reales del RegisterForm:

| Tipo | Campos obligatorios | Precio |
|------|-------------------|--------|
| Médico | Nombre del consultorio | €49/mes |
| Paciente | Nombres, apellidos, cédula | Gratis |
| Enfermero/a | Número de licencia/matrícula | €20/mes |
| Clínica | Nombre, especialistas, sedes | €144-150/esp |

El asistente conoce:
- Los 4 pasos del formulario y qué campos tiene cada uno
- Los descuentos exactos (trimestral 5-10%, anual 15-30%)
- El costo de sedes adicionales (€45 o €30 según cantidad)
- La validación async de cédula y qué significa si encuentra historial
- Cuándo se requiere pago vs acceso gratuito (pacientes)
- Qué pasa con Farmacia/Laboratorio (deshabilitados, próximamente)

---

## Comportamiento del widget

| Evento | Resultado |
|--------|-----------|
| Usuario llega a /register | Botón flotante teal con badge rojo "1" |
| A los 4 segundos | Chat abre automáticamente con saludo de Ash |
| Usuario elige su tipo | Quick replies cambian al contexto correspondiente |
| Usuario avanza de paso | El widget detecta el paso actual vía MutationObserver y Ash ajusta sus respuestas |
| Usuario cierra el chat | Botón flotante reaparece (sin badge) |
| Cualquier otra ruta | Componente no se renderiza |

---

## Costo total

| Servicio | Costo |
|----------|-------|
| Gemini 2.0 Flash API | **$0/mes** (15 RPM, 1M tokens/día gratis) |
| Vercel route handler | Sin costo adicional |
| **Total** | **$0/mes** |

---

## Extensión futura

Para activar Ash en otras rutas (ej: configuración del médico):

```tsx
// En AshOnboarding/index.tsx, cambiar:
if (pathname !== '/register') return null;

// Por:
const ENABLED_PATHS = ['/register', '/dashboard/medic/configuracion'];
if (!ENABLED_PATHS.some(p => pathname?.startsWith(p))) return null;
```
