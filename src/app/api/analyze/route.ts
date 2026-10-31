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
    const message = err instanceof Error ? err.message : "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }
}
