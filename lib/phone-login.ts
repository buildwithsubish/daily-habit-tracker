/** Country dial code → WhatsApp Web country picker label (whatsapp_server.py XPath). */
const DIAL_CODE_TO_COUNTRY: Record<string, string> = {
  '1': 'United States',
  '44': 'United Kingdom',
  '91': 'India',
  '971': 'United Arab Emirates',
};

/** ISO / short codes → full country name for WhatsApp Web UI. */
const ISO_TO_COUNTRY: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  CA: 'Canada',
  AU: 'Australia',
};

/**
 * Resolve country name for WhatsApp Web phone login.
 * Python expects the full label shown in the country picker (e.g. "India"), not "IN" or "91".
 */
export function resolveCountryName(country?: string, countryCode?: string): string {
  if (countryCode) {
    const dial = countryCode.replace(/\D/g, '');
    if (dial && DIAL_CODE_TO_COUNTRY[dial]) return DIAL_CODE_TO_COUNTRY[dial];
  }

  if (!country?.trim()) return 'India';

  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();
  if (ISO_TO_COUNTRY[upper]) return ISO_TO_COUNTRY[upper];

  if (/^\d+$/.test(trimmed) && DIAL_CODE_TO_COUNTRY[trimmed]) {
    return DIAL_CODE_TO_COUNTRY[trimmed];
  }

  return trimmed;
}

/**
 * Strip country code and non-digits so Python receives the local number only
 * (e.g. "9876543210" for India, not "919876543210").
 */
export function normalizeLocalPhoneNumber(
  phoneNumber: string,
  countryCode?: string
): string {
  // Strip leading + — WhatsApp phone input is local digits only; +91 is on the country picker.
  const stripped = phoneNumber.trim().replace(/^\+/, '');
  let digits = stripped.replace(/\D/g, '');
  if (!digits) return '';

  if (countryCode) {
    const dial = countryCode.replace(/\D/g, '');
    if (dial && digits.startsWith(dial) && digits.length > dial.length) {
      digits = digits.slice(dial.length);
    }
  }

  const local = digits.replace(/^0+/, '') || digits;
  return local;
}