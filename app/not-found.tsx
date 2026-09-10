import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-investigation">
      <h1>Incident not found</h1>
      <p>This incident may not exist in your local workspace.</p>
      <Link className="button primary" href="/incidents">
        Back to incidents
      </Link>
    </section>
  );
}
