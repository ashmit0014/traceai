import { db } from "@/lib/db";
import { PageHead } from "@/components/ui";
import { IncidentTable } from "@/components/incident-table";
import { NewIncident } from "@/components/new-incident";
export const dynamic = "force-dynamic";
export default async function Incidents() {
  const [incidents, scenarios] = await Promise.all([
    db.incident.findMany({ orderBy: { createdAt: "desc" } }),
    db.scenario.findMany({ select: { id: true, title: true } }),
  ]);
  return (
    <>
      <PageHead
        eyebrow="INCIDENT MANAGEMENT"
        title="Incidents"
        description="A shared workspace for understanding what went wrong."
        action={<NewIncident scenarios={scenarios} />}
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>All incidents</h2>
          <small>{incidents.length} incidents · ShopFlow production</small>
        </div>
        {incidents.length ? (
          <IncidentTable incidents={incidents} />
        ) : (
          <p className="empty">
            No incidents yet. Create one to begin investigating.
          </p>
        )}
      </section>
    </>
  );
}
