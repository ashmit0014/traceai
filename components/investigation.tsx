"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FileText,
  GitBranch,
  Layers,
  LoaderCircle,
  Play,
  Radar,
  Search,
  Terminal,
  X,
} from "lucide-react";
import type { EvidenceBundle } from "@/data/scenarios";
import type { Report, Activity } from "@/lib/schema";
import { readStream } from "@/lib/stream";
import { Badge } from "./ui";
import { MetricChart } from "./metrics";
import { incidentReference } from "@/lib/display";
type Incident = {
  id: string;
  title: string;
  description: string;
  service: string;
  severity: string;
  status: string;
  createdAt: string;
};
type Props = {
  incident: Incident;
  bundle: EvidenceBundle;
  initialReport: Report | null;
  initialActivity: Activity[];
  initialError: string | null;
  mode: string;
  initialMode: string | null;
  initialDuration: number | null;
};
const stages = [
  ["triage", "Incident triaged"],
  ["search_logs", "Logs searched"],
  ["query_metrics", "Metrics analyzed"],
  ["get_deployments", "Deployment inspected"],
  ["hypotheses", "Hypotheses generated"],
  ["verification", "Evidence verified"],
  ["complete", "Root cause identified"],
];
export function Investigation({
  incident,
  bundle,
  initialReport,
  initialActivity,
  initialError,
  mode,
  initialMode,
  initialDuration,
}: Props) {
  const [runMode, setRunMode] = useState(initialMode ?? mode);
  const [tab, setTab] = useState("Overview");
  const [report, setReport] = useState(initialReport);
  const [activity, setActivity] = useState(initialActivity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [selected, setSelected] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(initialDuration);
  async function run() {
    setBusy(true);
    setError(null);
    setReport(null);
    setActivity([]);
    setElapsed(null);
    setRunMode(mode);
    setTab("Investigation");
    let finished = false;
    try {
      await readStream(
        await fetch("/api/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId: incident.id }),
        }),
        (e) => {
          if (e.type === "start") setRunMode(e.mode as string);
          if (e.type === "activity")
            setActivity((a) => [...a, e.activity as Activity]);
          if (e.type === "result") {
            finished = true;
            setReport(e.report as Report);
            setElapsed(e.durationMs as number);
          }
          if (e.type === "error") throw new Error(e.error as string);
        },
      );
      if (!finished)
        throw new Error(
          "The stream ended before the report completed. Retry the investigation.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigation failed");
    } finally {
      setBusy(false);
    }
  }
  const evidenceValue = selected
    ? (bundle.logs.find((l) => l.id === selected) ??
      bundle.metrics.find((m) => m.id === selected) ??
      bundle.files.find((f) => f.path === selected) ??
      bundle.commits.find((c) => c.id === selected) ??
      bundle.deployments.find((d) => d.id === selected))
    : null;
  const rootCard = report ? (
    <section className="root-card">
      <div className="root-label">
        <span>
          <CheckCircle2 size={17} /> ROOT CAUSE IDENTIFIED
        </span>
        <Badge tone="green">Evidence backed</Badge>
      </div>
      <h2>{report.rootCause}</h2>
      <p>{report.summary}</p>
      <div className="confidence-row">
        <span>
          Confidence <b>{Math.round(report.confidence * 100)}%</b>
        </span>
        <div className="progress">
          <i style={{ width: `${report.confidence * 100}%` }} />
        </div>
        <small>
          Uncalibrated {runMode === "demo" ? "demo" : "model"} estimate
        </small>
      </div>
      <div className="root-services">
        <Layers size={14} />
        {report.affectedServices.map((s) => (
          <code key={s}>{s}</code>
        ))}
      </div>
    </section>
  ) : (
    <section className="empty-investigation">
      <div className="radar-orbit">
        <Radar size={32} />
      </div>
      <h2>
        {busy ? "Following the evidence…" : "Every incident leaves a trace."}
      </h2>
      <p>
        {busy
          ? "The investigator is inspecting logs, metrics, and source changes."
          : "Let TraceAI connect the signals and find what changed."}
      </p>
      {!busy && (
        <button className="button primary" onClick={run}>
          <Play size={15} /> Start investigation
        </button>
      )}
    </section>
  );
  const evidenceCards = report?.evidence.map((e, i) => (
    <button
      key={i}
      className="evidence-card"
      onClick={() => setSelected(e.source)}
    >
      <div className="evidence-type">
        <FileText size={15} />
        {e.type}
        <ArrowRight size={14} />
      </div>
      <h3>{e.title}</h3>
      <p>{e.description}</p>
      <code>{e.source}</code>
    </button>
  ));
  return (
    <>
      <Link href="/incidents" className="back-link">
        <ArrowLeft size={14} /> Incidents <ChevronRight size={12} />{" "}
        {incidentReference(incident.id)}
      </Link>
      <div className="incident-header">
        <div className="eyebrow">SHOPFLOW / PRODUCTION</div>
        <div className="incident-title-row">
          <h1>{incident.title}</h1>
          <button disabled={busy} className="button primary" onClick={run}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Radar size={16} />
            )}{" "}
            {busy
              ? "Investigating…"
              : report
                ? "Re-investigate"
                : "Investigate"}
          </button>
        </div>
        <p>{incident.description}</p>
        <div className="incident-meta">
          <Badge tone={report ? "green" : "amber"}>
            {report ? "Investigated" : "Open incident"}
          </Badge>
          <Badge tone="red">{incident.severity} severity</Badge>
          <span>
            <Layers size={13} />
            {incident.service}
          </span>
          <span>
            <GitBranch size={13} />
            v1.42
          </span>
          <span>
            <Clock size={13} />
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "UTC",
            }).format(new Date(incident.createdAt))}{" "}
            UTC
          </span>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {["Overview", "Investigation", "Evidence", "Metrics", "Code"].map(
          (t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Evidence" && report && (
                <span>{report.evidence.length}</span>
              )}
              {t === "Investigation" && busy && <span className="dot green" />}
            </button>
          ),
        )}
        <span className="tabs-note">
          <span className={`dot ${busy ? "amber" : "green"}`} />
          {busy
            ? "Agent running"
            : runMode === "demo"
              ? "Deterministic demo"
              : "Live tool calling"}
        </span>
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error}
          <button onClick={run} disabled={busy}>
            Retry investigation <ArrowRight size={14} />
          </button>
        </div>
      )}
      {(tab === "Overview" || tab === "Investigation") && (
        <div className="investigation-grid">
          <div className="stack">
            {rootCard}
            {report && (
              <>
                <div className="section-title">
                  <h2>Supporting evidence</h2>
                  <button
                    className="text-link"
                    onClick={() => setTab("Evidence")}
                  >
                    View all <ArrowRight size={14} />
                  </button>
                </div>
                <div className="evidence-grid">{evidenceCards}</div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <Code2 size={17} /> Recommended fix
                    </h2>
                    <Badge>Suggested · not applied</Badge>
                  </div>
                  <div className="panel-body">
                    <p>{report.suggestedFix.description}</p>
                    <pre className="code-block">
                      {report.suggestedFix.codeExample}
                    </pre>
                    <h3 className="next-title">Next actions</h3>
                    {report.nextActions.map((a, i) => (
                      <div className="next-action" key={a}>
                        <span>{i + 1}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            {!report && tab === "Overview" && (
              <MetricChart
                data={bundle.metrics}
                metric="p95_latency"
                title="p95 latency"
                unit="ms"
              />
            )}
            {tab === "Investigation" && activity.length > 0 && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    <Terminal size={17} /> Tool activity
                  </h2>
                  <Badge>{activity.filter((a) => a.tool).length} calls</Badge>
                </div>
                <div className="tool-activity">
                  {activity
                    .filter((a) => a.tool)
                    .map((a, i) => (
                      <details key={i}>
                        <summary>
                          <Terminal size={14} />
                          <b>{a.tool}</b>
                          <time>{a.time.slice(11, 19)}</time>
                          <ChevronRight size={13} />
                        </summary>
                        <pre>
                          {JSON.stringify(
                            { input: a.input, output: a.output },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    ))}
                </div>
              </section>
            )}
          </div>
          <aside className="stack">
            <section className="panel timeline-panel">
              <div className="panel-heading">
                <h2>
                  <Radar size={17} /> Investigation
                </h2>
                {busy && <LoaderCircle size={15} className="spin" />}
              </div>
              <div className="timeline">
                {stages.map(([key, title], i) => {
                  const done = activity.some(
                    (a) => a.stage === key || a.tool === key,
                  );
                  return (
                    <div
                      className={`timeline-item ${done ? "done" : ""}`}
                      key={key}
                    >
                      <div className="timeline-dot">
                        {done ? <Check size={12} /> : i + 1}
                      </div>
                      <div>
                        <strong>{title}</strong>
                        <small>
                          {done
                            ? activity
                                .find((a) => a.stage === key || a.tool === key)
                                ?.time.slice(11, 19) + " UTC"
                            : busy
                              ? "Pending"
                              : "Awaiting investigation"}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="panel-foot">
                {elapsed !== null
                  ? `Completed in ${(elapsed / 1000).toFixed(1)}s`
                  : "Tool activity is inspectable"}
                <Badge tone={runMode === "demo" ? "amber" : "green"}>
                  {runMode} mode
                </Badge>
              </div>
            </section>
            {report && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Hypotheses</h2>
                  <Badge>{report.hypotheses.length}</Badge>
                </div>
                <div className="hypotheses">
                  {report.hypotheses.map((h, i) => (
                    <div key={i}>
                      <Badge
                        tone={
                          h.status === "confirmed"
                            ? "green"
                            : h.status === "rejected"
                              ? "muted"
                              : "amber"
                        }
                      >
                        {h.status}
                      </Badge>
                      <h3>{h.title}</h3>
                      <p>{h.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <div className="context-note">
              <ShieldIcon />
              <p>
                Evidence is scoped to the ShopFlow demo repository. No
                production systems are connected.
              </p>
            </div>
          </aside>
        </div>
      )}
      {tab === "Evidence" && (
        <>
          <div className="section-title">
            <div>
              <h2>Evidence explorer</h2>
              <p>Open a source reference to inspect the original evidence.</p>
            </div>
            <Badge>{bundle.logs.length} log events</Badge>
          </div>
          {report && (
            <div className="evidence-grid evidence-full">{evidenceCards}</div>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <Search size={16} /> Application logs
              </h2>
              <Badge>Fixture · UTC</Badge>
            </div>
            <div className="table-scroll">
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Service</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.logs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => setSelected(l.id)}
                        >
                          {l.timestamp.slice(11, 23)}
                        </button>
                      </td>
                      <td>
                        <Badge
                          tone={
                            l.level === "ERROR"
                              ? "red"
                              : l.level === "WARN"
                                ? "amber"
                                : "muted"
                          }
                        >
                          {l.level}
                        </Badge>
                      </td>
                      <td>
                        <code>{l.service}</code>
                      </td>
                      <td>
                        <code>{l.message}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel mt">
            <div className="panel-heading">
              <h2>Deployment history</h2>
            </div>
            {bundle.deployments.map((d) => (
              <button
                className="deployment-row"
                key={d.id}
                onClick={() => setSelected(d.id)}
              >
                <GitBranch size={17} />
                <b>{d.version}</b>
                <code>{d.commitId}</code>
                <span>{d.service}</span>
                <small>{d.timestamp}</small>
                <ArrowRight size={14} />
              </button>
            ))}
          </section>
        </>
      )}
      {tab === "Metrics" && (
        <>
          <div className="section-title">
            <div>
              <h2>The deployment window</h2>
              <p>
                09:45–10:09 UTC · purple marker indicates v1.42 at 10:00 UTC.
              </p>
            </div>
            <Badge>Seeded telemetry</Badge>
          </div>
          <div className="metrics-grid">
            <MetricChart
              data={bundle.metrics}
              metric="p95_latency"
              title="p95 latency"
              unit="ms"
            />
            <MetricChart
              data={bundle.metrics}
              metric="db_queries"
              title="Database queries"
              unit="queries / request"
            />
            <MetricChart
              data={bundle.metrics}
              metric="request_rate"
              title="Request rate"
              unit="req / s"
            />
          </div>
        </>
      )}
      {tab === "Code" && (
        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <GitBranch size={16} /> Changes in v1.42
              </h2>
              <Badge>a82f4d</Badge>
            </div>
            <div className="diff-code">
              {bundle.commits[0].diff.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "addition"
                      : line.startsWith("-")
                        ? "deletion"
                        : line.startsWith("@@")
                          ? "hunk"
                          : ""
                  }
                >
                  <span>{i + 1}</span>
                  <code>{line || " "}</code>
                </div>
              ))}
            </div>
          </section>
          {bundle.files.map((f) => (
            <section className="panel" key={f.path}>
              <div className="panel-heading">
                <h2>
                  <FileText size={15} />
                  {f.path}
                </h2>
              </div>
              <pre className="code-block source-code">{f.content}</pre>
            </section>
          ))}
          {report && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Recommended implementation</h2>
                <Badge tone="green">Proposed fix</Badge>
              </div>
              <pre className="code-block source-code">
                {report.suggestedFix.codeExample}
              </pre>
            </section>
          )}
        </div>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Evidence source"
            className="modal evidence-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2>Original evidence</h2>
              <button
                className="icon-button"
                aria-label="Close evidence"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-body">
              <code>{selected}</code>
              <pre className="code-block">
                {typeof evidenceValue === "object"
                  ? JSON.stringify(evidenceValue, null, 2)
                  : "Source unavailable"}
              </pre>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function ShieldIcon() {
  return <CheckCircle2 size={17} />;
}
