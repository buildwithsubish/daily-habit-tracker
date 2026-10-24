import bcrypt from 'bcryptjs';

// Pre-computed bcrypt cost 12 dummy hash for constant-time comparison when user does not exist
// Prevents timing attacks on login endpoints
const DUMMY_BCRYPT_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Common breached or easily guessable passwords (checked in lowercase/trimmed)
const COMMON_BREACHED_PASSWORDS = new Set([
  'password123456',
  'password12345678',
  'password123456!',
  'admin123456789',
  'admin@12345678',
  'administrator123',
  'qwertyuiop12345',
  'qwerty123456789',
  'welcome12345678',
  'welcome@1234567',
  'letmein12345678',
  'changeme1234567',
  'iloveyou1234567',
  'superadmin12345',
  'master123456789',
  'secret123456789',
  'correcthorsebatterystaple',
  '123456789012345',
  'monkey123456789',
  'dragon123456789',
  'sunshine1234567',
  'football1234567',
  'princess1234567',
  'trustno11234567',
]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number; // 0 to 4
}

/**
 * Enforces strict Admin Password Policy:
 * - Minimum 14 characters
 * - Requires uppercase, lowercase, numbers, and special symbols (or passphrase >= 20 characters)
 * - Checks against common breached password blocklist
 */
export function validateAdminPasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'], score: 0 };
  }

  // Minimum length check
  if (password.length < 14) {
    errors.push('Password must be at least 14 characters long');
  }

  // Common breached password check
  const normalized = password.toLowerCase().trim();
  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    errors.push('This password is known to be breached and easily guessed. Choose a more unique password.');
  }

  // Allow long passphrases (20+ chars) with at least 2 character types, otherwise require all 4
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let typesCount = 0;
  if (hasLower) typesCount++;
  if (hasUpper) typesCount++;
  if (hasDigit) typesCount++;
  if (hasSpecial) typesCount++;

  if (password.length >= 20) {
    if (typesCount < 2) {
      errors.push('Passphrases must include at least two different character types (letters, numbers, or symbols)');
    }
  } else {
    if (!hasLower) errors.push('Password must contain at least one lowercase letter (a-z)');
    if (!hasUpper) errors.push('Password must contain at least one uppercase letter (A-Z)');
    if (!hasDigit) errors.push('Password must contain at least one number (0-9)');
    if (!hasSpecial) errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  }

  // Compute strength score (0-4)
  let score = 0;
  if (password.length >= 14) score++;
  if (typesCount >= 3) score++;
  if (typesCount === 4) score++;
  if (password.length >= 18) score++;

  return {
    valid: errors.length === 0,
    errors,
    score,
  };
}

/**
 * Constant-time password verification to prevent email enumeration timing attacks.
 * If actualHash is provided, it verifies against it.
 * If actualHash is null or undefined (e.g., account does not exist), it verifies against
 * a dummy bcrypt hash with identical cost factor (12) so response latency remains uniform.
 */
export async function verifyPasswordConstantTime(
  password: string,
  actualHash?: string | null
): Promise<boolean> {
  const hashToCompare = actualHash && actualHash.startsWith('$2') ? actualHash : DUMMY_BCRYPT_HASH;
  const match = await bcrypt.compare(password, hashToCompare);
  return Boolean(actualHash && match);
}
