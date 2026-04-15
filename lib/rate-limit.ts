import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitResult {
  check: (request: NextRequest, limit?: number) => Promise<{
    success: boolean;
    remaining: number;
    resetTime: number;
  }>;
}

// In-memory rate limiting store (use Redis for production)
const store: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);

export function rateLimit(config: RateLimitConfig): RateLimitResult {
  return {
    check: async (request: NextRequest, limit: number = 10): Promise<{ success: boolean; remaining: number; resetTime: number }> => {
      // Get client IP
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
      
      const key = `rate_limit:${ip}`;
      const now = Date.now();
      
      // Initialize or reset if interval has passed
      if (!store[key] || store[key].resetTime < now) {
        store[key] = {
          count: 0,
          resetTime: now + config.interval,
        };
      }
      
      // Increment count
      store[key].count++;
      
      const remaining = Math.max(0, limit - store[key].count);
      const resetTime = store[key].resetTime;
      
      // Check if limit exceeded
      if (store[key].count > limit) {
        return {
          success: false,
          remaining: 0,
          resetTime,
        };
      }
      
      return {
        success: true,
        remaining,
        resetTime,
      };
    },
  };
}

// Simple in-memory rate limiter
export default async function rateLimiter(
  request: NextRequest,
  maxRequests: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = `rl:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  
  if (!store[key]) {
    store[key] = { count: 0, resetTime: Date.now() + windowSeconds * 1000 };
  }
  
  store[key].count++;
  
  const remaining = Math.max(0, maxRequests - store[key].count);
  const resetTime = store[key].resetTime;
  
  return {
    allowed: store[key].count <= maxRequests,
    remaining,
    resetTime,
  };
}
