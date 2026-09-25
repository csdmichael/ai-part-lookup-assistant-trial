import { z } from 'zod';

/** Part numbers follow the `AAA-00000` pattern used by the sample system of record. */
export const partNumberSchema = z
  .string()
  .trim()
  .min(1, 'Part number is required')
  .max(32, 'Part number must be 32 characters or fewer')
  .regex(/^[A-Za-z]{3}-\d{4,6}$/, 'Part number must look like ABC-12345');

export const searchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters to search')
    .max(64, 'Search terms must be 64 characters or fewer'),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const partUpdateSchema = z
  .object({
    inventoryLevel: z
      .number({ invalid_type_error: 'Inventory level must be a number' })
      .int('Inventory level must be a whole number')
      .min(0, 'Inventory level cannot be negative')
      .max(1_000_000, 'Inventory level cannot exceed 1,000,000')
      .optional(),
    reorderPoint: z
      .number({ invalid_type_error: 'Reorder point must be a number' })
      .int('Reorder point must be a whole number')
      .min(0, 'Reorder point cannot be negative')
      .max(1_000_000, 'Reorder point cannot exceed 1,000,000')
      .optional(),
    warehouseLocation: z
      .string()
      .trim()
      .min(3, 'Warehouse location is required')
      .max(32, 'Warehouse location must be 32 characters or fewer')
      .regex(/^[A-Za-z0-9-]+$/, 'Warehouse location may only contain letters, numbers and hyphens')
      .optional(),
    lifecycleStatus: z
      .enum(['active', 'obsolete', 'pending-approval', 'restricted'], {
        errorMap: () => ({ message: 'Lifecycle status is not a recognised value' })
      })
      .optional()
  })
  // Unknown keys (including sensitive fields such as unitCostUsd) are rejected rather than ignored.
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update'
  });

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PartUpdateBody = z.infer<typeof partUpdateSchema>;

export interface FieldError {
  field: string;
  message: string;
}

export function toFieldErrors(error: z.ZodError): FieldError[] {
  const unrecognised = error.issues.filter((issue) => issue.code === 'unrecognized_keys');
  if (unrecognised.length > 0) {
    // Attempts to write fields that are not editable (for example cost) are reported on their own
    // so the user sees why the request was refused instead of unrelated follow-on messages.
    return unrecognised.map((issue) => ({
      field: (issue as z.ZodIssue & { keys: string[] }).keys.join(', '),
      message: 'This field cannot be updated from the part lookup assistant'
    }));
  }

  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '_',
    message: issue.message
  }));
}
