import { getLivenessPayload } from "@/src/lib/health.js";

export function GET() {
  return Response.json(
    getLivenessPayload(),
    { headers: { "Cache-Control": "no-store" } },
  );
}
