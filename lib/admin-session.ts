import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import WhatsAppSession from '@/lib/models/WhatsAppSession';

let cachedSessionId: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Resolve WhatsApp admin session ID from MongoDB only.
 * Falls back to ADMIN_ID env var (session identifier, not a phone number).
 * Never uses hardcoded IDs.
 */
export async function resolveAdminSessionId(): Promise<string> {
  const now = Date.now();
  if (cachedSessionId && now < cacheExpiry) return cachedSessionId;

  await connectDB();

  const adminUser = await Admin.findOne({ role: 'admin' }).select('_id').lean();
  const adminUserId = (adminUser as { _id?: { toString(): string } } | null)?._id?.toString();

  if (adminUserId) {
    const linked = await WhatsAppSession.findOne({
      $or: [{ adminIdString: adminUserId }, { adminId: adminUserId }],
      status: 'connected',
    })
      .select('ADMIN_SESSION_ID adminIdString')
      .lean();

    const sid = linked?.ADMIN_SESSION_ID || linked?.adminIdString;
    if (sid) {
      cachedSessionId = sid;
      cacheExpiry = now + CACHE_TTL_MS;
      return sid;
    }
  }

  const connected = await WhatsAppSession.findOne({ status: 'connected' })
    .sort({ lastConnectedAt: -1 })
    .select('ADMIN_SESSION_ID adminIdString adminId')
    .lean();

  if (connected) {
    const sid =
      connected.ADMIN_SESSION_ID ||
      connected.adminIdString ||
      (connected.adminId as { toString(): string } | undefined)?.toString();
    if (sid) {
      cachedSessionId = sid;
      cacheExpiry = now + CACHE_TTL_MS;
      return sid;
    }
  }

  const envId = process.env.ADMIN_ID || process.env.ADMIN_SESSION_ID;
  if (envId) {
    cachedSessionId = envId;
    cacheExpiry = now + CACHE_TTL_MS;
    return envId;
  }

  throw new Error(
    'WhatsApp admin session not configured. Connect WhatsApp in admin dashboard or set ADMIN_ID in environment.'
  );
}

/** Sync getter for hot paths — uses cache or ADMIN_ID env (session id, not credentials). */
export function getAdminSessionIdSync(): string {
  if (cachedSessionId) return cachedSessionId;
  const envId = process.env.ADMIN_ID || process.env.ADMIN_SESSION_ID;
  if (envId) return envId;
  console.warn('[Admin Session] Session ID not cached — resolveAdminSessionId() should run at boot');
  return 'default';
}

export function clearAdminSessionCache(): void {
  cachedSessionId = null;
  cacheExpiry = 0;
}