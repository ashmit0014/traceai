import { db } from "@/lib/db";
import { investigate, references } from "@/lib/agents/investigator";
import { mode } from "@/lib/ai/provider";
import { scoreReport } from "@/lib/evals/runner";
import { apiError, lock, sameOrigin } from "@/lib/http";
import { investigationContextSchema } from "@/lib/schema";
export const runtime = "nodejs";
export const maxDuration = 1800;
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    sameOrigin(request);
    release = lock("agent");
    const unlock = release;
    const scenarios = await db.scenario.findMany({ orderBy: { id: "asc" } });
    const currentMode = mode();
    const encoder = new TextEncoder();
    let disconnected = false;
    const stream = new ReadableStream({
      async start(controller) {
        const results: unknown[] = [];
        const send = (data: unknown) => {
          if (!disconnected)
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            } catch {
              disconnected = true;
            }
        };
        try {
          for (const s of scenarios) {
            if (request.signal.aborted) break;
            const started = Date.now();
            try {
              const bundle = JSON.parse(s.evidence);
              const result = await investigate(
                investigationContextSchema.parse({
                  description: s.description,
                  severity: s.severity,
                }),
                bundle,
                () => {},
                {
                  signal: AbortSignal.any([
                    request.signal,
                    AbortSignal.timeout(210000),
                  ]),
                },
              );
              const row = {
                scenarioId: s.id,
                title: s.title,
                expected: s.expected,
                actual: result.report.rootCause,
                ...scoreReport(
                  result.report,
                  JSON.parse(s.keywords),
                  references(bundle),
                ),
                durationMs: result.durationMs,
                tokens: result.tokens ?? null,
                error: null,
              };
              results.push(row);
              send({ type: "row", row });
            } catch (e) {
              const row = {
                scenarioId: s.id,
                title: s.title,
                expected: s.expected,
                actual: "",
                correct: false,
                evidenceRelevance: 0,
                durationMs: Date.now() - started,
                tokens: null,
                error: e instanceof Error ? e.message : "Failed",
              };
              results.push(row);
              send({ type: "row", row });
            }
          }
          const saved = await db.evaluation.create({
            data: { mode: currentMode, results: JSON.stringify(results) },
          });
          send({ type: "complete", id: saved.id, mode: currentMode });
        } catch {
          send({
            type: "error",
            error: "Unable to persist evaluation results. Retry the benchmark.",
          });
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
      },
    });
  } catch (e) {
    release?.();
    return apiError(e);
  }
}
