import Link from "next/link";
import { ArrowRight, Activity, GitBranch, Radar } from "lucide-react";
import { db } from "@/lib/db";
import { PageHead, Stat, Badge } from "@/components/ui";
import { IncidentTable } from "@/components/incident-table";
import { MetricChart } from "@/components/metrics";
import { evaluationSummary } from "@/lib/evals/presentation";
import { mode } from "@/lib/ai/provider";
export const dynamic = "force-dynamic";
export default async function Overview() {
  const [incidents, count, scenario, evaluation] = await Promise.all([
    db.incident.findMany({ orderBy: { createdAt: "desc" } }),
    db.investigation.count({ where: { status: "completed" } }),
    db.scenario.findUnique({ where: { id: "n-plus-one" } }),
    db.evaluation.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const rows = evaluation
    ? (JSON.parse(evaluation.results) as { correct: boolean }[])
    : [];
  const evaluationStat = evaluationSummary(rows, evaluation?.mode ?? mode());
  return (
    <>
      <PageHead
        eyebrow="YOUR PRODUCTION, UNDERSTOOD"
        title="Overview"
        description="A clear view of your services. A faster path to the root cause."
        action={
          <Link className="button primary" href="/incidents/inc-n-plus-one">
            <Radar size={16} /> Investigate an incident <ArrowRight size={15} />
          </Link>
        }
      />
      <div className="stats-grid">
        <Stat
          label="Active incidents"
          value={incidents.filter((i) => i.status === "open").length}
          note="Across your production services"
        />
        <Stat
          label="Mean time to resolution"
          value="12m 24s"
          note="Historical demo baseline · seeded"
        />
        <Stat
          label="Investigations completed"
          value={count}
          note="Evidence-backed reports generated"
          accent
        />
        <Stat
          label={evaluationStat.label}
          value={evaluationStat.value}
          note={evaluationStat.note}
        />
      </div>
      <section className="feature-banner">
        <div className="feature-icon">
          <Radar size={26} />
        </div>
        <div>
          <div className="eyebrow mint-text">
            MEET YOUR INCIDENT INVESTIGATOR
          </div>
          <h2>From alert to explanation.</h2>
          <p>
            Trace logs, correlate metrics, and connect the change that caused
            it.
          </p>
        </div>
        <Link href="/incidents/inc-n-plus-one" className="button">
          Explore demo incident <ArrowRight size={15} />
        </Link>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <Activity size={17} /> Checkout performance
              </h2>
              <small>September 10, 2026 · deployment window</small>
            </div>
            <Badge tone="amber">Latency regression</Badge>
          </div>
          {scenario ? (
            <MetricChart
              data={JSON.parse(scenario.evidence).metrics}
              metric="p95_latency"
              title="p95 latency"
              unit="ms"
              compact
            />
          ) : (
            <p className="empty">Run npm run seed to load evidence.</p>
          )}
        </section>
        <section className="panel service-panel">
          <div className="panel-heading">
            <h2>Service health</h2>
            <Link href="/services">
              <ArrowRight size={16} />
            </Link>
          </div>
          {[
            "checkout-service",
            "order-service",
            "payment-service",
            "customer-service",
            "postgres",
          ].map((s, i) => (
            <div className="health-row" key={s}>
              <span className={`dot ${i < 2 ? "amber" : "green"}`} />
              <span>{s}</span>
              <small>{i < 2 ? "Degraded" : "Healthy"}</small>
              <svg width="60" height="22" viewBox="0 0 60 22">
                <path
                  d={
                    i < 2
                      ? "M0 18 L8 17 L14 18 L20 6 L26 8 L34 3 L40 7 L48 4 L60 5"
                      : "M0 14 L8 13 L14 15 L20 11 L26 13 L34 12 L40 15 L48 12 L60 13"
                  }
                  fill="none"
                  stroke={i < 2 ? "#e8b16b" : "#75d5b4"}
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          ))}
          <div className="panel-foot">
            <GitBranch size={13} /> v1.42 deployed at 10:00 UTC{" "}
            <span>Fixture snapshot</span>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Recent incidents <Badge>{incidents.length}</Badge>
            </h2>
            <small>Investigate what changed. Understand why.</small>
          </div>
          <Link className="text-link" href="/incidents">
            View all incidents <ArrowRight size={14} />
          </Link>
        </div>
        <IncidentTable incidents={incidents.slice(0, 5)} />
      </section>
    </>
  );
}
