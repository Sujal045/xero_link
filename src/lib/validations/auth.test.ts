import { describe, it, expect } from 'vitest'
import { signupFormSchema, signupProfileSchema, signupRoleSchema } from '@/lib/validations/auth'

const VALID_DATA = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password1!',
  phone: '9876543210',
  role: 'student' as const,
}

describe('signupRoleSchema', () => {
  it.each(['student', 'owner', 'delivery'])('accepts valid role: %s', (role) => {
    expect(signupRoleSchema.safeParse(role).success).toBe(true)
  })

  it('rejects an unknown role', () => {
    expect(signupRoleSchema.safeParse('admin').success).toBe(false)
  })
})

describe('signupProfileSchema — name', () => {
  it('accepts a valid name', () => {
    expect(signupProfileSchema.safeParse({ ...VALID_DATA, name: 'Alice O\'Brien' }).success).toBe(true)
  })

  it('accepts a hyphenated name', () => {
    expect(signupProfileSchema.safeParse({ ...VALID_DATA, name: 'Mary-Jane Watson' }).success).toBe(true)
  })

  it('rejects a name that is too short', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, name: 'A' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it('rejects a name that is too long', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, name: 'A'.repeat(81) })
    expect(result.success).toBe(false)
  })

  it('rejects a name with digits', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, name: 'John123' })
    expect(result.success).toBe(false)
  })

  it('rejects a name with special characters', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, name: '@@@' })
    expect(result.success).toBe(false)
  })
})

describe('signupProfileSchema — phone', () => {
  it('accepts a plain local phone number', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, phone: '98765 43210' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('9876543210')
  })

  it('accepts an international phone number with separators', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, phone: '+1-800-555-0199' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('+18005550199')
  })

  it('rejects a phone number with invalid characters', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, phone: 'abc123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined()
    }
  })

  it('rejects a phone number that is too short after normalization', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, phone: '98765' })
    expect(result.success).toBe(false)
  })

  it('rejects a phone number that is too long after normalization', () => {
    const result = signupProfileSchema.safeParse({ ...VALID_DATA, phone: '+1234567890123456' })
    expect(result.success).toBe(false)
  })
})

describe('signupFormSchema — email', () => {
  it('accepts a valid email', () => {
    expect(signupFormSchema.safeParse(VALID_DATA).success).toBe(true)
  })

  it('normalizes email to lowercase', () => {
    const result = signupFormSchema.safeParse({ ...VALID_DATA, email: 'JOHN@EXAMPLE.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('john@example.com')
  })

  it('rejects an email missing the @ symbol', () => {
    const result = signupFormSchema.safeParse({ ...VALID_DATA, email: 'invalidemail.com' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it('rejects an empty email', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, email: '' }).success).toBe(false)
  })
})

describe('signupFormSchema — password', () => {
  it('accepts a strong password', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, password: 'Str0ng!Pass' }).success).toBe(true)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = signupFormSchema.safeParse({ ...VALID_DATA, password: 'Ab1!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined()
    }
  })

  it('rejects a password with no uppercase letter', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, password: 'password1!' }).success).toBe(false)
  })

  it('rejects a password with no digit', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, password: 'Password!' }).success).toBe(false)
  })

  it('rejects a password with no special character', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, password: 'Password1' }).success).toBe(false)
  })

  it('rejects a password longer than 72 characters', () => {
    expect(signupFormSchema.safeParse({ ...VALID_DATA, password: 'Aa1!' + 'x'.repeat(70) }).success).toBe(false)
  })
})

describe('signupFormSchema — full form', () => {
  it('returns all field errors when given completely invalid data', () => {
    const result = signupFormSchema.safeParse({
      name: '1',
      email: 'bad',
      password: 'weak',
      phone: '123',
      role: 'god',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const { fieldErrors } = result.error.flatten()
      expect(fieldErrors.name).toBeDefined()
      expect(fieldErrors.email).toBeDefined()
      expect(fieldErrors.password).toBeDefined()
      expect(fieldErrors.phone).toBeDefined()
      expect(fieldErrors.role).toBeDefined()
    }
  })

  it('succeeds with trimmed whitespace in name and email', () => {
    const result = signupFormSchema.safeParse({
      ...VALID_DATA,
      name: '  Jane Doe  ',
      email: '  jane@example.com  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
      expect(result.data.email).toBe('jane@example.com')
    }
  })
})
