export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  // Next may reconstruct request.url with localhost even when the browser uses
  // 127.0.0.1. The Host header preserves the actual browser destination.
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  if (origin !== `${url.protocol}//${host}`)
    throw new Error("Cross-origin mutations are not allowed");
}
export function apiError(error: unknown, status = 400) {
  return Response.json(
    {
      error: error instanceof Error ? error.message : "Unexpected server error",
    },
    { status },
  );
}
const runtime = globalThis as unknown as { traceActiveRuns?: Set<string> };
const active = (runtime.traceActiveRuns ??= new Set<string>());
export function lock(key: string) {
  if (active.has(key))
    throw new Error("A run is already active. Please wait for it to complete.");
  active.add(key);
  return () => active.delete(key);
}
