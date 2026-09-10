import { z } from "zod";
import type { EvidenceBundle } from "../data/scenarios";
const text = z.string().max(300);
export const inputs = {
  search_logs: z
    .object({
      query: text,
      service: text.optional(),
      level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    })
    .strict(),
  query_metrics: z
    .object({
      metric: text,
      service: text.optional(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
    })
    .strict()
    .refine(
      (x) => !x.startTime || !x.endTime || x.startTime <= x.endTime,
      "Start must precede end",
    ),
  read_source_file: z
    .object({
      path: z
        .string()
        .min(1)
        .max(240)
        .refine(
          (p) =>
            !p.includes("..") &&
            !p.includes("\\") &&
            !p.startsWith("/") &&
            !p.includes(":"),
          "Only seeded relative repository paths are allowed",
        ),
    })
    .strict(),
  search_code: z.object({ query: text.min(1) }).strict(),
  get_deployments: z.object({}).strict(),
  get_commit_diff: z.object({ commitId: text.min(1) }).strict(),
};
export type ToolName = keyof typeof inputs;
export function executeTool(
  bundle: EvidenceBundle,
  name: string,
  args: unknown,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(inputs, name))
    throw new Error("Tool is not allowlisted");
  const parsed = inputs[name as ToolName].parse(args);
  switch (name) {
    case "search_logs": {
      const a = parsed as z.infer<typeof inputs.search_logs>;
      return bundle.logs
        .filter(
          (l) =>
            (!a.service || l.service === a.service) &&
            (!a.level || l.level === a.level) &&
            l.message.toLowerCase().includes(a.query.toLowerCase()),
        )
        .slice(0, a.limit ?? 30);
    }
    case "query_metrics": {
      const a = parsed as z.infer<typeof inputs.query_metrics>;
      return bundle.metrics.filter(
        (m) =>
          m.metric === a.metric &&
          (!a.service || m.service === a.service) &&
          (!a.startTime ||
            Date.parse(m.timestamp) >= Date.parse(a.startTime)) &&
          (!a.endTime || Date.parse(m.timestamp) <= Date.parse(a.endTime)),
      );
    }
    case "read_source_file": {
      const a = parsed as { path: string };
      const f = bundle.files.find((f) => f.path === a.path);
      if (!f) throw new Error("Source file not found in seeded repository");
      return f;
    }
    case "search_code": {
      const a = parsed as { query: string };
      return bundle.files
        .filter((f) =>
          (f.content + " " + f.path)
            .toLowerCase()
            .includes(a.query.toLowerCase()),
        )
        .map((f) => ({ path: f.path, snippet: f.content }));
    }
    case "get_deployments":
      return bundle.deployments;
    case "get_commit_diff": {
      const a = parsed as { commitId: string };
      const c = bundle.commits.find((c) => c.id === a.commitId);
      if (!c) throw new Error("Unknown commit");
      return c;
    }
  }
}
export const toolDefinitions = [
  {
    name: "search_logs",
    description:
      "Search log messages by literal substring. Empty query lists logs.",
    properties: {
      query: { type: "string" },
      service: { type: "string" },
      level: { type: "string", enum: ["DEBUG", "INFO", "WARN", "ERROR"] },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
    required: ["query"],
  },
  {
    name: "query_metrics",
    description:
      "Inspect metric series: p95_latency, db_queries, request_rate, cpu_percent, payment_latency, memory_mb.",
    properties: {
      metric: { type: "string" },
      service: { type: "string" },
      startTime: { type: "string" },
      endTime: { type: "string" },
    },
    required: ["metric"],
  },
  {
    name: "read_source_file",
    description:
      "Read only an exact seeded repository path discovered through search or a diff.",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  {
    name: "search_code",
    description: "Find source files and snippets using a literal substring.",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  {
    name: "get_deployments",
    description: "List deployment versions, timestamps, and commit IDs.",
    properties: {},
    required: [],
  },
  {
    name: "get_commit_diff",
    description: "Read the simulated diff for a known commit.",
    properties: { commitId: { type: "string" } },
    required: ["commitId"],
  },
].map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: t.properties,
      required: t.required,
      additionalProperties: false,
    },
  },
}));
