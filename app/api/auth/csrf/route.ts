import { NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_TOKEN_COOKIE } from '@/lib/auth-cookies';

export const runtime = 'nodejs';

export async function GET() {
  const token = generateCsrfToken();
  const response = NextResponse.json({ success: true, csrfToken: token });

  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
