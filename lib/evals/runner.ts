import type { Report } from "../schema";
export function scoreReport(
  report: Report,
  keywords: string[],
  validSources: Set<string>,
) {
  // Legacy storage keys retained for historical runs. `correct` only means
  // keyword match; `evidenceRelevance` only means reference validity.
  // Neither field measures semantic correctness or LLM intelligence.
  const answer = report.rootCause.toLowerCase();
  return {
    correct: keywords.every((k) => answer.includes(k.toLowerCase())),
    evidenceRelevance:
      report.evidence.filter((e) => validSources.has(e.source)).length /
      Math.max(1, report.evidence.length),
  };
}
