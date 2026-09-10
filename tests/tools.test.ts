import { describe, it, expect } from "vitest";
import { executeTool } from "../lib/tools";
import { scenarios } from "../data/scenarios";
const bundle = scenarios[0].evidence;
describe("allowlisted evidence tools", () => {
  it("filters literal log queries, service and level, and enforces the requested limit", () => {
    const logs = executeTool(bundle, "search_logs", {
      query: "SELECT",
      service: "order-service",
      level: "DEBUG",
      limit: 3,
    }) as { message: string }[];
    expect(logs).toHaveLength(3);
    expect(logs.every((l) => l.message.includes("customers"))).toBe(true);
  });
  it("returns an empty list for unknown log text", () =>
    expect(
      executeTool(bundle, "search_logs", { query: "nonexistent" }),
    ).toEqual([]));
  it("rejects invalid limits and unknown properties", () => {
    expect(() =>
      executeTool(bundle, "search_logs", { query: "", limit: 1000 }),
    ).toThrow();
    expect(() =>
      executeTool(bundle, "search_logs", { query: "", command: "whoami" }),
    ).toThrow();
  });
  it("scopes metrics by name, service, and inclusive time bounds", () => {
    const rows = executeTool(bundle, "query_metrics", {
      metric: "p95_latency",
      service: "checkout-service",
      startTime: "2026-09-10T10:00:00Z",
      endTime: "2026-09-10T10:02:00Z",
    }) as { value: number }[];
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.value > 3700)).toBe(true);
  });
  it("rejects reversed time bounds", () =>
    expect(() =>
      executeTool(bundle, "query_metrics", {
        metric: "p95_latency",
        startTime: "2026-09-10T11:00:00Z",
        endTime: "2026-09-10T10:00:00Z",
      }),
    ).toThrow());
  it.each([
    "../.env",
    "/etc/passwd",
    "C:\\Users\\secret",
    "services/../../.env",
    "services\\order\\OrderService.ts",
  ])("rejects unsafe source path %s", (path) =>
    expect(() => executeTool(bundle, "read_source_file", { path })).toThrow(),
  );
  it("cannot read unseeded paths even if syntactically safe", () =>
    expect(() =>
      executeTool(bundle, "read_source_file", { path: "package.json" }),
    ).toThrow("not found"));
  it("returns seeded source and code snippets", () => {
    expect(
      executeTool(bundle, "read_source_file", {
        path: "services/order/OrderService.ts",
      }),
    ).toHaveProperty("content", expect.stringContaining("for (const item"));
    expect(
      executeTool(bundle, "search_code", { query: "loyaltyTier" }),
    ).toHaveLength(1);
  });
  it("resolves a deployment to its simulated commit", () => {
    const deployments = executeTool(bundle, "get_deployments", {}) as {
      commitId: string;
    }[];
    expect(
      executeTool(bundle, "get_commit_diff", {
        commitId: deployments[0].commitId,
      }),
    ).toHaveProperty("diff", expect.stringContaining("+    const customer"));
    expect(() =>
      executeTool(bundle, "get_commit_diff", { commitId: "unknown" }),
    ).toThrow();
  });
  it.each(["exec", "read_file", "__proto__", "constructor"])(
    "rejects non-allowlisted tool %s",
    (name) =>
      expect(() => executeTool(bundle, name, {})).toThrow("allowlisted"),
  );
});
