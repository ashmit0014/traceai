import { z } from "zod";
export const severitySchema = z.enum(["low", "medium", "high", "critical"]);
export const investigationContextSchema = z.object({
  description: z.string().min(1).max(4000),
  severity: severitySchema,
});
export type InvestigationContext = z.infer<typeof investigationContextSchema>;
export const reportSchema = z.object({
  summary: z.string().min(10),
  rootCause: z.string().min(10),
  confidence: z.number().min(0).max(1),
  severity: severitySchema,
  affectedServices: z.array(z.string()).min(1),
  evidence: z
    .array(
      z.object({
        type: z.enum(["log", "metric", "source", "deployment", "commit"]),
        title: z.string(),
        description: z.string(),
        source: z.string(),
      }),
    )
    .min(2),
  hypotheses: z
    .array(
      z.object({
        title: z.string(),
        status: z.enum(["confirmed", "rejected", "uncertain"]),
        reason: z.string(),
      }),
    )
    .min(2),
  suggestedFix: z.object({ description: z.string(), codeExample: z.string() }),
  nextActions: z.array(z.string()).min(1),
});
export type Report = z.infer<typeof reportSchema>;
export type Activity = {
  stage: string;
  message: string;
  time: string;
  tool?: string;
  input?: unknown;
  output?: unknown;
};
export const incidentInput = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(4000),
  scenarioId: z.string().min(1).max(80),
});
