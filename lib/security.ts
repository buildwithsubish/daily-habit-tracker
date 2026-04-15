import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function hashPhoneNumber(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex').substring(0, 16);
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with +, remove it first
  const withoutPlus = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  
  // Now check the number after removing +
  const phoneDigits = withoutPlus.replace(/\D/g, '');
  
  // If already has country code and is 12+ digits, it's properly formatted
  if (phoneDigits.startsWith('91') && phoneDigits.length >= 12) {
    return phoneDigits;
  }
  
  // If it's exactly 10 digits, treat as local Indian mobile number and prepend 91
  // This handles cases like "9191999191" (local number starting with 91)
  if (phoneDigits.length === 10) {
    return '91' + phoneDigits;
  }
  
  // If starts with 0, remove the 0 and prepend 91 (e.g., "09876543210" -> "919876543210")
  if (phoneDigits.startsWith('0')) {
    return '91' + phoneDigits.substring(1);
  }
  
  // If it's 11 digits starting with 1 (like US/Canada), add 9 prefix for India
  if (phoneDigits.startsWith('1') && phoneDigits.length === 11) {
    return '9' + phoneDigits;
  }
  
  // Otherwise return as-is
  return phoneDigits;
}

// Rate limiting configuration (to be implemented with middleware)
export const rateLimiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
};

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate username format
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Validate password strength
export function isStrongPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number (any printable chars allowed)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  return password.length >= 8 && hasLower && hasUpper && hasDigit;
}

// CSRF token validation (simplified)
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// XSS protection headers
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  };
}

