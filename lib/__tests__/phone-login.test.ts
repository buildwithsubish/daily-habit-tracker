import { describe, expect, it } from 'vitest';
import { normalizeLocalPhoneNumber, resolveCountryName } from '../phone-login';

describe('phone-login helpers', () => {
  it('strips India country code from full number', () => {
    expect(normalizeLocalPhoneNumber('919876543210', '91')).toBe('9876543210');
    expect(normalizeLocalPhoneNumber('+91 98765 43210', '91')).toBe('9876543210');
  });

  it('keeps local number when no country prefix present', () => {
    expect(normalizeLocalPhoneNumber('9876543210', '91')).toBe('9876543210');
  });

  it('strips leading + before country code removal', () => {
    expect(normalizeLocalPhoneNumber('+919876543210', '91')).toBe('9876543210');
  });

  it('maps dial codes and ISO codes to WhatsApp country labels', () => {
    expect(resolveCountryName(undefined, '91')).toBe('India');
    expect(resolveCountryName('IN')).toBe('India');
    expect(resolveCountryName('United States')).toBe('United States');
    expect(resolveCountryName('44')).toBe('United Kingdom');
  });
});