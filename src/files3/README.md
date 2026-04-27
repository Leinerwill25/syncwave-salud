# Ash — Asistente del Paciente · Guía de Integración

Ash ahora vive también en el **dashboard del paciente** de ASHIRA.
Puede buscar especialistas, mostrar citas, recetas, recordatorios, historial y resultados de lab —
todo desde el chat. SafeCare se menciona orgánicamente cuando aplica.

---

## 1. Archivos entregados

| Ruta | Descripción |
|------|-------------|
| `src/app/api/ash-patient/route.ts` | API route con system prompt completo para el paciente |
| `src/components/patient/AshPatient/index.tsx` | Componente flotante del chat |

---

## 2. Variable de entorno

La misma que ya usas para el Ash del médico:

```bash
# .env.local (ya configurada en Vercel)
GEMINI_API_KEY=tu_clave_aqui
```

---

## 3. Integración en el layout del paciente

Abre `src/app/dashboard/patient/layout.tsx` y agrega el componente:

```tsx
import AshPatient from '@/components/patient/AshPatient';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ServerDashboardGuard allowedRoles={['PACIENTE']}>
      <div className="min-h-screen ...">
        <PatientHamburgerMenu />
        <div className="...">
          <div className="flex flex-col md:flex-row ...">
            <SidebarPatient />
            <main className="flex-1 min-w-0 w-full">
              {children}
            </main>
          </div>
        </div>
        
        {/* 👇 Agregar esta línea */}
        <AshPatient patientName="Nombre del paciente" />
      </div>
    </ServerDashboardGuard>
  );
}
```

Para pasar el nombre real del paciente al componente, puedes convertir el layout en un
Client Component y obtenerlo con un fetch al API de perfil, o pasar la prop desde
el server component si ya tienes los datos:

```tsx
// Si tienes el nombre disponible en el server:
<AshPatient patientName={patientName} />

// Si no, el componente usa "Paciente" como fallback — funciona perfectamente igual
<AshPatient />
```

---

## 4. Capacidades de Ash para el Paciente

### 🔍 Búsqueda de especialistas
- Detecta automáticamente la especialidad que el paciente menciona
- Llama a `/api/patient/explore?type=CONSULTORIO_PRIVADO&specialty=X`
- Muestra máximo 5 cards con foto, especialidad, dirección, teléfono
- Cada card tiene botón "Ver perfil" y botón "Crear cita" (link a `/citas/new?clinic_id=X`)

### 📅 Citas
- Consulta `/api/patient/appointments?status=upcoming`
- Muestra las próximas 3 citas con fecha, hora, médico y organización

### 🏥 Historial / Última consulta
- Consulta `/api/patient/historial`
- Muestra la consulta más reciente con motivo y diagnóstico

### 💊 Recetas
- Consulta `/api/patient/recetas?status=active`
- Muestra hasta 3 recetas activas con medicamentos y fechas de vencimiento

### ⏰ Recordatorios de medicamentos
- Consulta `/api/patient/medication-reminders`
- Muestra hasta 4 medicamentos con estado (tomado / pendiente / próximo)

### 🧪 Resultados de laboratorio
- Consulta `/api/patient/resultados`
- Muestra hasta 3 resultados, marcando los críticos

### 🏡 SafeCare
- Se menciona orgánicamente cuando el paciente describe síntomas urgentes
  o cuando dice que no puede ir a consulta
- Máximo una vez por conversación a menos que el paciente pregunte

---

## 5. Ejemplos de conversación

```
Paciente: "Necesito un ginecólogo"
Ash: "Claro, te muestro los especialistas disponibles en ASHIRA:"
→ Muestra hasta 5 cards de ginecólogos con botón Crear Cita

Paciente: "Ash, ¿cuál fue mi última consulta?"
Ash: "Déjame ver tu última atención médica:"
→ Muestra card con fecha, médico, motivo y diagnóstico

Paciente: "Recuérdame que debo tomar mis pastillas"
Ash: "Estos son tus recordatorios de medicamentos activos:"
→ Muestra lista de medicamentos con estado del día

Paciente: "Tengo mucho dolor en el pecho"
Ash: "Eso puede ser preocupante. Te recomiendo buscar atención lo antes posible.
     Puedes agendar con un cardiólogo en ASHIRA, y si el dolor es muy fuerte,
     recuerda que SafeCare tiene atención médica a domicilio disponible 24/7."
```

---

## 6. Extensión futura

Cuando quieras agregar más acciones, simplemente:
1. Agrega el case en `executeAction()` dentro del componente
2. Crea el tipo de `RichContent` correspondiente
3. Crea el subcomponente de renderizado
4. Documenta la action en el system prompt de la API

La arquitectura está diseñada para ser 100% extensible sin tocar el resto del sistema.
