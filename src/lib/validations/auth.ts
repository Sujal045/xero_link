import { z } from 'zod'

const VALID_ROLES = ['student', 'owner', 'delivery'] as const

const NAME_PATTERN = /^[\p{L}\s'\-]+$/u

export const signupRoleSchema = z.enum(VALID_ROLES)

export const signupProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name must be 80 characters or fewer')
    .regex(NAME_PATTERN, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  role: signupRoleSchema,
  phone: z
    .string()
    .trim()
    .refine((value) => value.trim().startsWith('+'), {
      message: 'Enter a valid international phone number (e.g. +91 98765 43210)',
    })
    .transform((value) => `+${value.replace(/\D/g, '')}`)
    .refine((value) => /^\+\d{7,15}$/.test(value), {
      message: 'Enter a valid international phone number (e.g. +91 98765 43210)',
    }),
})

export const signupFormSchema = signupProfileSchema.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or fewer')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

// z.input = pre-transform (what the form sends), z.output = post-transform (validated & normalized)
export type SignupFormValues = z.input<typeof signupFormSchema>
export type SignupFormData = z.output<typeof signupFormSchema>
