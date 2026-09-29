import crypto from 'crypto';
import {
  encrypt,
  decrypt,
  hashPhoneNumber,
  maskPhoneNumber,
  validatePhoneNumber,
  formatPhoneNumber,
  sanitizeInput,
  isValidEmail,
  isValidUsername,
  isStrongPassword,
  validateCSRFToken,
  getSecurityHeaders,
  rateLimiterConfig
} from '../security';

// Mock crypto.randomBytes for consistent testing
const mockRandomBytes = jest.spyOn(crypto, 'randomBytes');
const originalEnv = process.env;

beforeAll(() => {
  process.env = { ...originalEnv, NODE_ENV: 'test', ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!!' };
  // Don't mock randomBytes for encryption tests as it needs proper IV
});

afterAll(() => {
  process.env = originalEnv;
  mockRandomBytes.mockRestore();
});

describe('Security Module', () => {
  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).toBe('');
      expect(decrypted).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
      expect(decrypt('invalid-format')).toBe('invalid-format');
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'Hello, World!';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('Phone Number Hashing', () => {
    it('should hash phone number consistently', () => {
      const phone = '919876543210';
      const hash1 = hashPhoneNumber(phone);
      const hash2 = hashPhoneNumber(phone);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hashes for different numbers', () => {
      const phone1 = '919876543210';
      const phone2 = '919876543211';
      const hash1 = hashPhoneNumber(phone1);
      const hash2 = hashPhoneNumber(phone2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Phone Number Masking', () => {
    it('should mask phone number correctly', () => {
      const phone = '919876543210';
      const masked = maskPhoneNumber(phone);
      
      // The function shows first 3 and last 3 digits
      expect(masked).toBe('919****210');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      const masked = maskPhoneNumber(phone);
      
      expect(masked).toBe('123');
    });

    it('should handle empty phone number', () => {
      const phone = '';
      const masked = maskPhoneNumber(phone);
      
      expect(masked).toBe('');
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('919876543210')).toBe(true);
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('123456789012345')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123456789')).toBe(false); // Too short
      expect(validatePhoneNumber('1234567890123456')).toBe(false); // Too long
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should handle phone numbers with special characters', () => {
      expect(validatePhoneNumber('+91-987-654-3210')).toBe(true);
      expect(validatePhoneNumber('(91) 987-654-3210')).toBe(true);
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Indian mobile numbers', () => {
      expect(formatPhoneNumber('9876543210')).toBe('919876543210');
      expect(formatPhoneNumber('09876543210')).toBe('919876543210');
      expect(formatPhoneNumber('+919876543210')).toBe('919876543210');
    });

    it('should handle already formatted numbers', () => {
      expect(formatPhoneNumber('919876543210')).toBe('919876543210');
    });

    it('should handle US numbers', () => {
      expect(formatPhoneNumber('19876543210')).toBe('919876543210');
    });

    it('should handle numbers with special characters', () => {
      expect(formatPhoneNumber('+91-987-654-3210')).toBe('919876543210');
      expect(formatPhoneNumber('(91) 987-654-3210')).toBe('919876543210');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('<div>Hello</div>')).toBe('divHello/div');
    });

    it('should sanitize javascript protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should sanitize event handlers', () => {
      expect(sanitizeInput('onclick=alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('onload=alert("xss")')).toBe('alert("xss")');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Username Validation', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('User_Name_123')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('us')).toBe(false); // Too short
      expect(isValidUsername('verylongusernamethatexceedslimit')).toBe(false); // Too long
      expect(isValidUsername('user-name')).toBe(false); // Contains hyphen
      expect(isValidUsername('user@name')).toBe(false); // Contains special char
      expect(isValidUsername('user name')).toBe(false); // Contains space
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      expect(isStrongPassword('Password123')).toBe(true);
      expect(isStrongPassword('MyStrongPass1')).toBe(true);
      expect(isStrongPassword('ComplexP@ssw0rd')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isStrongPassword('password')).toBe(false); // No uppercase, no digit
      expect(isStrongPassword('PASSWORD')).toBe(false); // No lowercase, no digit
      expect(isStrongPassword('Password')).toBe(false); // No digit
      expect(isStrongPassword('Pass123')).toBe(false); // Too short
      expect(isStrongPassword('12345678')).toBe(false); // No letters
    });
  });

  describe('CSRF Token Validation', () => {
    it('should validate matching tokens', () => {
      const token = 'csrf-token-123';
      const sessionToken = 'csrf-token-123';
      
      expect(validateCSRFToken(token, sessionToken)).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token = 'csrf-token-123';
      const sessionToken = 'different-token';
      
      expect(validateCSRFToken(token, sessionToken)).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should return security headers', () => {
      const headers = getSecurityHeaders();
      
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('Content-Security-Policy');
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should have correct rate limiter config', () => {
      expect(rateLimiterConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(rateLimiterConfig.max).toBe(100);
      expect(rateLimiterConfig.message).toBe('Too many requests from this IP, please try again later.');
    });
  });
});
