import type { Report } from "../schema";
import { fixedCode, type Log } from "../../data/scenarios";
import { severitySchema } from "../schema";
type Diagnosis = {
  match: string;
  cause: string;
  fix: string;
  code: string;
  alternative: string;
};
const rules: Diagnosis[] = [
  {
    match: "db.customer.findUnique repeated",
    cause:
      "N+1 customer lookup inside the cart items loop in OrderService introduced in v1.42.",
    fix: "Fetch the customer once before iterating over cart items. Preserve the missing-customer guard and reuse the customer across line items.",
    code: fixedCode,
    alternative: "External payment provider slowdown",
  },
  {
    match: "pool_idle=0",
    cause:
      "Database connection pool exhaustion because the error path does not release acquired clients.",
    fix: "Release every acquired connection in a finally block and bound acquisition time.",
    code: "const client = await pool.connect();\ntry { return await client.query(sql); }\nfinally { client.release(); }",
    alternative: "Slow payment gateway",
  },
  {
    match: "upstream_duration_ms=30000",
    cause:
      "External payment API timeout from a degraded gateway without a bounded client timeout.",
    fix: "Add a bounded timeout, circuit breaker, and idempotent retry policy.",
    code: "await fetch(url, { signal: AbortSignal.timeout(2000) });",
    alternative: "Database query regression",
  },
  {
    match: "cache_entries=284010",
    cause:
      "Memory leak from an unbounded request cache retaining customer payloads.",
    fix: "Bound cache size and TTL, then monitor heap after rollout.",
    code: "const requestCache = new LRUCache({ max: 1000, ttl: 60000 });",
    alternative: "A transient traffic burst",
  },
  {
    match: "cache_delete_key=product:",
    cause:
      "Cache invalidation uses the wrong key prefix, leaving stale price entries.",
    fix: "Use the same price key builder for reads, writes, and invalidation.",
    code: "const priceKey = (sku: string) => `price:${sku}`;\nawait redis.del(priceKey(sku));",
    alternative: "Failed database price writes",
  },
  {
    match: "profiler_top=bcrypt.hashSync",
    cause:
      "CPU saturation caused by synchronous hashing blocking the event loop.",
    fix: "Use asynchronous hashing with bounded worker concurrency and measure event-loop lag.",
    code: "const receiptToken = await bcrypt.hash(order.id, 10);",
    alternative: "Database lock contention",
  },
  {
    match: "credential_scope=production",
    cause:
      "Bad environment variable routes production credentials to the sandbox payment endpoint.",
    fix: "Restore the production endpoint and validate environment and credential scope at startup.",
    code: "PAYMENT_URL=https://api.paygate.example",
    alternative: "Expired production credentials",
  },
  {
    match: "previous_cpu_limit=2000m",
    cause:
      "Deployment configuration regression reduced the CPU limit from 2 cores to 100 millicores.",
    fix: "Restore the prior CPU limit, canary the deployment, and alert on throttling.",
    code: "resources:\n  limits:\n    cpu: 2000m\n    memory: 512Mi",
    alternative: "Increased incoming request volume",
  },
];
// A shared trace alone does not prove impact: require an explicit failure too.
export function correlatedImpactLogs(logs: Log[], failure: Log): Log[] {
  const trace = failure.message.match(/\btrace_id=([^\s]+)/)?.[1];
  if (!trace) return [];
  return logs.filter((log) => {
    if (
      log.id === failure.id ||
      log.message.match(/\btrace_id=([^\s]+)/)?.[1] !== trace
    )
      return false;
    return /\bstatus=5\d\d\b|\bslo_breached=true\b|\bimpact=unavailable\b/.test(
      log.message,
    );
  });
}
export function demoReport(
  logs: Log[],
  path: string,
  commit: string,
  severity: Report["severity"],
): Report {
  const log = logs.find((l) => rules.some((r) => l.message.includes(r.match)));
  const rule = rules.find((r) => log?.message.includes(r.match));
  if (!rule || !log)
    throw new Error(
      "Demo could not identify a supported evidence signature. Choose a seeded evidence scenario.",
    );
  const isCheckout = rule.match.startsWith("db.customer");
  const impactLogs = correlatedImpactLogs(logs, log);
  return {
    summary:
      "The regression aligns with v1.42. Runtime evidence and the deployed code change point to the same failure mechanism.",
    rootCause: rule.cause,
    confidence: 0.87,
    severity: severitySchema.parse(severity),
    affectedServices: [
      ...new Set([log.service, ...impactLogs.map((event) => event.service)]),
    ],
    evidence: [
      {
        type: "log",
        title: isCheckout
          ? "Database calls increased 18×"
          : "Runtime failure signature",
        description: log.message,
        source: log.id,
      },
      ...impactLogs
        .filter(
          (event, index, events) =>
            events.findIndex((other) => other.service === event.service) ===
            index,
        )
        .map((event) => ({
          type: "log" as const,
          title: `Correlated impact in ${event.service}`,
          description: event.message,
          source: event.id,
        })),
      ...(isCheckout
        ? [
            {
              type: "metric" as const,
              title: "Latency spikes at deployment",
              description:
                "Checkout p95 rises from about 320 ms to 3,885 ms at 10:00 UTC, matching the v1.42 release.",
              source: "n-plus-one:metric:p95_latency:15",
            },
          ]
        : []),
      {
        type: "source",
        title: "Fault isolated in deployed source",
        description: `The implementation in ${path} corroborates the runtime failure.`,
        source: path,
      },
      {
        type: "commit",
        title: `Commit ${commit} introduced the regression`,
        description: "The deployment diff changes the affected execution path.",
        source: commit,
      },
    ],
    hypotheses: [
      {
        title: rule.cause,
        status: "confirmed",
        reason:
          "The observed runtime signature is consistent with the source change in the deployed commit.",
      },
      {
        title: rule.alternative,
        status: isCheckout ? "rejected" : "uncertain",
        reason: isCheckout
          ? "Payment latency remains 94–96 ms and authorization succeeds while database time accounts for 3,420 ms of the checkout request."
          : "Evidence favors the deployed regression, but this alternative requires additional production telemetry to fully exclude.",
      },
      ...(isCheckout
        ? [
            {
              title: "CPU saturation",
              status: "rejected" as const,
              reason:
                "CPU remains at 32–35% across the deployment while request rate stays near 240 requests/s.",
            },
          ]
        : []),
    ],
    suggestedFix: { description: rule.fix, codeExample: rule.code },
    nextActions: [
      "Roll back v1.42 or canary the proposed patch after review.",
      "Add a regression test covering the failing execution path.",
      "Compare p95 latency, error rate, and resource metrics against the v1.41 baseline.",
    ],
  };
}
