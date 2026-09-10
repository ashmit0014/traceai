import { z } from "zod";
import { toolDefinitions } from "../tools";
export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};
export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                type: z.literal("function"),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .optional(),
        }),
      }),
    )
    .min(1),
  usage: z.object({ total_tokens: z.number() }).optional(),
});
export interface Provider {
  complete(
    messages: Message[],
    signal?: AbortSignal,
  ): Promise<{ message: Message; tokens?: number }>;
}
export const mode = () => (process.env.AI_API_KEY?.trim() ? "live" : "demo");
export class CompatibleProvider implements Provider {
  async complete(messages: Message[], signal?: AbortSignal) {
    const base = (
      process.env.AI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const timeout = AbortSignal.timeout(45000);
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-5.4",
        messages,
        tools: toolDefinitions,
        tool_choice: "auto",
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok)
      throw new Error(
        `AI provider returned HTTP ${response.status}. Check server-side provider configuration and retry.`,
      );
    const result = responseSchema.parse(await response.json());
    const m = result.choices[0].message;
    return {
      message: {
        role: "assistant" as const,
        content: m.content ?? null,
        tool_calls: m.tool_calls,
      },
      tokens: result.usage?.total_tokens,
    };
  }
}
