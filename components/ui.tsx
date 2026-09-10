import { ArrowUpRight } from "lucide-react";
export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string | number;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        <ArrowUpRight size={14} />
      </div>
      <strong className={accent ? "mint-text" : ""}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
