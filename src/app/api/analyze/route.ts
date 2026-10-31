import { getJobService } from "../../../server/jobs/default";
import { JobInputError } from "../../../server/jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  try {
    const service = getJobService();
    const job = service.submit(body);
    return Response.json(
      { jobId: job.id, status: job.status },
      { status: 202 },
    );
  } catch (err: unknown) {
    if (err instanceof JobInputError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    // Anything else is our fault, not the caller's: don't leak internals, and say so with a 500.
    console.error("POST /api/analyze failed:", err);
    return Response.json({ error: "Internal error while starting the analysis" }, { status: 500 });
  }
}
