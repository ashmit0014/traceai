import { z } from "zod";
import { db } from "@/lib/db";
import { investigate } from "@/lib/agents/investigator";
import { mode } from "@/lib/ai/provider";
import { investigationContextSchema, type Activity } from "@/lib/schema";
import type { EvidenceBundle } from "@/data/scenarios";
import { apiError, lock, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    sameOrigin(request);
    const { incidentId } = z
      .object({ incidentId: z.string().max(100) })
      .parse(await request.json());
    const incident = await db.incident.findUnique({
      where: { id: incidentId },
      include: { scenario: true },
    });
    if (!incident) return apiError(new Error("Incident not found"), 404);
    const context = investigationContextSchema.parse({
      description: incident.description,
      severity: incident.severity,
    });
    release = lock("agent");
    const unlock = release;
    const currentMode = mode();
    const run = await db.investigation.create({
      data: { incidentId, mode: currentMode },
    });
    const encoder = new TextEncoder();
    let disconnected = false;
    const stream = new ReadableStream({
      async start(controller) {
        const activities: Activity[] = [];
        const send = (data: unknown) => {
          if (!disconnected)
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            } catch {
              disconnected = true;
            }
        };
        send({ type: "start", id: run.id, mode: currentMode });
        const started = Date.now();
        try {
          const result = await investigate(
            context,
            JSON.parse(incident.scenario.evidence) as EvidenceBundle,
            (a) => {
              activities.push(a);
              send({ type: "activity", activity: a });
            },
            {
              signal: AbortSignal.any([
                request.signal,
                AbortSignal.timeout(210000),
              ]),
              demoDelay: 450,
            },
          );
          await db.$transaction([
            db.investigation.update({
              where: { id: run.id },
              data: {
                status: "completed",
                result: JSON.stringify(result.report),
                activity: JSON.stringify(activities),
                durationMs: result.durationMs,
                tokens: result.tokens,
              },
            }),
            db.incident.update({
              where: { id: incidentId },
              data: { status: "investigated" },
            }),
          ]);
          send({ type: "result", ...result });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Investigation failed";
          await db.investigation.update({
            where: { id: run.id },
            data: {
              status: "failed",
              error: message,
              activity: JSON.stringify(activities),
              durationMs: Date.now() - started,
            },
          });
          send({ type: "error", error: message });
        } finally {
          unlock();
          if (!disconnected) controller.close();
        }
      },
      cancel() {
        disconnected = true;
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    release?.();
    return apiError(e);
  }
}
