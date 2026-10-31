import { getJobService } from "../../../../server/jobs/default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_ID_REGEX = /^[A-Za-z0-9-]{1,64}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!SAFE_ID_REGEX.test(id)) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const service = getJobService();
  const job = service.get(id);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json(job, { status: 200 });
}
