export async function readStream(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
) {
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Request failed");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming is unavailable");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
      if (done) break;
    }
    if (buffer.trim()) onEvent(JSON.parse(buffer));
  } finally {
    reader.releaseLock();
  }
}
