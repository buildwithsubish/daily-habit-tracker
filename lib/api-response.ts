import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
}

export interface ApiSuccessBody<T = Record<string, unknown>> {
  success: true;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  options?: { message?: string; status?: number }
): NextResponse {
  const { message, status = 200 } = options || {};
  return NextResponse.json(
    {
      success: true,
      ...(message ? { message } : {}),
      ...data,
    },
    { status }
  );
}

export function apiError(
  message: string,
  errorCode: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiErrorBody = {
    success: false,
    message,
    errorCode,
  };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}