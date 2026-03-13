import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { rateLimit } from "@/lib/security/rate-limiter";
import { buildCspHeader } from "@/lib/security/csp";
import { RATE_LIMITS } from "@/lib/utils/constants";

/**
 * Routes that do not require authentication.
 */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/callback",
  "/api/health",
  "/api/auth/callback",
  "/api/monetization/webhook",
]);

/**
 * Auth-specific routes — if the user is already authenticated,
 * redirect them to the dashboard instead.
 */
const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Checks whether a pathname matches any of the public routes.
 * Handles both exact matches and prefix matches for nested routes.
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }
  // Allow sub-paths of some public routes (e.g., /api/auth/callback/*)
  for (const route of PUBLIC_ROUTES) {
    if (route.startsWith("/api/") && pathname.startsWith(route)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a pathname is an auth page (login, signup, etc).
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

/**
 * Gets the client IP address from the request.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Adds security headers to the response.
 */
function addSecurityHeaders(response: NextResponse): void {
  const csp = buildCspHeader();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -----------------------------------------------------------------------
  // 1. Rate limit API routes
  // -----------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    const clientIp = getClientIp(request);
    const rateLimitKey = `api:${clientIp}`;

    const result = rateLimit(
      rateLimitKey,
      RATE_LIMITS.API.limit,
      RATE_LIMITS.API.windowMs
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((result.reset - Date.now()) / 1000)
            ),
            "X-RateLimit-Limit": String(RATE_LIMITS.API.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    }
  }

  // -----------------------------------------------------------------------
  // 2. Create Supabase middleware client and refresh auth session
  // -----------------------------------------------------------------------
  // Skip auth check if Supabase env vars are not configured (build time)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const { supabase, response } = createMiddlewareClient(request);

  // Refreshing the session will update cookies if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // -----------------------------------------------------------------------
  // 3. Route protection logic
  // -----------------------------------------------------------------------

  // If the route requires auth and there's no user, redirect to login
  if (!isPublicRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If the user is on an auth page but is already logged in, redirect to dashboard
  if (isAuthRoute(pathname) && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // -----------------------------------------------------------------------
  // 4. Add security headers to the response
  // -----------------------------------------------------------------------
  addSecurityHeaders(response);

  return response;
}

/**
 * Middleware matcher configuration.
 * Excludes Next.js internals, static files, and public assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - Public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
