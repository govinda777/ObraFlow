import { neon } from "@neondatabase/serverless";
import { assertAuthorizationDatabaseReady } from "@/src/lib/database-health.js";
import { authorizeHealthCheck, evaluateReadiness } from "@/src/lib/health.js";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorizeHealthCheck(request.headers.get("authorization"), process.env.HEALTHCHECK_TOKEN)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const result = await evaluateReadiness(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Database is not configured");
    }

    const sql = neon(databaseUrl);
    await assertAuthorizationDatabaseReady((statement) => sql.query(statement));
  });

  return Response.json(result.body, {
    status: result.statusCode,
    headers: { "Cache-Control": "no-store" },
  });
}
