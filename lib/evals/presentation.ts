// `correct` is the legacy persisted keyword-match flag, not semantic correctness.
export function evaluationSummary(rows: { correct: boolean }[], mode: string) {
  const matched = rows.filter((row) => row.correct).length;
  return {
    label: mode === "demo" ? "Fixture keyword checks" : "Keyword match rate",
    value: !rows.length
      ? "—"
      : mode === "demo"
        ? `${matched} / ${rows.length}`
        : `${Math.round((matched / rows.length) * 100)}%`,
    note:
      mode === "demo"
        ? "Handcrafted demo · not AI accuracy"
        : "Heuristic match · not semantic accuracy",
  };
}
