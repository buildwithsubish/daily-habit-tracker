import {
  AUDIT_CATEGORIES,
  AUDIT_ACTIONS,
  isValidAuditCategory,
} from '../audit-log-constants';
import { isStrongPassword, isValidEmail } from '../security';
import { validateAdminSetupInput } from '../admin-setup-validation';

describe('Audit log constants', () => {
  it('includes admin_auth category', () => {
    expect(AUDIT_CATEGORIES).toContain('admin_auth');
    expect(isValidAuditCategory('admin_auth')).toBe(true);
  });

  it('rejects invalid categories', () => {
    expect(isValidAuditCategory('admin_auth')).toBe(true);
    expect(isValidAuditCategory('habit_completion')).toBe(false);
    expect(isValidAuditCategory('')).toBe(false);
  });

  it('defines admin bootstrap actions', () => {
    expect(AUDIT_ACTIONS.ADMIN_BOOTSTRAP).toBe('admin_bootstrap');
    expect(AUDIT_ACTIONS.LOGIN_SUCCESS).toBe('login_success');
  });
});

describe('Admin setup validation', () => {
  it('accepts valid input', () => {
    const result = validateAdminSetupInput({
      email: 'admin@example.com',
      password: 'SecurePass1',
      confirmPassword: 'SecurePass1',
    });
    expect(result.valid).toBe(true);
    expect(result.normalized?.email).toBe('admin@example.com');
  });

  it('rejects weak password', () => {
    const result = validateAdminSetupInput({
      email: 'admin@example.com',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('rejects mismatched passwords', () => {
    const result = validateAdminSetupInput({
      email: 'admin@example.com',
      password: 'SecurePass1',
      confirmPassword: 'SecurePass2',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('requires setup token when configured', () => {
    const result = validateAdminSetupInput(
      {
        email: 'admin@example.com',
        password: 'SecurePass1',
        confirmPassword: 'SecurePass1',
      },
      { requireSetupToken: true }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.setupToken).toBeDefined();
  });
});

describe('Security validators (setup)', () => {
  it('validates email', () => {
    expect(isValidEmail('admin@test.com')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
  });

  it('validates strong password', () => {
    expect(isStrongPassword('SecurePass1')).toBe(true);
    expect(isStrongPassword('securepass1')).toBe(false);
  });
});