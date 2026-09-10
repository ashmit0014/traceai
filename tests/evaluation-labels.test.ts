import { expect, it } from "vitest";
import { evaluationSummary } from "../lib/evals/presentation";
import { scoreReport } from "../lib/evals/runner";
import type { Report } from "../lib/schema";

it("presents historical demo keyword matches as fixture checks, not accuracy", () => {
  expect(
    evaluationSummary(
      Array.from({ length: 8 }, () => ({ correct: true })),
      "demo",
    ),
  ).toEqual({
    label: "Fixture keyword checks",
    value: "8 / 8",
    note: "Handcrafted demo · not AI accuracy",
  });
});
it("labels live results as heuristic keyword match rates", () => {
  expect(
    evaluationSummary([{ correct: true }, { correct: false }], "live"),
  ).toEqual({
    label: "Keyword match rate",
    value: "50%",
    note: "Heuristic match · not semantic accuracy",
  });
});
it("does not display a score before any cases have run", () => {
  expect(evaluationSummary([], "demo").value).toBe("—");
});
it("documents the keyword scorer false-positive limitation", () => {
  const report = {
    rootCause: "The customer accidentally created an infinite fruit loop.",
    evidence: [],
  } as unknown as Report;
  // This intentionally matches. It must not be presented as AI accuracy.
  expect(scoreReport(report, ["customer", "loop"], new Set()).correct).toBe(
    true,
  );
  expect(evaluationSummary([{ correct: true }], "live").label).toBe(
    "Keyword match rate",
  );
});
