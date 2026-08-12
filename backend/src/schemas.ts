import { z } from 'zod'

export const VALID_STATUSES = ['Pending', 'Verified', 'Flagged', 'Rejected'] as const
export const VALID_TRUST = ['High', 'Medium', 'Low'] as const
export const VALID_ROLES = ['public', 'surveyor', 'officer', 'admin'] as const

const optionalText = (max: number) => z.string().trim().max(max).optional()
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Valid email required').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  licence_number: z.string().trim().toUpperCase().max(40).optional(),
  organisation: optionalText(200),
})

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Valid email required').max(200).optional(),
    licence_number: z.string().trim().toUpperCase().max(40).optional(),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .refine((d) => d.email || d.licence_number, {
    message: 'Email or licence number is required',
    path: ['email'],
  })

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(120).optional(),
  email: z.string().trim().toLowerCase().email('Valid email required').max(200).optional(),
  licence_number: nullableText(40),
  organisation: nullableText(200),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required').max(128),
  new_password: z.string().min(8, 'New password must be at least 8 characters').max(128),
})

export const createSubmissionSchema = z.object({
  property_type: z.enum(['Land', 'Developed']).optional(),
  region: optionalText(120),
  district: optionalText(120),
  community: optionalText(120),
  gps_coordinates: optionalText(120),
  land_size: z.number().nonnegative().nullable().optional(),
  unit: optionalText(20),
  land_use: optionalText(120),
  tenure_type: optionalText(120),
  description: optionalText(5000),
  bedrooms: nullableText(20),
  bathrooms: nullableText(20),
  storeys: nullableText(20),
  floor_area: z.number().nonnegative().nullable().optional(),
  building_age: z.number().nonnegative().nullable().optional(),
  condition: nullableText(80),
  transaction_type: optionalText(40),
  price: z.number().nonnegative().optional(),
  transaction_date: nullableText(40),
  source: optionalText(200),
})

export const updateSubmissionSchema = z
  .object({
    status: z.enum(VALID_STATUSES, { message: 'Invalid status' }).optional(),
    trust_score: z.enum(VALID_TRUST, { message: 'Invalid trust score' }).optional(),
  })
  .refine((d) => d.status !== undefined || d.trust_score !== undefined, {
    message: 'No fields to update',
  })

export const updateRoleSchema = z.object({
  role: z.enum(VALID_ROLES, { message: 'Invalid role' }),
})

export const kbUploadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  content: z.string().min(1, 'Content is required'),
})

export const kbUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(200).optional(),
    content: z.string().optional(),
  })
  .refine((d) => d.name !== undefined || d.content !== undefined, { message: 'Nothing to update' })

export const settingsSchema = z.record(z.string().max(200), z.union([z.string(), z.number(), z.boolean()]))

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.union([z.string(), z.array(z.any())]),
      })
    )
    .min(1, 'messages must not be empty'),
  isPublic: z.boolean().optional(),
})
