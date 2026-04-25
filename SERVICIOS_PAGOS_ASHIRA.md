# Servicios de Terceros y Enlaces de Pago - ASHIRA

Este documento resume todos los servicios externos y proveedores de infraestructura que utiliza ASHIRA para su funcionamiento. Muchos de estos servicios tienen capas gratuitas, pero requieren suscripción o pago por uso según la escala del proyecto.

## 1. Infraestructura y Hosting
- **Vercel**: Hosting principal de la aplicación Next.js y las Serverless Functions.
    - *Enlace*: [vercel.com](https://vercel.com)
- **Railway**: Utilizado para el despliegue del servidor **WAHA** (WhatsApp HTTP API).
    - *Enlace*: [railway.app](https://railway.app)
- **Supabase**: Backend-as-a-Service para la base de datos PostgreSQL, autenticación de usuarios y almacenamiento de archivos (S3).
    - *Enlace*: [supabase.com](https://supabase.com)

## 2. Comunicaciones (Email y WhatsApp)
- **Resend**: Proveedor principal para el envío de correos electrónicos transaccionales (invitaciones a médicos, notificaciones).
    - *Enlace*: [resend.com](https://resend.com)
- **SendGrid**: Proveedor secundario o de respaldo para envíos de email masivos.
    - *Enlace*: [sendgrid.com](https://sendgrid.com)
- **WAHA (WhatsApp HTTP API)**: API que permite la conexión con WhatsApp para recordatorios automáticos. Se paga el hosting en Railway para mantenerlo activo 24/7.
    - *Enlace*: [waha.dev](https://waha.dev)

## 3. Inteligencia Artificial
- **Google Gemini (Google AI Studio)**: Motor principal de procesamiento de lenguaje natural para ASHIRA-Voice y ASHIRA-Memory.
    - *Enlace*: [aistudio.google.com](https://aistudio.google.com)
- **Groq**: Inferencia de alta velocidad para transcripciones de audio a texto (Whisper) y fallback de modelos LLM (Llama 3).
    - *Enlace*: [groq.com](https://groq.com)

## 4. Automatización y Otros
- **n8n Cloud**: Orquestador de flujos de trabajo (workflows) para la generación de informes médicos y sincronización de datos.
    - *Enlace*: [n8n.io](https://n8n.io)
- **Stripe**: Plataforma de procesamiento de pagos para las suscripciones de los médicos y clínicas.
    - *Enlace*: [stripe.com](https://stripe.com)
- **OMS ICD-11 API**: API de la OMS para la búsqueda de códigos de enfermedades (CIE-11).
    - *Enlace*: [icd.who.int/icdapi](https://icd.who.int/icdapi)

---
**Nota**: El mantenimiento de estos servicios es fundamental para asegurar que funcionalidades como el envío de WhatsApp, los correos de invitación y el análisis por IA permanezcan operativos.
