import { expect, it } from "vitest";
import { sameOrigin, lock } from "../lib/http";
it("accepts the original loopback Host when Next reconstructs localhost", () => {
  expect(() =>
    sameOrigin(
      new Request("http://localhost:3000/api/investigations", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  ).not.toThrow();
});
it("rejects foreign origins and mismatched ports", () => {
  for (const origin of [
    "https://evil.example",
    "http://127.0.0.1:4000",
    "null",
  ])
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/investigations", {
          headers: { host: "127.0.0.1:3000", origin },
        }),
      ),
    ).toThrow("Cross-origin");
});
it("releases a single-process investigation lease for retry", () => {
  const release = lock("test");
  expect(() => lock("test")).toThrow("already active");
  release();
  expect(() => lock("test")()).not.toThrow();
});
