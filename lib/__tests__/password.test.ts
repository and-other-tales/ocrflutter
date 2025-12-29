import { hashPassword, verifyPassword } from '../password'

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123'
      const hashed = await hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed.length).toBeGreaterThan(0)
      expect(hashed).toMatch(/^\$2[aby]\$/)  // bcrypt hash format
    })

    it('should generate different hashes for same password', async () => {
      const password = 'same-password'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2) // Due to random salt
    })

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(100)
      const hashed = await hashPassword(longPassword)

      expect(hashed).toBeDefined()
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should handle passwords with special characters', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?'
      const hashed = await hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
    })

    it('should handle empty string', async () => {
      const password = ''
      const hashed = await hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed.length).toBeGreaterThan(0)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correct-password'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword(password, hashed)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const correctPassword = 'correct-password'
      const incorrectPassword = 'wrong-password'
      const hashed = await hashPassword(correctPassword)

      const isValid = await verifyPassword(incorrectPassword, hashed)

      expect(isValid).toBe(false)
    })

    it('should be case sensitive', async () => {
      const password = 'Password123'
      const hashed = await hashPassword(password)

      const isValidLower = await verifyPassword('password123', hashed)
      const isValidUpper = await verifyPassword('PASSWORD123', hashed)
      const isValidCorrect = await verifyPassword('Password123', hashed)

      expect(isValidLower).toBe(false)
      expect(isValidUpper).toBe(false)
      expect(isValidCorrect).toBe(true)
    })

    it('should reject password with extra characters', async () => {
      const password = 'password'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword('password ', hashed)

      expect(isValid).toBe(false)
    })

    it('should reject empty password when hash is not empty', async () => {
      const password = 'non-empty-password'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword('', hashed)

      expect(isValid).toBe(false)
    })

    it('should verify empty password if it was hashed', async () => {
      const password = ''
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword('', hashed)

      expect(isValid).toBe(true)
    })

    it('should handle special characters correctly', async () => {
      const password = 'P@ssw0rd!#$'
      const hashed = await hashPassword(password)

      const isValidCorrect = await verifyPassword('P@ssw0rd!#$', hashed)
      const isValidWrong = await verifyPassword('P@ssw0rd!#', hashed)

      expect(isValidCorrect).toBe(true)
      expect(isValidWrong).toBe(false)
    })

    it('should handle unicode characters', async () => {
      const password = 'パスワード123'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword('パスワード123', hashed)

      expect(isValid).toBe(true)
    })
  })

  describe('Integration', () => {
    it('should hash and verify workflow', async () => {
      const originalPassword = 'my-secure-password-456'

      // Hash the password
      const hashedPassword = await hashPassword(originalPassword)

      // Verify correct password
      const isCorrect = await verifyPassword(originalPassword, hashedPassword)
      expect(isCorrect).toBe(true)

      // Verify incorrect password
      const isIncorrect = await verifyPassword('wrong-password', hashedPassword)
      expect(isIncorrect).toBe(false)
    })

    it('should maintain security over multiple hash/verify cycles', async () => {
      const passwords = [
        'password1',
        'password2',
        'password3',
      ]

      const hashes = await Promise.all(
        passwords.map((pwd) => hashPassword(pwd))
      )

      // Each password should only verify against its own hash
      for (let i = 0; i < passwords.length; i++) {
        for (let j = 0; j < hashes.length; j++) {
          const isValid = await verifyPassword(passwords[i], hashes[j])
          expect(isValid).toBe(i === j)
        }
      }
    })
  })
})
