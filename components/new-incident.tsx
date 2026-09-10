"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
export function NewIncident({
  scenarios,
}: {
  scenarios: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <button className="button primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> New incident
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create incident"
          >
            <div className="panel-heading">
              <h2>New incident</h2>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const form = new FormData(e.currentTarget);
                try {
                  const response = await fetch("/api/incidents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Object.fromEntries(form)),
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);
                  router.push(`/incidents/${data.id}`);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to create incident",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Incident title
                <input
                  autoFocus
                  required
                  minLength={5}
                  maxLength={160}
                  name="title"
                  placeholder="Checkout latency increased after deployment"
                />
              </label>
              <label>
                What happened?
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  name="description"
                  rows={4}
                  placeholder="Describe the impact, timing, and signals you observed…"
                />
              </label>
              <label>
                Evidence scenario
                <select name="scenarioId" defaultValue="n-plus-one">
                  {scenarios.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-note">
                Custom incident descriptions use the selected seeded evidence
                bundle. Live telemetry ingestion is outside this MVP.
              </p>
              {error && (
                <p role="alert" className="red-text">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? "Creating…" : "Create incident"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
