import { NextResponse } from 'next/server';

/**
 * This endpoint previously issued a normal login token from a username alone.
 * It did not verify a WebAuthn assertion, so it must never authenticate users.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Biometric sign-in is not configured. Use your password to sign in.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
