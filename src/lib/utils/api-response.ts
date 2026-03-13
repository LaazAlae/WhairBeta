import { NextResponse } from "next/server";
import { AppError } from "./errors";

/**
 * Returns a standardized success JSON response.
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Returns a standardized error JSON response.
 * Handles AppError instances and unknown errors.
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

/**
 * Returns a standardized paginated JSON response with metadata.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    },
    { status: 200 }
  );
}
