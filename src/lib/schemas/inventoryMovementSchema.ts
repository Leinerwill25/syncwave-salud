import * as z from 'zod';

export const inventoryMovementSchema = z.object({
  itemId: z.string().uuid('ID de ítem inválido'),
  itemType: z.enum(['MATERIAL', 'MEDICAMENTO']),
  type: z.enum(['IN', 'OUT']),
  reason: z.enum(['COMPRA', 'ENTREGA', 'AJUSTE', 'DEVOLUCION']),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0),
  totalAmount: z.number().min(0),
  supplierName: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type InventoryMovementFormValues = z.infer<typeof inventoryMovementSchema>;
