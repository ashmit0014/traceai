import { db } from "@/lib/db";
import { mode } from "@/lib/ai/provider";
import { Evaluations } from "@/components/evaluations";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [latest, cases] = await Promise.all([
    db.evaluation.findFirst({ orderBy: { createdAt: "desc" } }),
    db.scenario.findMany({
      select: { id: true, title: true, description: true },
      orderBy: { id: "asc" },
    }),
  ]);
  return (
    <Evaluations
      initial={latest ? JSON.parse(latest.results) : []}
      initialMode={latest?.mode ?? null}
      mode={mode()}
      cases={cases}
    />
  );
}
