import { decrypt, encrypt, hashPhoneNumber, maskPhoneNumber } from '@/lib/security';

export type SharedContactRecord = {
  name: string;
  phone?: string;
  phoneEncrypted?: string;
  phoneHash?: string;
  relation?: string;
  enabledForReports?: boolean;
};

export type UserPhoneFields = {
  whatsappNumber?: string;
  whatsappNumberEncrypted?: string;
  whatsappNumberHash?: string;
};

/** Resolve plaintext phone for internal server use only — never return from APIs. */
export function resolveUserPhone(user: UserPhoneFields | null | undefined): string | null {
  if (!user) return null;
  if (user.whatsappNumberEncrypted) {
    try {
      const plain = decrypt(user.whatsappNumberEncrypted);
      return plain ? plain.replace(/\D/g, '') : null;
    } catch {
      return null;
    }
  }
  const legacy = String(user.whatsappNumber || '').replace(/\D/g, '');
  if (!legacy || legacy.includes('*')) return null;
  return legacy;
}

/** Persist phone encrypted; store only masked value in whatsappNumber field. */
export function buildUserPhoneStorage(phone: string) {
  const normalized = phone.replace(/\D/g, '');
  return {
    whatsappNumber: maskPhoneNumber(normalized),
    whatsappNumberEncrypted: encrypt(normalized),
    whatsappNumberHash: hashPhoneNumber(normalized),
  };
}

export function resolveSharedContactPhone(contact: SharedContactRecord): string | null {
  if (contact.phoneEncrypted) {
    try {
      const plain = decrypt(contact.phoneEncrypted);
      return plain ? plain.replace(/\D/g, '') : null;
    } catch {
      return null;
    }
  }
  const legacy = String(contact.phone || '').replace(/\D/g, '');
  if (!legacy || legacy.includes('*')) return null;
  return legacy;
}

export function buildSharedContactStorage(
  input: { name: string; phone?: string; relation?: string; enabledForReports?: boolean },
  existing?: SharedContactRecord
): SharedContactRecord {
  const raw = String(input.phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  const looksMasked = raw.includes('*') || (digits.length > 0 && digits.length < 6);

  if ((!digits || looksMasked) && existing?.phoneEncrypted) {
    return {
      name: String(input.name).trim().slice(0, 50),
      phoneEncrypted: existing.phoneEncrypted,
      phoneHash: existing.phoneHash || '',
      relation: input.relation ? String(input.relation).trim().slice(0, 30) : '',
      enabledForReports: input.enabledForReports !== false,
    };
  }

  if (!digits) {
    return {
      name: String(input.name).trim().slice(0, 50),
      phoneEncrypted: '',
      phoneHash: '',
      relation: input.relation ? String(input.relation).trim().slice(0, 30) : '',
      enabledForReports: input.enabledForReports !== false,
    };
  }

  return {
    name: String(input.name).trim().slice(0, 50),
    phoneEncrypted: encrypt(digits),
    phoneHash: hashPhoneNumber(digits),
    relation: input.relation ? String(input.relation).trim().slice(0, 30) : '',
    enabledForReports: input.enabledForReports !== false,
  };
}

/** Safe shape for API responses — no plaintext PII. */
export function maskSharedContactsForApi(contacts: SharedContactRecord[] = []) {
  return contacts.map((c) => {
    const phone = resolveSharedContactPhone(c);
    return {
      name: c.name,
      phone: phone ? maskPhoneNumber(phone) : null,
      hasPhone: !!phone,
      relation: c.relation || '',
      enabledForReports: c.enabledForReports !== false,
    };
  });
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? '**' : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export function maskUsername(username: string | null | undefined): string {
  if (!username) return '***';
  if (username.length <= 3) return '***';
  return `${username[0]}***${username[username.length - 1]}`;
}

export function sanitizeUserForAdminApi(user: {
  _id?: unknown;
  email?: string;
  username?: string;
  whatsappNumber?: string;
  whatsappNumberEncrypted?: string;
  [key: string]: unknown;
}) {
  const phone = resolveUserPhone(user as UserPhoneFields);
  return {
    ...user,
    email: maskEmail(user.email),
    username: maskUsername(user.username),
    whatsappNumber: phone ? maskPhoneNumber(phone) : null,
    whatsappNumberEncrypted: undefined,
    whatsappNumberHash: undefined,
    passwordHash: undefined,
  };
}

export function collectReportRecipientsFromUser(user: {
  whatsappVerified?: boolean;
  whatsappAutomation?: boolean;
  sharedContacts?: SharedContactRecord[];
} & UserPhoneFields): Array<{ name: string; phone: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; phone: string }> = [];

  const add = (name: string, phone: string) => {
    const normalized = phone.replace(/\D/g, '');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push({ name, phone: normalized });
  };

  if (user.whatsappVerified) {
    const own = resolveUserPhone(user);
    if (own) add('Owner', own);
  }

  for (const sc of user.sharedContacts || []) {
    if (!sc?.enabledForReports) continue;
    const phone = resolveSharedContactPhone(sc);
    if (phone) add(sc.name || 'Contact', phone);
  }

  return out;
}