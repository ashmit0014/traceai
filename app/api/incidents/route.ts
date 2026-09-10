import { db } from "@/lib/db";
import { incidentInput } from "@/lib/schema";
import { apiError, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = incidentInput.parse(await request.json());
    const scenario = await db.scenario.findUnique({
      where: { id: input.scenarioId },
    });
    if (!scenario) throw new Error("Unknown evidence scenario");
    const incident = await db.incident.create({
      data: {
        ...input,
        service: scenario.service,
        severity: scenario.severity,
      },
    });
    return Response.json(incident, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
