# Ash Dashboard — Guía de Integración

Ash ahora vive dentro del dashboard médico de ASHIRA como asistente de ayuda interna.
Conoce **todos** los módulos del sistema y guía al médico en tiempo real según la pantalla donde esté.

---

## 1. Archivos entregados

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/ash-dashboard/route.ts` | API route (Gemini) con system prompt completo |
| `src/components/AshDashboard/index.tsx` | Componente flotante del chat |

---

## 2. Variable de entorno requerida

La misma que ya tienes para Ash de /register:

```bash
# .env.local
GEMINI_API_KEY=tu_clave_aqui
```

Si ya está configurada en Vercel, no necesitas hacer nada más.

---

## 3. Integración en el layout del dashboard

Abre `src/app/dashboard/medic/layout.tsx` (o el archivo que envuelve todas las rutas de `/dashboard/medic`).

Agrega el componente:

```tsx
// src/app/dashboard/medic/layout.tsx
import AshDashboard from '@/components/AshDashboard';

export default function MedicLayout({ children }) {
  return (
    <>
      {/* ... tu layout existente ... */}
      {children}

      {/* Ash — Asistente interno del dashboard */}
      <AshDashboard />
    </>
  );
}
```

El componente se auto-oculta en rutas fuera de `/dashboard/medic/**`, así que es seguro ponerlo en el layout padre.

---

## 4. Diferencias vs Ash de /register

| Característica | Ash /register | Ash Dashboard |
|---|---|---|
| Ruta activa | Solo `/register` | Todas las de `/dashboard/medic/**` |
| Colores | Teal/Cyan | Violeta/Indigo |
| API endpoint | `/api/ash-onboarding` | `/api/ash-dashboard` |
| Sistema de prompts | Flujo de registro | Todos los módulos de ASHIRA |
| Quick replies | Por tipo de usuario | Por módulo/pantalla actual |
| Contexto dinámico | Paso del formulario | Ruta actual + nombre del módulo |
| Auto-apertura | Sí (4 seg) | No (espera click del médico) |

---

## 5. Comportamiento por módulo

Ash detecta automáticamente en qué pantalla está el médico y:

1. Muestra el nombre del módulo actual en el header del chat
2. Ofrece **Quick Replies** específicas para esa pantalla (ej: en `/citas` pregunta sobre tipos de agendamiento)
3. Si el médico escribe algo, el sistema prompt inyecta el módulo actual para dar respuestas contextuales

### Módulos reconocidos:
- Panel General, Citas, Consultas, Recetas, Plantilla de Informe, Plantilla de Receta
- Configuración (Perfil, Consultorio, Roles, Moneda)
- WhatsApp, Laboratorios, Reportes

---

## 6. System Prompt — Conocimiento cubierto

El prompt de Ash en el dashboard incluye:
- Flujo de configuración inicial recomendado (10 pasos)
- Todos los campos de Perfil Profesional y sus requisitos
- Cómo funciona el sistema de Horarios (turnos vs orden de llegada, consultorios)
- Cómo crear y usar Citas (pacientes registrados/no registrados, servicios, combos)
- Plantillas de Informe y Receta (marcadores disponibles, obstetras)
- Informe Genérico (logo, colores, tipografía)
- Roles y Access Control
- Configuración de Moneda con tasas en tiempo real
- Integración WhatsApp (WAHA, QR, recordatorios)
- Link Público y página de consultorio
- Módulo de Alertas y Pagos Pendientes

---

## 7. Posición en pantalla

El botón flotante de Ash Dashboard aparece en `bottom-24 right-6` (justo arriba del botón de Alertas que está en `bottom-6 right-6`).

Si quieres ajustar la posición, cambia `bottom-24` en `AshDashboard/index.tsx`.

---

## 8. Personalización del System Prompt

El prompt vive en `src/app/api/ash-dashboard/route.ts` en la constante `ASH_DASHBOARD_SYSTEM_PROMPT`.

Para agregar información nueva (ej: una feature que lances): agrega una sección con el formato:
```
━━━━ MÓDULO: NOMBRE (/ruta) ━━━━
Descripción del módulo...
```

Para agregar quick replies para un módulo nuevo, agrega al `MODULE_MAP` en `AshDashboard/index.tsx`:
```tsx
'/dashboard/medic/mi-nuevo-modulo': {
  name: 'Mi Nuevo Módulo',
  quickReplies: ['¿Pregunta 1?', '¿Pregunta 2?', '¿Pregunta 3?'],
},
```
