import { isStrongPassword, isValidEmail, sanitizeInput } from './security';

export interface AdminSetupInput {
  email?: string;
  password?: string;
  confirmPassword?: string;
  setupToken?: string;
}

export interface ValidationFieldErrors {
  [field: string]: string;
}

export interface AdminSetupValidationResult {
  valid: boolean;
  errors: ValidationFieldErrors;
  normalized?: {
    email: string;
    password: string;
    setupToken?: string;
  };
}

export function validateAdminSetupInput(
  input: AdminSetupInput,
  options?: { requireSetupToken?: boolean }
): AdminSetupValidationResult {
  const errors: ValidationFieldErrors = {};

  const email = sanitizeInput(String(input.email || '')).toLowerCase().trim();
  const password = String(input.password || '');
  const confirmPassword = String(input.confirmPassword ?? input.password ?? '');
  const setupToken = input.setupToken ? String(input.setupToken) : undefined;

  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email format';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(password)) {
    errors.password =
      'Password must be at least 8 characters with uppercase, lowercase, and a number';
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (options?.requireSetupToken && !setupToken?.trim()) {
    errors.setupToken = 'Setup token is required';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    normalized: {
      email,
      password,
      setupToken: setupToken?.trim(),
    },
  };
}