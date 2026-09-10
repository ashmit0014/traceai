import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenarios, type Log } from "../data/scenarios";
import { investigate } from "../lib/agents/investigator";
import { correlatedImpactLogs } from "../lib/ai/demo";
import type { Report } from "../lib/schema";

beforeEach(() => vi.stubEnv("AI_API_KEY", ""));
afterEach(() => vi.unstubAllEnvs());

describe("demo incident metadata regressions", () => {
  it.each(scenarios)(
    "preserves $id severity and only attributes evidenced services",
    async (scenario) => {
      const result = await investigate(
        { description: scenario.description, severity: scenario.severity },
        scenario.evidence,
      );
      expect(result.report.severity).toBe(
        scenario.id === "bad-env" ? "critical" : "high",
      );
      expect(result.report.affectedServices).toEqual(
        scenario.id === "n-plus-one"
          ? ["order-service", "checkout-service"]
          : [scenario.service],
      );
      if (scenario.id === "n-plus-one")
        expect(result.report.evidence).toContainEqual(
          expect.objectContaining({ type: "log", source: "n-plus-one:log:2" }),
        );
    },
  );
  it.each(["low", "medium", "high", "critical"] as const)(
    "honors incident severity %s independently of the fixture",
    async (severity) => {
      const scenario = scenarios.find((s) => s.id === "bad-env")!;
      const result = await investigate(
        { description: scenario.description, severity },
        scenario.evidence,
      );
      expect(result.report.severity).toBe(severity);
    },
  );
  it("rejects missing or invalid severity rather than inventing high severity", async () => {
    for (const severity of [undefined, "urgent"])
      await expect(
        investigate(
          {
            description: "Inspect the incident",
            severity: severity as Report["severity"],
          },
          scenarios[0].evidence,
        ),
      ).rejects.toThrow();
  });
  it("does not infer checkout impact merely from a shared healthy trace", async () => {
    const bundle = structuredClone(scenarios[0].evidence);
    bundle.logs = bundle.logs.map((log) =>
      log.service === "checkout-service"
        ? {
            ...log,
            message:
              "POST /api/checkout status=200 duration_ms=300 trace_id=tr_982",
          }
        : log,
    );
    const result = await investigate(
      { description: "Inspect checkout", severity: "high" },
      bundle,
    );
    expect(result.report.affectedServices).toEqual(["order-service"]);
  });
  it("ignores failure signals on unrelated traces and generic warnings", () => {
    const failure = scenarios[0].evidence.logs[0];
    const logs: Log[] = [
      {
        ...failure,
        id: "other",
        service: "inventory-service",
        message: "status=503 trace_id=tr_unrelated",
      },
      {
        ...failure,
        id: "warn",
        service: "customer-service",
        message: "cache warming trace_id=tr_982",
      },
      {
        ...failure,
        id: "healthy",
        service: "payment-service",
        message: "status=200 trace_id=tr_982",
      },
      {
        ...failure,
        id: "linked",
        service: "order-worker",
        message: "status=503 trace_id=tr_982",
      },
    ];
    expect(correlatedImpactLogs(logs, failure).map((log) => log.id)).toEqual([
      "linked",
    ]);
  });
});
