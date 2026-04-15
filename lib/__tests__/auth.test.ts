import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken 
} from '../auth';

// Mock the JWT_SECRET for consistent testing
const originalEnv = process.env;
beforeAll(() => {
  process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Auth', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate a JWT token', () => {
      const userId = 'user123';
      const token = generateToken(userId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user1');
      const token2 = generateToken('user2');
      
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for the same user', () => {
      const userId = 'user123';
      const token1 = generateToken(userId);
      
      // Advance time by 1 second to ensure different iat claim
      jest.advanceTimersByTime(1000);
      
      const token2 = generateToken(userId);
      expect(token1).not.toBe(token2); // Due to iat (issued at) claim
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'user123';
      const token = generateToken(userId);
      
      const decoded = verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.jwt';
      
      const decoded = verifyToken(malformedToken);
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token that's already expired by setting expiresIn to negative
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user123' }, 
        'test-secret-key', 
        { expiresIn: '-1h' }
      );
      
      const decoded = verifyToken(expiredToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Integration', () => {
    it('should complete full auth flow', async () => {
      const password = 'testpassword123';
      const userId = 'user123';
      
      // Hash password
      const hash = await hashPassword(password);
      
      // Verify password
      const isValidPassword = await verifyPassword(password, hash);
      expect(isValidPassword).toBe(true);
      
      // Generate token
      const token = generateToken(userId);
      
      // Verify token
      const decoded = verifyToken(token);
      expect(decoded?.userId).toBe(userId);
    });
  });
});
