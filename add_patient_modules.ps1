# Script para agregar los módulos restantes al documento de funcionalidades del paciente

$content = @"


═══════════════════════════════════════════════════════════════════════════════════
2. HISTORIAL MÉDICO COMPLETO (/dashboard/patient/historial)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Acceso total y permanente a TODAS las consultas médicas realizadas.
El paciente es dueño de su historial y puede consultarlo 24/7.

ESTE ES EL DIFERENCIADOR #1 DE ASHIRA:
"Nunca más pierdas un documento médico"

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. VISUALIZACIÓN DE CONSULTAS:
   
   1. Lista Completa de Consultas:
      • Todas las consultas ordenadas por fecha (más reciente primero)
      • Fecha y hora de cada consulta
      • Nombre del médico que atendió
      • Motivo de consulta
      • Diagnóstico completo
      • Notas médicas del doctor
   
   2. Signos Vitales Registrados:
      • Presión arterial
      • Frecuencia cardíaca (bpm)
      • Temperatura (°C)
      • Peso (kg)
      • Visualización en tarjetas con colores distintivos
   
   3. Documentos e Informes Médicos:
      • Todos los archivos adjuntos por el médico
      • Imágenes médicas (rayos X, resonancias, ecografías)
      • Informes de laboratorio
      • Estudios especializados
      • Descarga directa de cada documento
      • Vista previa de imágenes
   
   4. Prescripciones Asociadas:
      • Recetas emitidas en cada consulta
      • Medicamentos prescritos con detalles completos
      • Dosis, frecuencia, duración
      • Instrucciones especiales
      • Recetas escaneadas adjuntas
      • Estado de la prescripción (Activa, Completada, Vencida)

B. COMPARTIR HISTORIAL:
   
   1. Generar Enlace Compartible:
      • Botón "Compartir" en cada consulta
      • Genera URL única y segura
      • Válida por tiempo limitado (configurable)
      • No requiere login para ver
   
   2. Copiar Enlace:
      • Copiar al portapapeles con un clic
      • Confirmación visual (checkmark)
      • Compartir con otros médicos
      • Compartir con familiares
      • Útil para segundas opiniones
   
   3. Control de Privacidad:
      • El paciente decide qué compartir
      • Puede compartir consultas específicas
      • No comparte TODO el historial automáticamente
      • Seguridad y privacidad garantizadas

C. TABS DE ORGANIZACIÓN:
   
   1. Tab "Consultas":
      • Vista principal de todas las consultas
      • Información médica completa
      • Archivos adjuntos
      • Prescripciones
   
   2. Tab "Registros Médicos":
      • Vista alternativa del mismo contenido
      • Enfoque en documentos y archivos
      • Organización cronológica

D. DISEÑO Y EXPERIENCIA:
   • Tarjetas expandibles por consulta
   • Gradientes de colores por tipo de información
   • Iconos intuitivos (calendario, usuario, píldora, matraz)
   • Responsive (móvil, tablet, desktop)
   • Animaciones suaves (Framer Motion)
   • Loading states elegantes
   • Empty states informativos

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Paciente NO tiene acceso a su historial
   • Debe pedir documentos al médico cada vez
   • Información fragmentada
   • Documentos en papel que se pierden
   • No puede compartir con otros médicos

✅ ASHIRA:
   • Acceso total 24/7 a TODO el historial
   • Todos los documentos guardados permanentemente
   • Compartir con cualquier médico al instante
   • Imágenes y archivos siempre disponibles
   • Portabilidad total de datos
   • El paciente es DUEÑO de su información

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Reducción de llamadas: "Doctor, ¿me puede enviar mi receta?"
✅ Pacientes mejor informados en consultas de seguimiento
✅ Continuidad de atención mejorada
✅ Menos tiempo buscando documentos antiguos
✅ Diferenciación competitiva clara
✅ Mayor satisfacción del paciente = más referencias

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. PACIENTE CON ENFERMEDAD CRÓNICA:
   • Accede a su historial completo antes de cada consulta
   • Revisa evolución de signos vitales
   • Comparte historial con nuevo especialista
   • Nunca pierde documentos importantes

2. PACIENTE QUE CAMBIA DE MÉDICO:
   • Comparte enlace de historial con nuevo doctor
   • No necesita pedir documentos al médico anterior
   • Continuidad de atención garantizada
   • Ahorro de tiempo y dinero en estudios duplicados

3. EMERGENCIA MÉDICA:
   • Familiar accede al historial compartido
   • Muestra información vital a médico de emergencia
   • Alergias, condiciones previas, medicamentos actuales
   • Puede salvar vidas


═══════════════════════════════════════════════════════════════════════════════════
3. RECETAS MÉDICAS DIGITALES (/dashboard/patient/recetas)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Almacenamiento permanente de TODAS las recetas médicas.
Nunca más perder una receta en papel.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. LISTADO DE RECETAS:
   
   1. Recetas Activas:
      • Recetas vigentes (no vencidas)
      • Destacadas visualmente
      • Badge verde "ACTIVA"
      • Ordenadas por fecha de emisión
   
   2. Recetas Vencidas:
      • Recetas fuera de vigencia
      • Badge rojo "VENCIDA"
      • Aún accesibles para historial
      • Fecha de vencimiento visible
   
   3. Recetas Completadas:
      • Tratamientos finalizados
      • Badge azul "COMPLETADA"
      • Historial de medicamentos usados

B. INFORMACIÓN DETALLADA POR RECETA:
   
   1. Datos de la Receta:
      • Fecha de emisión
      • Fecha de vencimiento
      • Nombre del médico que prescribió
      • Estado actual (Activa/Vencida/Completada)
      • Notas adicionales del médico
   
   2. Medicamentos Prescritos:
      • Nombre del medicamento
      • Dosis exacta
      • Forma farmacéutica (tableta, jarabe, etc.)
      • Frecuencia de toma
      • Duración del tratamiento
      • Cantidad prescrita
      • Instrucciones especiales
   
   3. Visualización por Medicamento:
      • Tarjetas individuales por cada medicamento
      • Icono de píldora
      • Grid responsive
      • Información clara y legible

C. DESCARGAS Y ARCHIVOS:
   • Descargar receta en PDF
   • Recetas escaneadas adjuntas
   • Imágenes de recetas físicas
   • Compartir con farmacias

D. FILTROS Y BÚSQUEDA:
   • Filtrar por estado (Activa/Vencida/Completada)
   • Buscar por medicamento
   • Ordenar por fecha
   • Ver historial completo

E. DISEÑO:
   • Gradientes teal-cyan para recetas activas
   • Rojo para vencidas
   • Azul para completadas
   • Iconos intuitivos
   • Responsive
   • Animaciones suaves

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Recetas solo en papel
   • Se pierden fácilmente
   • No hay historial digital
   • Paciente debe pedir duplicados

✅ ASHIRA:
   • Todas las recetas guardadas digitalmente
   • Acceso permanente 24/7
   • Nunca se pierden
   • Descarga cuando sea necesario
   • Historial completo de medicamentos

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Cero llamadas: "Doctor, perdí mi receta"
✅ No reimprimir recetas
✅ Pacientes cumplen mejor el tratamiento
✅ Trazabilidad completa
✅ Imagen profesional y moderna

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. PACIENTE EN FARMACIA:
   • Olvidó receta en papel en casa
   • Abre ASHIRA en su teléfono
   • Muestra receta digital al farmacéutico
   • Compra medicamento sin problemas

2. TRATAMIENTO CRÓNICO:
   • Revisa recetas anteriores
   • Verifica dosis de medicamento habitual
   • Compara con nueva receta
   • Detecta cambios en tratamiento


═══════════════════════════════════════════════════════════════════════════════════
4. RESULTADOS DE LABORATORIO (/dashboard/patient/resultados)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Almacenar y gestionar TODOS los resultados de laboratorio e imágenes médicas.
El paciente puede SUBIR sus propios resultados.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. VISUALIZACIÓN DE RESULTADOS:
   
   1. Resultados Recibidos del Médico:
      • Resultados vinculados a consultas
      • Tipo de resultado (sangre, orina, imagen, etc.)
      • Fecha del reporte
      • Médico que solicitó el estudio
      • Diagnóstico asociado
      • Resultados críticos destacados (⚠️)
   
   2. Archivos Adjuntos:
      • PDFs de resultados
      • Imágenes médicas (rayos X, resonancias, TAC, ecografías)
      • Informes de laboratorio
      • Estudios especializados
      • Vista previa de imágenes
      • Descarga directa

B. SUBIR RESULTADOS PROPIOS (FUNCIONALIDAD ÚNICA):
   
   1. Formulario de Carga:
      • Seleccionar consulta relacionada
      • Tipo de resultado
      • Subir múltiples archivos
      • Imágenes y PDFs
      • Notas opcionales
   
   2. Validaciones:
      • Formatos permitidos (PDF, JPG, PNG, DICOM)
      • Tamaño máximo por archivo
      • Múltiples archivos simultáneos
      • Vista previa antes de subir
   
   3. Almacenamiento:
      • Guardado permanente en Supabase Storage
      • Vinculado a la consulta
      • Accesible para el médico
      • Disponible en historial

C. RESULTADOS CRÍTICOS:
   • Badge de alerta roja
   • Icono de advertencia
   • Destacados visualmente
   • Requieren atención inmediata

D. DISEÑO:
   • Tarjetas por resultado
   • Gradientes por tipo
   • Iconos de matraz para laboratorio
   • Responsive
   • Modal de carga de archivos
   • Drag & drop para subir

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Paciente NO puede subir resultados
   • Resultados solo en papel
   • Se pierden fácilmente
   • No hay centralización

✅ ASHIRA:
   • Paciente PUEDE subir sus propios resultados
   • Todos los resultados en un solo lugar
   • Imágenes médicas almacenadas
   • Acceso permanente
   • Compartir con médicos fácilmente

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Pacientes traen resultados digitalizados
✅ No más papeles perdidos
✅ Resultados disponibles antes de la consulta
✅ Mejor preparación del médico
✅ Consultas más eficientes

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. PACIENTE CON ESTUDIOS EXTERNOS:
   • Se hace análisis en laboratorio externo
   • Recibe resultados en papel
   • Sube PDF a ASHIRA
   • Médico puede verlos antes de la consulta
   • No se pierden los resultados

2. SEGUIMIENTO DE ENFERMEDAD:
   • Compara resultados de laboratorio en el tiempo
   • Ve evolución de valores
   • Identifica mejoras o empeoramientos
   • Mejor comprensión de su salud


═══════════════════════════════════════════════════════════════════════════════════
5. GESTIÓN DE CITAS (/dashboard/patient/citas)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Gestión completa de citas médicas: ver, agendar, cancelar, reagendar.
Autonomía total del paciente.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. VER CITAS PROGRAMADAS:
   
   1. Lista de Citas:
      • Todas las citas futuras
      • Fecha y hora
      • Médico asignado
      • Consultorio/clínica
      • Motivo de la cita
      • Ubicación
      • Duración estimada
   
   2. Estados de Citas:
      • Confirmada (verde)
      • Pendiente (amarillo)
      • Cancelada (rojo)
      • Completada (azul)
      • Iconos visuales por estado

B. AGENDAR NUEVA CITA:
   • Botón "Agendar Nueva Cita"
   • Link a /dashboard/patient/citas/new
   • Wizard de agendamiento
   • Selección de consultorio
   • Selección de médico
   • Selección de servicio
   • Selección de fecha y hora
   • Confirmación

C. CANCELAR CITA:
   • Botón "Cancelar" en cada cita
   • Confirmación antes de cancelar
   • Actualización en tiempo real
   • Notificación al consultorio
   • Liberación de espacio en agenda

D. REAGENDAR CITA:
   
   1. Modal de Reagendamiento:
      • Botón "Reagendar" en cada cita
      • Componente RescheduleModal
      • Selección de nueva fecha
      • Selección de nueva hora
      • Confirmación de cambio
   
   2. Validaciones:
      • Disponibilidad del médico
      • Horarios permitidos
      • No reagendar citas pasadas
      • Confirmación visual

E. HISTORIAL DE CITAS:
   • Ver citas pasadas
   • Citas completadas
   • Citas canceladas
   • Filtros por fecha
   • Búsqueda

F. DISEÑO:
   • Tarjetas por cita
   • Gradientes por estado
   • Iconos intuitivos
   • Responsive
   • Animaciones
   • Modal de reagendamiento

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Agendar solo por teléfono
   • Horario de oficina limitado
   • Espera en línea
   • No puede cancelar online
   • No puede reagendar online

✅ ASHIRA:
   • Agendar 24/7 online
   • Cancelar con un clic
   • Reagendar fácilmente
   • Sin llamadas telefónicas
   • Autonomía total del paciente

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Reducción de llamadas telefónicas (hasta 60%)
✅ Menos carga para recepción
✅ Mejor utilización de agenda
✅ Menos no-shows (paciente más comprometido)
✅ Disponibilidad 24/7 para agendar

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. PACIENTE OCUPADO:
   • Necesita cita médica
   • No puede llamar en horario de oficina
   • Abre ASHIRA a las 10 PM
   • Agenda cita en 2 minutos
   • Recibe confirmación automática

2. CAMBIO DE PLANES:
   • Tiene cita agendada
   • Surge compromiso laboral
   • Reagenda desde su teléfono
   • Sin llamar al consultorio
   • Confirmación instantánea


═══════════════════════════════════════════════════════════════════════════════════
6. GESTIÓN FAMILIAR (/dashboard/patient/family)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Gestionar la salud de toda la familia desde una sola cuenta.
Ideal para padres con hijos o cuidadores de adultos mayores.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. CREAR GRUPO FAMILIAR:
   
   1. Configuración Inicial:
      • Nombre del grupo familiar
      • Máximo de miembros (según plan)
      • Propietario del grupo
      • Permisos y roles
   
   2. Validaciones:
      • Solo un grupo por cuenta
      • Límite de miembros según plan
      • Verificación de identidad

B. AGREGAR MIEMBROS:
   
   1. Agregar por Código:
      • Generar código de invitación
      • Compartir código con familiar
      • Familiar ingresa código
      • Vinculación automática
   
   2. Agregar Manualmente:
      • Ingresar datos del familiar
      • Nombre, apellido, identificación
      • Fecha de nacimiento
      • Género
      • Relación familiar (hijo, padre, cónyuge, etc.)
   
   3. Permisos:
      • Propietario: acceso total
      • Miembro: acceso limitado
      • Configuración de privacidad

C. VER INFORMACIÓN DE MIEMBROS:
   
   1. Tarjetas de Miembros:
      • Foto o avatar
      • Nombre completo
      • Edad calculada
      • Género
      • Relación familiar
      • Número de consultas
   
   2. Acceso a Historial:
      • Ver consultas de cada miembro
      • Recetas de cada miembro
      • Citas programadas
      • Resultados de laboratorio
      • (Según permisos configurados)

D. GESTIONAR CITAS FAMILIARES:
   • Agendar citas para cualquier miembro
   • Ver todas las citas familiares
   • Calendario familiar
   • Recordatorios para todos

E. REMOVER MIEMBROS:
   • Botón "Remover" por miembro
   • Confirmación antes de remover
   • Solo propietario puede remover
   • Datos del miembro se mantienen privados

F. CÓDIGOS DE ACCESO:
   • Generar códigos de invitación
   • Códigos únicos por miembro
   • Expiración de códigos
   • Seguridad y privacidad

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Una cuenta por persona
   • No hay gestión familiar
   • Padres deben tener múltiples cuentas
   • No hay visibilidad de salud familiar

✅ ASHIRA:
   • Gestión familiar integrada
   • Una cuenta para toda la familia
   • Ver salud de todos los miembros
   • Agendar citas para cualquier miembro
   • Ideal para padres y cuidadores

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Familias completas como pacientes
✅ Mayor retención (toda la familia vinculada)
✅ Más citas por grupo familiar
✅ Referencias dentro de la familia
✅ Mejor experiencia para padres

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. MADRE CON 3 HIJOS:
   • Crea grupo familiar
   • Agrega a sus 3 hijos
   • Agenda citas para todos
   • Ve historial médico de cada uno
   • Gestiona recetas de todos
   • Todo desde una sola cuenta

2. CUIDADOR DE ADULTO MAYOR:
   • Agrega a padre anciano al grupo
   • Acompaña a consultas
   • Accede a recetas del padre
   • Gestiona citas médicas
   • Comparte información con otros familiares


═══════════════════════════════════════════════════════════════════════════════════
7. QR DE EMERGENCIA (/dashboard/patient/qr-urgente)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Código QR con información médica vital para emergencias.
Puede salvar vidas.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. GENERAR QR DE EMERGENCIA:
   
   1. Información Incluida:
      • Nombre completo del paciente
      • Identificación (cédula/pasaporte)
      • Fecha de nacimiento y edad
      • Género
      • Tipo de sangre
      • Alergias conocidas
      • Condiciones médicas crónicas
      • Contacto de emergencia (nombre, teléfono, relación)
   
   2. Generación del QR:
      • Token único y seguro
      • URL pública accesible
      • No requiere login para ver
      • Información vital visible al instante
      • Actualización en tiempo real

B. ACTIVAR/DESACTIVAR QR:
   • Toggle para activar/desactivar
   • Cuando está desactivado, el QR no funciona
   • Control de privacidad
   • Activar solo cuando sea necesario

C. REGENERAR TOKEN:
   • Botón "Regenerar Código"
   • Invalida QR anterior
   • Genera nuevo token
   • Nueva URL
   • Seguridad mejorada

D. DESCARGAR QR:
   • Botón "Descargar QR"
   • Descarga imagen PNG
   • Imprimir y llevar en billetera
   • Pegar en refrigerador
   • Compartir con familiares

E. COPIAR URL:
   • Botón "Copiar Enlace"
   • Copiar URL al portapapeles
   • Compartir por WhatsApp
   • Enviar a familiares
   • Acceso rápido

F. TARJETA DE EMERGENCIA:
   • Componente EmergencyCard
   • Vista previa de información
   • Diseño profesional
   • Información clara y legible
   • Ideal para imprimir

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • No existe QR de emergencia
   • Información vital no accesible
   • En emergencia, no hay datos del paciente
   • Médicos de emergencia trabajan a ciegas

✅ ASHIRA:
   • QR de emergencia único
   • Información vital accesible al instante
   • No requiere login
   • Puede salvar vidas
   • Alergias y condiciones visibles
   • Contacto de emergencia disponible

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Diferenciador único en el mercado
✅ Valor agregado para pacientes
✅ Seguridad del paciente mejorada
✅ Imagen de innovación
✅ Atracción de pacientes conscientes de seguridad

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. ACCIDENTE DE TRÁNSITO:
   • Paciente inconsciente
   • Paramédico escanea QR en billetera
   • Ve alergias a penicilina
   • Evita administrar medicamento peligroso
   • Llama a contacto de emergencia
   • SALVA LA VIDA DEL PACIENTE

2. ADULTO MAYOR CON DEMENCIA:
   • Se pierde en la calle
   • Policía escanea QR en pulsera
   • Ve nombre, dirección, contacto
   • Llama a familiar
   • Reúne al adulto con su familia


═══════════════════════════════════════════════════════════════════════════════════
8. MENSAJERÍA CON MÉDICOS (/dashboard/patient/mensajes)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Chat directo con médicos en tiempo real.
Consultas rápidas sin necesidad de cita.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. CONVERSACIONES:
   
   1. Lista de Conversaciones:
      • Todas las conversaciones con médicos
      • Último mensaje visible
      • Fecha del último mensaje
      • Mensajes no leídos (badge)
      • Foto del médico
      • Nombre y especialidad
   
   2. Iniciar Nueva Conversación:
      • Botón "Nueva Conversación"
      • Lista de médicos disponibles
      • Buscar médico por nombre
      • Filtrar por especialidad
      • Iniciar chat con un clic

B. CHAT EN TIEMPO REAL:
   
   1. Mensajes:
      • Enviar mensajes de texto
      • Adjuntar archivos (imágenes, PDFs)
      • Mencionar médico (@nombre)
      • Emojis
      • Formato de texto
   
   2. Tiempo Real:
      • Mensajes instantáneos
      • Indicador de "escribiendo..."
      • Notificaciones push
      • Sonido de notificación
      • Badge de mensajes no leídos
   
   3. Estados de Mensaje:
      • Enviado (un check)
      • Leído (dos checks)
      • Indicadores visuales

C. ADJUNTAR ARCHIVOS:
   • Botón de adjuntar (clip)
   • Imágenes de síntomas
   • Resultados de laboratorio
   • Recetas
   • Cualquier archivo relevante
   • Vista previa antes de enviar

D. BÚSQUEDA:
   • Buscar en conversaciones
   • Buscar mensajes específicos
   • Filtrar por médico
   • Historial completo

E. DISEÑO:
   • Interfaz de chat moderna
   • Burbujas de mensaje
   • Colores distintivos (paciente vs médico)
   • Responsive
   • Scroll automático
   • Animaciones suaves

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Solo llamadas telefónicas
   • Horario de oficina limitado
   • No hay registro de conversaciones
   • No se pueden enviar imágenes fácilmente

✅ ASHIRA:
   • Chat en tiempo real 24/7
   • Enviar imágenes y archivos
   • Historial de conversaciones
   • Consultas rápidas sin cita
   • Respuestas cuando el médico esté disponible

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Reducción de llamadas telefónicas
✅ Atención asíncrona (médico responde cuando puede)
✅ Consultas rápidas sin agendar cita
✅ Mejor comunicación médico-paciente
✅ Trazabilidad de conversaciones
✅ Monetización de consultas por chat (opcional)

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. DUDA SOBRE MEDICAMENTO:
   • Paciente tiene duda sobre dosis
   • Envía mensaje al médico
   • Adjunta foto de la receta
   • Médico responde en 10 minutos
   • Problema resuelto sin cita

2. SÍNTOMA NUEVO:
   • Paciente nota erupción en piel
   • Envía foto al dermatólogo
   • Médico evalúa
   • Indica si necesita cita urgente o no
   • Tranquilidad para el paciente


═══════════════════════════════════════════════════════════════════════════════════
9. PAGOS Y FACTURAS (/dashboard/patient/pagos)
═══════════════════════════════════════════════════════════════════════════════════

PROPÓSITO:
────────────────────────────────────────────────────────────────────────────
Gestión completa de pagos y facturas.
Pagar online desde el dashboard.

FUNCIONALIDADES PRINCIPALES:
────────────────────────────────────────────────────────────────────────────

A. VER FACTURAS:
   
   1. Lista de Facturas:
      • Todas las facturas (pendientes y pagadas)
      • Número de factura
      • Fecha de emisión
      • Monto total
      • Moneda (USD, VES, EUR)
      • Estado de pago (Pendiente, Pagada, Vencida)
      • Estado de factura (Emitida, Anulada)
   
   2. Detalles de Factura:
      • Subtotal
      • Impuestos
      • Total
      • Método de pago usado
      • Fecha de pago
      • Cita asociada
      • Médico que atendió
      • Consultorio/clínica
      • Servicio prestado

B. PAGAR ONLINE:
   
   1. Modal de Pago:
      • Botón "Pagar Ahora"
      • Componente PaymentModal
      • Selección de método de pago
      • Tarjeta de crédito/débito
      • Transferencia bancaria
      • Cashea (si está disponible)
      • Otros métodos
   
   2. Procesamiento:
      • Integración con pasarela de pago
      • Procesamiento seguro
      • Confirmación instantánea
      • Recibo digital
      • Actualización de estado

C. DESCARGAR RECIBOS:
   • Botón "Descargar Recibo"
   • PDF de factura
   • PDF de recibo de pago
   • Guardar para impuestos
   • Enviar por email

D. HISTORIAL DE PAGOS:
   • Ver todos los pagos realizados
   • Filtrar por fecha
   • Filtrar por estado
   • Búsqueda por número de factura
   • Exportar historial

E. ESTADOS VISUALES:
   • Pendiente: amarillo
   • Pagada: verde
   • Vencida: rojo
   • Anulada: gris
   • Iconos por estado

F. FORMATO DE MONEDA:
   • Componente CurrencyDisplay
   • Formato correcto por moneda
   • Símbolo de moneda
   • Decimales apropiados

DIFERENCIADORES VS COMPETENCIA:
────────────────────────────────────────────────────────────────────────────

❌ SOFTWARE TRADICIONAL:
   • Pago solo presencial
   • Efectivo o tarjeta en consultorio
   • No hay pagos online
   • Facturas en papel

✅ ASHIRA:
   • Pagar online 24/7
   • Múltiples métodos de pago
   • Facturas digitales
   • Recibos descargables
   • Historial completo de pagos

BENEFICIOS PARA EL CONSULTORIO:
────────────────────────────────────────────────────────────────────────────

✅ Pagos más rápidos
✅ Reducción de cuentas por cobrar
✅ Mejor flujo de caja
✅ Menos manejo de efectivo
✅ Trazabilidad completa
✅ Facturación digital

CASOS DE USO:
────────────────────────────────────────────────────────────────────────────

1. PACIENTE OCUPADO:
   • Recibe factura por email
   • Abre ASHIRA en su teléfono
   • Paga con tarjeta en 1 minuto
   • Recibe recibo digital
   • No necesita ir al consultorio

2. PAGO DESDE CASA:
   • Termina consulta virtual
   • Recibe factura en dashboard
   • Paga inmediatamente
   • Descarga recibo
   • Consultorio recibe pago al instante


═══════════════════════════════════════════════════════════════════════════════════
10-15. MÓDULOS ADICIONALES (RESUMEN)
═══════════════════════════════════════════════════════════════════════════════════

10. EXPLORAR CONSULTORIOS (/dashboard/patient/consultorio):
    • Buscar consultorios cercanos
    • Ver perfiles públicos
    • Servicios ofrecidos
    • Agendar citas directamente
    • Filtros por especialidad y ubicación

11. EXPLORAR CLÍNICAS (/dashboard/patient/clinics):
    • Buscar clínicas
    • Múltiples especialidades
    • Ubicaciones
    • Servicios disponibles

12. EXPLORAR FARMACIAS (/dashboard/patient/pharmacies):
    • Buscar farmacias cercanas
    • Enviar recetas digitales
    • Consultar disponibilidad de medicamentos
    • Ubicación en mapa

13. RECORDATORIOS (/dashboard/patient/recordatorios):
    • Recordatorios de medicamentos
    • Recordatorios de citas
    • Notificaciones personalizadas
    • Configuración de frecuencia

14. CONFIGURACIÓN Y PERFIL (/dashboard/patient/configuracion):
    • Editar perfil personal
    • Información médica (tipo de sangre, alergias)
    • Contacto de emergencia
    • Preferencias de notificaciones
    • Privacidad y seguridad
    • Cambiar contraseña

15. EXPLORAR SERVICIOS (/dashboard/patient/explore):
    • Descubrir servicios médicos
    • Filtrar por especialidad
    • Comparar precios
    • Leer descripciones
    • Agendar citas


═══════════════════════════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO: POR QUÉ ASHIRA ES DIFERENTE
═══════════════════════════════════════════════════════════════════════════════════

PROBLEMA ACTUAL EN EL MERCADO:
────────────────────────────────────────────────────────────────────────────

Los software médicos tradicionales están diseñados SOLO para el médico:
❌ El paciente es un simple "registro" en la base de datos
❌ No tiene acceso a su propia información médica
❌ Pierde documentos constantemente (recetas, resultados, informes)
❌ Debe llamar al consultorio para todo
❌ No puede agendar citas online
❌ No puede pagar online
❌ Su historial médico está "atrapado" en cada consultorio
❌ En emergencias, no hay acceso a información vital

SOLUCIÓN DE ASHIRA:
────────────────────────────────────────────────────────────────────────────

ASHIRA pone al PACIENTE en el centro:
✅ El paciente es DUEÑO de su información médica
✅ Acceso total 24/7 a TODO su historial
✅ NUNCA pierde documentos (recetas, resultados, imágenes)
✅ Puede agendar, cancelar, reagendar citas online
✅ Puede pagar facturas online
✅ Puede compartir su historial con cualquier médico
✅ QR de emergencia puede salvar vidas
✅ Chat directo con médicos
✅ Gestión familiar integrada
✅ Portabilidad total de datos

DIFERENCIADORES CLAVE (15 FUNCIONALIDADES ÚNICAS):
────────────────────────────────────────────────────────────────────────────

1.  Dashboard completo para pacientes (competencia: no existe)
2.  Historial médico accesible 24/7 (competencia: solo el doctor lo ve)
3.  Recetas digitales permanentes (competencia: papel que se pierde)
4.  Subir resultados propios (competencia: no pueden)
5.  Agendar citas online 24/7 (competencia: solo por teléfono)
6.  Cancelar/reagendar online (competencia: solo por teléfono)
7.  Gestión familiar (competencia: no existe)
8.  QR de emergencia (competencia: no existe)
9.  Chat con médicos (competencia: solo llamadas)
10. Pagos online (competencia: solo presencial)
11. Compartir historial (competencia: debe pedir al doctor)
12. Explorar consultorios (competencia: no existe)
13. Recordatorios automáticos (competencia: no existe)
14. Portabilidad de datos (competencia: datos atrapados)
15. Experiencia móvil premium (competencia: solo desktop o nada)

BENEFICIOS PARA DIFERENTES TIPOS DE CONSULTORIOS:
────────────────────────────────────────────────────────────────────────────

CONSULTORIO INDIVIDUAL:
✅ Diferenciación competitiva única
✅ Reducción de llamadas (40-60%)
✅ Imagen moderna y profesional
✅ Fidelización de pacientes
✅ Más referencias boca a boca

CONSULTORIO PEQUEÑO (2-5 MÉDICOS):
✅ Captación de pacientes mejorada
✅ Agendamiento online aumenta conversión
✅ Pagos más rápidos
✅ Coordinación entre especialistas
✅ Mejor experiencia del paciente

CLÍNICA MEDIANA (6-20 MÉDICOS):
✅ Escalabilidad
✅ Reducción de costos administrativos
✅ Análisis de datos
✅ Cumplimiento normativo
✅ Ventaja competitiva regional

CLÍNICA GRANDE (20+ MÉDICOS):
✅ Integración completa multi-sede
✅ Líder en tecnología médica
✅ ROI significativo
✅ Atracción de pacientes de alto valor
✅ Datos para decisiones estratégicas

ROI ESTIMADO PARA CONSULTORIOS:
────────────────────────────────────────────────────────────────────────────

REDUCCIÓN DE COSTOS:
• 40-60% menos llamadas telefónicas
• 30-50% menos tiempo administrativo
• 20-30% reducción de no-shows
• 50-70% menos manejo de efectivo

AUMENTO DE INGRESOS:
• 20-40% más citas (agendamiento 24/7)
• 15-25% más pagos puntuales
• 30-50% más referencias de pacientes satisfechos
• 10-20% más retención de pacientes

CONCLUSIÓN:
────────────────────────────────────────────────────────────────────────────

ASHIRA no es solo un software médico más.
Es una REVOLUCIÓN en la experiencia del paciente.

Mientras la competencia solo sirve al médico,
ASHIRA empodera al paciente y beneficia a todos.

"Nunca más pierdas un documento médico"
No es solo un slogan, es una promesa que cumplimos.


═══════════════════════════════════════════════════════════════════════════════════
FIN DEL DOCUMENTO
═══════════════════════════════════════════════════════════════════════════════════

Versión: 1.0
Fecha: 07 de Febrero de 2026
Documento: funcionalidades_patient_dashboard.txt
Sistema: ASHIRA SOFTWARE
Autor: Equipo de Desarrollo ASHIRA

Para más información:
- funcionalidades_medic_dashboard.txt (Funcionalidades para médicos)
- Documentación técnica en /docs
- API documentation en /api/docs

═══════════════════════════════════════════════════════════════════════════════════
"@

# Agregar contenido al archivo existente
Add-Content -Path "c:\Users\Dereck\Desktop\Proyectos Grandes\Clinica_Syncwave_MVP\my-app\funcionalidades_patient_dashboard.txt" -Value $content

Write-Host "✅ Módulos agregados exitosamente al documento de funcionalidades del paciente" -ForegroundColor Green
Write-Host "📄 Archivo: funcionalidades_patient_dashboard.txt" -ForegroundColor Cyan
