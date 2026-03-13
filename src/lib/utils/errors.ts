import { NextResponse } from "next/server";

/**
 * Base application error class.
 * All custom errors extend from this.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "APP_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation error for invalid input data.
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication/authorization error.
 */
export class AuthError extends AppError {
  constructor(
    message: string = "Authentication required",
    details?: Record<string, unknown>
  ) {
    super(message, "AUTH_ERROR", 401, details);
    this.name = "AuthError";
  }
}

/**
 * Resource not found error.
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = "Resource not found",
    details?: Record<string, unknown>
  ) {
    super(message, "NOT_FOUND", 404, details);
    this.name = "NotFoundError";
  }
}

/**
 * Rate limit exceeded error.
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests. Please try again later.",
    details?: Record<string, unknown>
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, details);
    this.name = "RateLimitError";
  }
}

/**
 * SSRF (Server-Side Request Forgery) prevention error.
 */
export class SSRFError extends AppError {
  constructor(
    message: string = "The provided URL is not allowed",
    details?: Record<string, unknown>
  ) {
    super(message, "SSRF_BLOCKED", 400, details);
    this.name = "SSRFError";
  }
}

/**
 * Converts an error into a standardized NextResponse JSON response.
 * Handles both AppError instances and unknown errors gracefully.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle unexpected errors — don't leak internal details in production
  const isDev = process.env.NODE_ENV === "development";
  const message =
    isDev && error instanceof Error
      ? error.message
      : "An unexpected error occurred";

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    },
    { status: 500 }
  );
}
