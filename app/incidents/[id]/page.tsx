import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Investigation } from "@/components/investigation";
import { mode } from "@/lib/ai/provider";
export const dynamic = "force-dynamic";
export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      scenario: true,
      investigations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!incident) notFound();
  const run = incident.investigations[0];
  return (
    <Investigation
      incident={{
        id: incident.id,
        title: incident.title,
        description: incident.description,
        service: incident.service,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt.toISOString(),
      }}
      bundle={JSON.parse(incident.scenario.evidence)}
      initialReport={run?.result ? JSON.parse(run.result) : null}
      initialActivity={run ? JSON.parse(run.activity) : []}
      initialError={run?.error ?? null}
      mode={mode()}
      initialMode={run?.mode ?? null}
      initialDuration={run?.status === "completed" ? run.durationMs : null}
    />
  );
}
