/**
 * Fuente única de verdad — precios, diferenciadores y tracción ASHIRA.
 * Todas las landings deben importar de aquí. Moneda: USD.
 */

export const ASHIRA_CURRENCY = 'USD' as const;
export const ASHIRA_SITE_URL = 'https://ashira.click';
export const ASHIRA_WHATSAPP = 'https://wa.me/584124885623';
export const ASHIRA_WHATSAPP_NUMBER = '584124885623';

/** Métricas de tracción — mismos números en cualquier página */
export const tractionStats = {
  patientsInProduction: 350,
  patientsLabel: '+350 pacientes en producción',
  aiModulesLive: 3,
  hoursSavedPerDay: 2,
  hoursSavedLabel: '2h ahorradas al día',
  roiMultiple: 8,
  roiLabel: '8x ROI documentado',
  setupMinutes: 10,
} as const;

/** Descuentos de facturación (fracción 0–1) */
export const billingDiscounts = {
  monthly: 0,
  quarterly: 0.1,
  annual: 0.3,
} as const;

export type BillingCycle = keyof typeof billingDiscounts;

function roundMoney(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function priceForCycle(monthlyUsd: number, cycle: BillingCycle): number {
  return roundMoney(monthlyUsd * (1 - billingDiscounts[cycle]));
}

/** Plan médico / consultorio individual — referencia pública $35/mes */
export const consultorioPricing = {
  id: 'consultorio',
  name: 'Médico / Consultorio',
  monthlyUsd: 35,
  currency: ASHIRA_CURRENCY,
  cycles: {
    monthly: {
      label: 'Mensual',
      perMonth: 35,
      billedOnce: 35,
      desc: 'Facturado mensualmente',
      popular: false,
      bestValue: false,
    },
    quarterly: {
      label: 'Trimestral',
      perMonth: priceForCycle(35, 'quarterly'),
      billedOnce: roundMoney(priceForCycle(35, 'quarterly') * 3),
      desc: `Ahorra 10% (Pago único de $${roundMoney(priceForCycle(35, 'quarterly') * 3)})`,
      popular: true,
      bestValue: false,
    },
    annual: {
      label: 'Anual',
      perMonth: priceForCycle(35, 'annual'),
      billedOnce: roundMoney(priceForCycle(35, 'annual') * 12),
      desc: 'Ahorra 30% (Mejor inversión)',
      popular: false,
      bestValue: true,
      annualSavingsVsMonthly: roundMoney(35 * 12 - priceForCycle(35, 'annual') * 12),
    },
  },
  featuresMonthly: [
    'Historia Clínica Digital 24/7',
    'Agenda con Recordatorios WhatsApp',
    'Recetas en PDF y Consulta Sucesiva',
    'Facturación Básica (USD/Bs)',
    'Rol: Asistente (Recepción, Pago, Triaje)',
    'Rol: Recepción (Flujo y Caja Chica)',
    'App Móvil (Próximamente)',
  ],
  featuresQuarterly: [
    'Historia Clínica Digital 24/7',
    'Agenda con Recordatorios WhatsApp',
    'Recetas en PDF y Consulta Sucesiva',
    'Facturación Básica (USD/Bs)',
    'Rol: Asistente (Recepción, Pago, Triaje)',
    'Rol: Recepción (Flujo y Caja Chica)',
    'Migración de Datos Gratis',
    'Soporte Prioritario VIP',
  ],
  featuresAnnual: [
    'TODO lo del plan Trimestral',
    `Ahorras $${roundMoney(35 * 12 - priceForCycle(35, 'annual') * 12)} al año`,
    'Configuración Asistida (Zoom)',
    'Capacitación a Personal',
    'Auditoría Anual de Datos',
    'Prioridad en Nuevas Funciones',
  ],
} as const;

/** Planes clínica por especialista (USD) + admin base */
export const clinicaPricing = {
  adminBaseUsd: 130,
  multiSede: {
    seats2to4Usd: 45,
    seats5to10Usd: 30,
  },
  tiers: [
    { name: 'Starter', tier: 'Grupos Pequeños', range: '2–10 Especialistas', perSpecialistMonthlyUsd: 20, patientLimit: '1.500', highlight: false },
    { name: 'Clínica', tier: 'Centros Medianos', range: '11–30 Especialistas', perSpecialistMonthlyUsd: 18, patientLimit: '5.000', highlight: true },
    { name: 'Pro', tier: 'Clínicas Tipo B', range: '31–80 Especialistas', perSpecialistMonthlyUsd: 16, patientLimit: '15.000', highlight: false },
    { name: 'Enterprise', tier: 'Grandes Inst.', range: '81–200 Especialistas', perSpecialistMonthlyUsd: 14, patientLimit: '40.000', highlight: false },
  ] as const,
  getPerSpecialist(cycle: BillingCycle, baseMonthly: number): number {
    return priceForCycle(baseMonthly, cycle);
  },
} as const;

/** Planes enfermería (USD) */
export const enfermeroPricing = {
  profesional: {
    name: 'Profesional',
    monthlyUsd: 20,
    annualPerMonthUsd: priceForCycle(20, 'annual'),
    patientCapMonthly: 30,
  },
  clinico: {
    name: 'Clínico',
    adminBaseUsd: 130,
    perSpecialistMonthlyUsd: 20,
    perSpecialistAnnualUsd: priceForCycle(20, 'annual'),
  },
} as const;

/** Planes resumidos para home / tablas compartidas */
export const homePricingCards = [
  {
    id: 'pacientes',
    name: 'Pacientes',
    price: 'Gratis',
    period: 'para siempre',
    desc: 'Portal personal con acceso completo a tu historial, citas y recetas.',
    highlight: false,
    cta: 'Registrarse Gratis',
    href: '/register',
    features: [
      'Historial médico completo',
      'Agenda de citas online',
      'Recetas electrónicas',
      'Resultados de laboratorio',
      'ASHIRA Salud+ y Pulsos',
      'Sin costo, sin límites',
    ],
  },
  {
    id: 'medico',
    name: 'Médico / Consultorio',
    price: `$${consultorioPricing.monthlyUsd}`,
    period: `/mes · ROI ${tractionStats.roiMultiple}x documentado`,
    desc: 'Gestión total del consultorio: agenda, consultas, recetas, IA clínica, facturación y equipo admin.',
    highlight: true,
    cta: 'Comenzar Ahora',
    href: '/register',
    features: [
      'Todo lo de Pacientes',
      'ASHIRA-Voice, Memory y Doc',
      'Módulo de consultas',
      'Página pública que agenda sola',
      'Facturación integrada',
      'Soporte prioritario',
    ],
  },
  {
    id: 'organizaciones',
    name: 'Organizaciones',
    price: 'Personalizado',
    period: 'según volumen',
    desc: 'Para clínicas, farmacias y laboratorios. Plan a medida — ej. SafeCare en configuración.',
    highlight: false,
    cta: 'Hablar con Ventas',
    href: ASHIRA_WHATSAPP,
    features: [
      'Todo lo de Médico',
      'Multi-especialista',
      'Múltiples sedes',
      'Integraciones avanzadas',
      'Analytics empresarial',
      'Account Manager dedicado',
    ],
  },
] as const;

export const differentiators = [
  {
    n: '01',
    title: 'El consultorio como unidad operativa',
    desc: 'Médico, asistente, recepción y enfermería en una sola plataforma — no en cuatro herramientas distintas.',
  },
  {
    n: '02',
    title: 'Página pública que agenda sola',
    desc: 'Canal de marketing pasivo: servicios, precios, ubicación, Cashea — el paciente auto-agenda.',
  },
  {
    n: '03',
    title: 'Patient Panel portátil',
    desc: 'El paciente posee y lleva su historial por toda la red ASHIRA.',
  },
  {
    n: '04',
    title: 'Historia con propósito real',
    desc: 'Nacida de una crisis real: información médica dispersa que nadie podía seguir.',
  },
  {
    n: '05',
    title: 'Directorio de farmacias integrado',
    desc: 'Conecta receta → disponibilidad → precio. FarmaTuya como primera afiliada.',
  },
] as const;

/** Rutas de audiencia — enrutamiento de la home */
export const audienceRoutes = [
  {
    id: 'medico',
    label: 'Soy médico / consultorio',
    shortLabel: 'Médico / Consultorio',
    href: '/landing/consultorios',
    description: 'Agenda, historia clínica, receta electrónica e IA de dictado.',
  },
  {
    id: 'clinica',
    label: 'Soy director de clínica',
    shortLabel: 'Clínica',
    href: '/landing/clinicas',
    description: 'Multi-especialista, multi-sede y panel unificado.',
  },
  {
    id: 'enfermero',
    label: 'Soy enfermero',
    shortLabel: 'Enfermería',
    href: '/landing/enfermeros',
    description: 'Triaje, MAR, reportes y atención digital.',
  },
  {
    id: 'paciente',
    label: 'Soy paciente',
    shortLabel: 'Paciente',
    href: '/landing/pacientes',
    description: 'Historial portátil gratuito en toda la red ASHIRA.',
  },
] as const;

export const ecosystemLinks = [
  { id: 'consultorios', title: 'Consultorios Privados', href: '/landing/consultorios', desc: 'Agenda inteligente, historial médico completo, recetas electrónicas y facturación integrada.' },
  { id: 'clinicas', title: 'Clínicas', href: '/landing/clinicas', desc: 'Gestión multi-especialista, múltiples sedes y reportes unificados en tiempo real.' },
  { id: 'enfermeros', title: 'Enfermería', href: '/landing/enfermeros', desc: 'Turnos, asignación de pacientes, notas de enfermería y comunicación con el equipo médico.' },
  { id: 'farmacias', title: 'Farmacias', href: '/landing/farmacias', desc: 'Recepción y validación de recetas electrónicas. FarmaTuya como primera afiliada. Próximamente.' },
  { id: 'laboratorios', title: 'Laboratorios', href: '/landing/laboratorios', desc: 'Órdenes médicas digitales. Resultados al médico y paciente automáticamente. Próximamente.' },
  { id: 'pacientes', title: 'Portal del Paciente', href: '/landing/pacientes', desc: 'Historial portable gratuito, ASHIRA Salud+ y asistente Ash.' },
  { id: 'analytics', title: 'Analytics y Reportes', href: ASHIRA_WHATSAPP, desc: 'Dashboards, KPIs, reportes exportables y analítica avanzada. Habla con ventas.' },
] as const;

export const companyFaqs = [
  { q: '¿Necesito instalar algo para usar ASHIRA?', a: 'No. ASHIRA es 100% web. Funciona en cualquier navegador moderno desde tu teléfono, tablet o computadora, sin instalar nada.' },
  { q: '¿Cuánto tiempo toma configurar mi consultorio?', a: 'La configuración básica de tu consultorio toma menos de 10 minutos. Puedes empezar a atender pacientes el mismo día.' },
  { q: '¿Cómo se protegen mis datos médicos?', a: 'Todos los datos viajan cifrados con los más altos estándares internacionales. Solo tú y los profesionales que autorices pueden ver tu información.' },
  { q: '¿Funciona con conectividad limitada en Venezuela?', a: 'ASHIRA está optimizada para conexiones variables y trabaja de manera eficiente incluso con ancho de banda reducido.' },
  { q: '¿Cuál es la diferencia entre el plan de médico y el de clínicas?', a: 'El plan de médico está pensado para consultorios individuales. El plan de clínicas incluye múltiples especialistas, sedes y analytics empresarial.' },
  { q: '¿Puedo exportar mis datos si decido cancelar?', a: 'Sí. Tu información siempre es tuya. Puedes exportarla en cualquier momento en formatos estándar sin ningún costo adicional.' },
] as const;

/** Metadata SEO sugerida por ruta */
export const seoByRoute = {
  home: {
    title: 'ASHIRA | Plataforma de gestión médica digital en Venezuela',
    description:
      'Ecosistema digital para consultorios, clínicas, enfermería y pacientes en Venezuela. Historia clínica portátil e IA clínica integrada.',
    keywords:
      'ASHIRA, salud digital Venezuela, software médico, historial médico electrónico, gestión clínica, consultorios digitales',
    canonical: `${ASHIRA_SITE_URL}/`,
  },
  consultorios: {
    title: 'Software para Consultorios Médicos Privados en Venezuela | ASHIRA',
    description:
      'Gestiona tu consultorio: agenda, historia clínica, receta electrónica e IA de dictado. Prueba gratis.',
    keywords:
      'software consultorio médico Venezuela, historia clínica digital, agenda médica, receta electrónica, ASHIRA',
    canonical: `${ASHIRA_SITE_URL}/landing/consultorios`,
  },
  clinicas: {
    title: 'Sistema de Gestión para Clínicas Multiespecialidad | ASHIRA',
    description:
      'Centraliza la operación de tu clínica multi-sede: agenda, facturación e historia clínica en un solo panel.',
    keywords:
      'software clínicas Venezuela, gestión multi-sede, clínicas multiespecialidad, ASHIRA clínicas',
    canonical: `${ASHIRA_SITE_URL}/landing/clinicas`,
  },
  enfermeros: {
    title: 'Software para Enfermería Independiente y Clínica | ASHIRA',
    description: 'Digitaliza triaje, MAR y reportes de enfermería con dictado por IA.',
    keywords: 'software enfermería, MAR digital, triaje, enfermero independiente Venezuela, ASHIRA',
    canonical: `${ASHIRA_SITE_URL}/landing/enfermeros`,
  },
  pacientes: {
    title: 'Portal del Paciente Gratis | ASHIRA',
    description:
      'Tu historial médico portátil y gratuito, disponible en cualquier consultorio de la red ASHIRA.',
    keywords: 'portal paciente, historial médico digital gratis, ASHIRA pacientes Venezuela',
    canonical: `${ASHIRA_SITE_URL}/landing/pacientes`,
  },
  farmacias: {
    title: 'Farmacias en ASHIRA — Próximamente | Recetas digitales',
    description:
      'Pronto: integración de farmacias al ecosistema ASHIRA para recepción y validación de recetas electrónicas. Déjanos tu email y te avisamos.',
    keywords: 'farmacia digital Venezuela, recetas electrónicas, ASHIRA farmacias, FarmaTuya',
    canonical: `${ASHIRA_SITE_URL}/landing/farmacias`,
  },
  laboratorios: {
    title: 'Laboratorios en ASHIRA — Próximamente | Resultados digitales',
    description:
      'Pronto: órdenes y resultados de laboratorio digitales conectados al médico y al paciente en ASHIRA. Suscríbete para enterarte.',
    keywords: 'laboratorio clínico digital, resultados laboratorio, órdenes médicas, ASHIRA laboratorios',
    canonical: `${ASHIRA_SITE_URL}/landing/laboratorios`,
  },
} as const;

export type PricingPlans = {
  consultorio: typeof consultorioPricing;
  clinica: typeof clinicaPricing;
  enfermero: typeof enfermeroPricing;
  homeCards: typeof homePricingCards;
};

export const pricingPlans: PricingPlans = {
  consultorio: consultorioPricing,
  clinica: clinicaPricing,
  enfermero: enfermeroPricing,
  homeCards: homePricingCards,
};
