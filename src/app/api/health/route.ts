import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/utils/constants";

/**
 * GET /api/health
 *
 * Health check endpoint for uptime monitoring and deployment verification.
 * Returns a simple JSON payload with status, timestamp, and version.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    },
    { status: 200 }
  );
}
