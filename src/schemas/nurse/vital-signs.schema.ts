// src/schemas/nurse/vital-signs.schema.ts
import { z } from 'zod';

export const vitalSignsSchema = z.object({
  bp_systolic: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(50, 'Mínimo 50 mmHg')
    .max(300, 'Máximo 300 mmHg')
    .optional(),

  bp_diastolic: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(20, 'Mínimo 20 mmHg')
    .max(200, 'Máximo 200 mmHg')
    .optional(),

  heart_rate: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(20, 'Mínimo 20 lpm')
    .max(300, 'Máximo 300 lpm')
    .optional(),

  respiratory_rate: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(4, 'Mínimo 4 rpm')
    .max(60, 'Máximo 60 rpm')
    .optional(),

  temperature_celsius: z
    .number({ message: 'Debe ser un número' })
    .min(30, 'Mínimo 30 °C')
    .max(45, 'Máximo 45 °C')
    .optional(),

  spo2_percent: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(50, 'Mínimo 50%')
    .max(100, 'Máximo 100%')
    .optional(),

  glucose_mg_dl: z
    .number({ message: 'Debe ser un número' })
    .min(20, 'Mínimo 20 mg/dL')
    .max(1000, 'Máximo 1000 mg/dL')
    .optional(),

  weight_kg: z
    .number({ message: 'Debe ser un número' })
    .min(0.5, 'Mínimo 0.5 kg')
    .max(500, 'Máximo 500 kg')
    .optional(),

  height_cm: z
    .number({ message: 'Debe ser un número' })
    .min(30, 'Mínimo 30 cm')
    .max(250, 'Máximo 250 cm')
    .optional(),

  pain_scale: z
    .number({ message: 'Debe ser un número' })
    .int()
    .min(0, 'Mínimo 0')
    .max(10, 'Máximo 10')
    .optional(),

  triage_level: z
    .enum(['immediate', 'urgent', 'less_urgent', 'non_urgent', 'deceased'])
    .optional(),

  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
});

export type VitalSignsFormData = z.infer<typeof vitalSignsSchema>;

/** Rangos de alerta por signo vital */
export const VITAL_ALERT_RANGES = {
  bp_systolic: { warning: [90, 160], critical: [null, 80, 180, null] },
  bp_diastolic: { warning: [60, 100], critical: [null, 50, 110, null] },
  heart_rate: { warning: [50, 100], critical: [null, 40, 120, null] },
  respiratory_rate: { warning: [12, 20], critical: [null, 8, 25, null] },
  temperature_celsius: { warning: [36.0, 38.0], critical: [null, 35.5, 38.5, null] },
  spo2_percent: { warning: [94, 100], critical: [null, 92, null, null] },
  glucose_mg_dl: { warning: [70, 180], critical: [null, 60, 250, null] },
} as const;

export type VitalAlertLevel = 'normal' | 'warning' | 'critical';

export function getVitalAlertLevel(
  vital: keyof typeof VITAL_ALERT_RANGES,
  value: number
): VitalAlertLevel {
  const ranges = VITAL_ALERT_RANGES[vital];
  const [normalMin, normalMax] = ranges.warning;
  const [, criticalMin, criticalMax] = ranges.critical;

  if (criticalMin !== null && typeof criticalMin === 'number' && value < criticalMin) return 'critical';
  if (criticalMax !== null && typeof criticalMax === 'number' && value > criticalMax) return 'critical';
  if (value < normalMin || value > normalMax) return 'warning';
  return 'normal';
}
