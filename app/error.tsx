"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-investigation">
      <h1>Unable to load the workspace</h1>
      <p>Check that SQLite is initialized and seeded, then try again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
