import { z } from 'zod'

// ✅ SECURITY: Zod schemas for input validation

// Phone number validation (US and international formats)
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email is too long')

// Date/time validation
export const dateTimeSchema = z.string()
  .datetime({ message: 'Invalid datetime format' })

// UUID validation
export const uuidSchema = z.string()
  .uuid('Invalid ID format')

// Webhook validation schemas
export const n8nWebhookSchema = z.object({
  business_id: uuidSchema,
  customer_name: z.string()
    .min(1, 'Customer name is required')
    .max(255, 'Customer name is too long')
    .regex(/^[a-zA-Z\s\-\.\']+$/, 'Customer name contains invalid characters'),
  customer_phone: phoneSchema,
  customer_email: emailSchema.optional().or(z.literal('')),
  customer_address: z.string()
    .max(500, 'Address is too long')
    .optional()
    .or(z.literal('')),
  scheduled_start: dateTimeSchema,
  scheduled_end: dateTimeSchema,
  description: z.string()
    .max(1000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  urgency: z.enum(['low', 'medium', 'high', 'emergency'])
    .optional()
    .or(z.literal('')),
  calendar_event_id: z.string()
    .max(255)
    .optional()
    .or(z.literal('')),
  technician_id: uuidSchema
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => new Date(data.scheduled_start) < new Date(data.scheduled_end),
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduled_end'],
  }
)

// Job creation validation
export const createJobSchema = z.object({
  customer_id: uuidSchema,
  technician_id: uuidSchema.optional(),
  status: z.enum(['scheduled', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  scheduled_start: dateTimeSchema,
  scheduled_end: dateTimeSchema,
  description: z.string()
    .max(1000, 'Description is too long')
    .optional(),
  urgency: z.string()
    .max(50)
    .optional(),
  calendar_event_id: z.string()
    .max(255)
    .optional(),
  labor_hours: z.number()
    .min(0)
    .max(1000)
    .optional(),
  labor_rate: z.number()
    .min(0)
    .max(10000)
    .optional(),
  parts_cost: z.number()
    .min(0)
    .max(1000000)
    .optional(),
  total_cost: z.number()
    .min(0)
    .max(1000000)
    .optional(),
  estimated_labor_hours: z.number()
    .min(0)
    .max(1000)
    .optional(),
  estimated_materials_cost: z.number()
    .min(0)
    .max(1000000)
    .optional(),
  estimated_other_costs: z.number()
    .min(0)
    .max(1000000)
    .optional(),
}).refine(
  (data) => new Date(data.scheduled_start) < new Date(data.scheduled_end),
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduled_end'],
  }
)

// Invoice creation validation
export const createInvoiceSchema = z.object({
  business_id: uuidSchema,
  job_id: uuidSchema,
  customer_id: uuidSchema,
  line_items: z.array(z.object({
    service_id: uuidSchema.optional(),
    type: z.enum(['service', 'labor', 'parts']),
    description: z.string()
      .min(1, 'Line item description is required')
      .max(500, 'Description is too long'),
    quantity: z.number()
      .min(0.01, 'Quantity must be greater than 0')
      .max(10000),
    unit_price: z.number()
      .min(0, 'Unit price cannot be negative')
      .max(1000000),
  })).min(1, 'At least one line item is required'),
  tax_rate: z.number()
    .min(0)
    .max(100)
    .optional(),
  notes: z.string()
    .max(1000)
    .optional(),
  due_in_days: z.number()
    .int()
    .min(0)
    .max(365)
    .optional(),
})

// Customer creation validation
export const createCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Customer name is required')
    .max(255, 'Customer name is too long')
    .regex(/^[a-zA-Z\s\-\.\']+$/, 'Customer name contains invalid characters'),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  address: z.string()
    .max(500, 'Address is too long')
    .optional()
    .or(z.literal('')),
})

// Service creation validation
export const createServiceSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .max(255, 'Service name is too long'),
  description: z.string()
    .max(1000, 'Description is too long')
    .optional(),
  base_price: z.number()
    .min(0)
    .max(1000000)
    .optional(),
  estimated_cost: z.number()
    .min(0)
    .max(1000000)
    .optional(),
  duration_minutes: z.number()
    .int()
    .min(1)
    .max(10000)
    .optional(),
  is_active: z.boolean()
    .optional(),
})

// Helper function to validate and return errors
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    }
  }
}
