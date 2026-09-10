import { PageHead, Badge } from "@/components/ui";
import { mode } from "@/lib/ai/provider";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE CONFIGURATION"
        title="Settings"
        description="A local-first investigation workspace with a configurable AI provider."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>AI provider</h2>
            <Badge tone={mode() === "demo" ? "amber" : "green"}>
              {mode()} mode
            </Badge>
          </div>
          <div className="panel-body">
            <p>
              Configuration is read on the server. Edit your local{" "}
              <code>.env</code> file and restart the app to change providers.
            </p>
            <div className="setting-row">
              <span>Model</span>
              <code>{process.env.AI_MODEL || "gpt-5.4"}</code>
            </div>
            <div className="setting-row">
              <span>API key</span>
              <Badge>
                {mode() === "demo" ? "Not configured" : "Configured · hidden"}
              </Badge>
            </div>
            <div className="setting-row">
              <span>Protocol</span>
              <span>OpenAI-compatible tool calling</span>
            </div>
            <pre className="code-block">
              {
                "AI_API_KEY=your-key\nAI_MODEL=gpt-5.4\nAI_BASE_URL=https://api.openai.com/v1"
              }
            </pre>
            <p className="form-note">
              Leave AI_API_KEY blank for deterministic demo mode. An invalid
              live key produces an error; it never silently falls back to demo.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Workspace & safety</h2>
          </div>
          <div className="panel-body">
            {[
              ["Application", "ShopFlow"],
              ["Storage", "SQLite / Prisma"],
              ["Evidence sources", "Seeded repository only"],
              ["Tool access", "6 allowlisted read-only tools"],
              ["Run limits", "12 model turns · 36 tool calls"],
              ["Shell execution", "Disabled"],
              ["Authentication", "Local demo · no account required"],
            ].map(([key, value]) => (
              <div className="setting-row" key={key}>
                <span>{key}</span>
                <b>{value}</b>
              </div>
            ))}
            <p className="form-note">
              Intended for localhost. Add authentication, per-user
              authorization, durable job queues, and rate limits before exposing
              this workspace publicly.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
