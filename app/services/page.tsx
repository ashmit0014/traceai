import Link from "next/link";
import { Layers, ArrowUpRight, Database } from "lucide-react";
import { PageHead, Badge } from "@/components/ui";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Page() {
  const incidents = await db.incident.findMany();
  return (
    <>
      <PageHead
        eyebrow="SERVICE CATALOG"
        title="Services"
        description="The dependencies behind ShopFlow. Follow an incident to its source."
      />
      <div className="service-grid">
        {[
          "checkout-service",
          "order-service",
          "payment-service",
          "customer-service",
          "postgres",
        ].map((service, i) => {
          const matching = incidents.filter((x) => x.service === service);
          return (
            <section className="panel service-card" key={service}>
              <div className="panel-heading">
                {i === 4 ? <Database size={23} /> : <Layers size={23} />}
                <Badge tone={i < 2 ? "amber" : "green"}>
                  {i < 2 ? "Degraded" : "Healthy"}
                </Badge>
              </div>
              <h2>{service}</h2>
              <p>
                {
                  [
                    "Public checkout API and request orchestration",
                    "Cart pricing, order persistence, and fulfillment",
                    "Card authorization and payment gateway integration",
                    "Customer profiles and loyalty tier lookups",
                    "Primary relational datastore for ShopFlow",
                  ][i]
                }
              </p>
              <div className="service-facts">
                <span>
                  Environment <b>Production</b>
                </span>
                <span>
                  Owner <b>{i === 4 ? "Platform" : "Commerce"}</b>
                </span>
                <span>
                  Active incidents{" "}
                  <b>{matching.filter((x) => x.status === "open").length}</b>
                </span>
              </div>
              {matching.length ? (
                matching.map((x) => (
                  <Link
                    className="service-incident"
                    key={x.id}
                    href={`/incidents/${x.id}`}
                  >
                    {x.title}
                    <ArrowUpRight size={15} />
                  </Link>
                ))
              ) : (
                <p className="form-note">No directly assigned incidents.</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="form-note mt">
        Health is a seeded snapshot of the checkout deployment window; it is not
        live monitoring.
      </p>
    </>
  );
}
