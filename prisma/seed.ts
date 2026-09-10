import { PrismaClient } from "@prisma/client";
import { scenarios } from "../data/scenarios";
const db = new PrismaClient();
async function main() {
  for (const s of scenarios) {
    await db.scenario.upsert({
      where: { id: s.id },
      update: {
        evidence: JSON.stringify(s.evidence),
        service: s.service,
        severity: s.severity,
      },
      create: {
        id: s.id,
        title: s.title,
        description: s.description,
        service: s.service,
        severity: s.severity,
        expected: s.expected,
        keywords: JSON.stringify(s.keywords),
        evidence: JSON.stringify(s.evidence),
      },
    });
    await db.incident.upsert({
      where: { id: `inc-${s.id}` },
      update: {},
      create: {
        id: `inc-${s.id}`,
        title: s.title,
        description: s.description,
        scenarioId: s.id,
        service: s.service,
        severity: s.severity,
        status: "open",
        createdAt: new Date("2026-09-10T10:05:00Z"),
      },
    });
  }
  console.log("Seeded ShopFlow: 8 incidents and isolated evidence bundles.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
