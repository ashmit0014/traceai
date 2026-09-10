"use client";
import { useState } from "react";
import { FlaskConical, LoaderCircle, Play } from "lucide-react";
import { PageHead, Stat, Badge } from "./ui";
import { readStream } from "@/lib/stream";
import { evaluationSummary } from "@/lib/evals/presentation";
type Row = {
  scenarioId: string;
  title: string;
  expected: string;
  actual: string;
  correct: boolean;
  evidenceRelevance: number;
  durationMs: number;
  tokens: number | null;
  error: string | null;
};
export function Evaluations({
  initial,
  initialMode,
  mode,
  cases,
}: {
  initial: Row[];
  initialMode: string | null;
  mode: string;
  cases: { id: string; title: string; description: string }[];
}) {
  const [rows, setRows] = useState(initial);
  const [runMode, setRunMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setError("");
    setRows([]);
    setRunMode(mode);
    let completed = false;
    try {
      await readStream(
        await fetch("/api/evaluations", { method: "POST" }),
        (e) => {
          if (e.type === "row") setRows((r) => [...r, e.row as Row]);
          if (e.type === "complete") completed = true;
          if (e.type === "error") throw new Error(e.error as string);
        },
      );
      if (!completed)
        throw new Error(
          "Evaluation stream ended early. Retry to run the complete benchmark.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Benchmark failed");
    } finally {
      setBusy(false);
    }
  }
  const average = (key: "durationMs" | "evidenceRelevance") =>
    rows.reduce((s, r) => s + r[key], 0) / Math.max(1, rows.length);
  const summary = evaluationSummary(rows, runMode ?? mode);
  return (
    <>
      <PageHead
        eyebrow="MEASURE, DON'T GUESS"
        title="Evaluations"
        description="Replay handcrafted demo fixtures or inspect live model outputs with heuristic checks."
        action={
          <button className="button primary" onClick={run} disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Play size={15} />
            )}{" "}
            {busy
              ? `Running ${rows.length} / ${cases.length}`
              : mode === "demo"
                ? "Run demo checks"
                : "Run live benchmark"}
          </button>
        }
      />
      <div className="stats-grid">
        <Stat
          label={summary.label}
          value={summary.value}
          note={summary.note}
          accent
        />
        <Stat
          label="Source reference validity"
          value={
            rows.length
              ? `${Math.round(average("evidenceRelevance") * 100)}%`
              : "—"
          }
          note="Valid scenario source references"
        />
        <Stat
          label="Average latency"
          value={
            rows.length ? `${(average("durationMs") / 1000).toFixed(2)}s` : "—"
          }
          note="Wall-clock time per scenario"
        />
        <Stat
          label="Total token usage"
          value={
            rows.some((r) => r.tokens !== null)
              ? rows.reduce((s, r) => s + (r.tokens ?? 0), 0).toLocaleString()
              : "—"
          }
          note={
            runMode === "demo"
              ? "Demo mode makes no model calls"
              : "Provider-reported usage, if available"
          }
        />
      </div>
      <div className="benchmark-note">
        <FlaskConical size={21} />
        <div>
          <h3>
            {(runMode ?? mode) === "demo"
              ? "Demo results verify the pipeline, not model intelligence."
              : "Live benchmark · isolated evidence per scenario"}
          </h3>
          <p>
            Keyword matches can accept incorrect answers containing the expected
            words. Source validity checks only that references exist, not that
            they support the diagnosis. These are not semantic accuracy metrics.
          </p>
        </div>
        <Badge tone="amber">{runMode ?? mode} mode</Badge>
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error}
          <button onClick={run}>Retry</button>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Scenario benchmark <Badge>{cases.length} cases</Badge>
          </h2>
          <small>
            {busy
              ? "Evaluating sequentially…"
              : rows.length
                ? "Select a result to compare the diagnosis"
                : "Ready to run"}
          </small>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Keyword check</th>
                <th>Valid sources</th>
                <th>Latency</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => {
                const r = rows.find((r) => r.scenarioId === c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <button
                        className="scenario-button"
                        onClick={() => setDetail(detail === c.id ? null : c.id)}
                      >
                        <small>EVAL-{String(i + 1).padStart(2, "0")}</small>
                        <strong>{c.title}</strong>
                      </button>
                      {detail === c.id && (
                        <div className="eval-detail">
                          <p>{c.description}</p>
                          {r && (
                            <>
                              <b>Expected</b>
                              <p>{r.expected}</p>
                              <b>
                                {(runMode ?? mode) === "demo"
                                  ? "Handcrafted demo diagnosis"
                                  : "Model answer"}
                              </b>
                              <p>{r.error ?? r.actual}</p>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge tone={r ? (r.correct ? "green" : "red") : "muted"}>
                        {r
                          ? r.error
                            ? "Error"
                            : r.correct
                              ? "Matched"
                              : "No match"
                          : "Not run"}
                      </Badge>
                    </td>
                    <td>
                      {r ? `${Math.round(r.evidenceRelevance * 100)}%` : "—"}
                    </td>
                    <td>{r ? `${(r.durationMs / 1000).toFixed(2)}s` : "—"}</td>
                    <td>{r?.tokens?.toLocaleString() ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
