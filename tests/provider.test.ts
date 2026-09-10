import { afterEach, expect, it, vi } from "vitest";
import { CompatibleProvider } from "../lib/ai/provider";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("uses the configured provider endpoint and model with function definitions", async () => {
  vi.stubEnv("AI_API_KEY", "test-key");
  vi.stubEnv("AI_MODEL", "frontier-test");
  vi.stubEnv("AI_BASE_URL", "https://provider.example/v1/");
  const mock = vi.fn(async () =>
    Response.json({
      choices: [{ message: { content: "{}" } }],
      usage: { total_tokens: 12 },
    }),
  );
  vi.stubGlobal("fetch", mock);
  const result = await new CompatibleProvider().complete([
    { role: "user", content: "Find the cause" },
  ]);
  const [url, request] = mock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://provider.example/v1/chat/completions");
  expect(JSON.parse(request.body as string)).toMatchObject({
    model: "frontier-test",
    tool_choice: "auto",
  });
  expect(JSON.parse(request.body as string).tools).toHaveLength(6);
  expect(result.tokens).toBe(12);
});
it("sanitizes provider failures without leaking response bodies or credentials", async () => {
  vi.stubGlobal(
    "fetch",
    async () => new Response("secret upstream debug dump", { status: 401 }),
  );
  await expect(new CompatibleProvider().complete([])).rejects.toThrow(
    "HTTP 401",
  );
});
