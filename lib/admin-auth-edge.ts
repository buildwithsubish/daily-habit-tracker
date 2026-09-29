export interface AdminTokenPayload {
  adminId: string;
  email?: string;
  role?: 'admin' | 'super_admin';
  twoFactorVerified?: boolean;
  passwordResetRequired?: boolean;
  type: 'admin';
  iat?: number;
  exp?: number;
}

function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
    throw new Error('A strong ADMIN_JWT_SECRET must be configured');
  }
  return secret;
}

function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyAdminTokenEdge(token: string): Promise<AdminTokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64))) as { alg?: string; typ?: string };
    if (header.alg !== 'HS256') return null;

    // Decode and parse payload
    const payloadStr = new TextDecoder().decode(base64urlDecode(payloadB64));
    const decoded = JSON.parse(payloadStr) as AdminTokenPayload;

    if (decoded.type !== 'admin' || typeof decoded.adminId !== 'string' || !decoded.adminId ||
      typeof decoded.iat !== 'number' || typeof decoded.exp !== 'number' || decoded.exp <= decoded.iat) return null;

    // Check expiration
    if (Date.now() >= decoded.exp * 1000) {
      return null;
    }

    // Verify HMAC-SHA256 signature using standard Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(getAdminJwtSecret());
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64urlDecode(signatureB64) as any;
    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`) as any;

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      dataBytes
    );

    if (!isValid) return null;
    return decoded;
  } catch (error) {
    console.error('[Edge Auth] Token verification failed:', error);
    return null;
  }
}
