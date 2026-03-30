// SPEC: copilot.md

export async function* readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<{ event?: string; data: string }> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let event: string | undefined;
    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        yield { event, data: line.slice(5).trim() };
        event = undefined;
      }
    }
  }
}
