import Link from "next/link";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import { Badge } from "./ui";
import { incidentReference } from "@/lib/display";
type Row = {
  id: string;
  title: string;
  service: string;
  severity: string;
  status: string;
};
export function IncidentTable({ incidents }: { incidents: Row[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Service</th>
            <th>Severity</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id}>
              <td>
                <Link className="incident-link" href={`/incidents/${i.id}`}>
                  <CircleAlert size={16} className="amber-text" />
                  <div>
                    <small>{incidentReference(i.id)}</small>
                    {i.title}
                  </div>
                </Link>
              </td>
              <td>
                <code>{i.service}</code>
              </td>
              <td>
                <Badge tone={i.severity === "critical" ? "red" : "amber"}>
                  {i.severity}
                </Badge>
              </td>
              <td>
                <Badge tone={i.status === "investigated" ? "green" : "muted"}>
                  {i.status === "investigated" ? "Investigated" : "Open"}
                </Badge>
              </td>
              <td>
                <Link
                  aria-label={`Open ${i.title}`}
                  href={`/incidents/${i.id}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
