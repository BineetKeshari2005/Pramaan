import { describe, expect, it } from "vitest";
import {
  OllamaClient,
  OllamaModelMissingError,
  OllamaResponseError,
  OllamaTimeoutError,
  OllamaUnavailableError,
} from "../../src/core/llm";

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: (call: Call) => Promise<Response>): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const request = { system: "sys", prompt: "user text", jsonSchema: { type: "object" } };

describe("OllamaClient", () => {
  it("posts a non-streaming, temperature-0 chat request with the JSON schema as format", async () => {
    const { fetchImpl, calls } = fakeFetch(async () =>
      Response.json({ message: { role: "assistant", content: '{"claims":[]}' } }),
    );
    const client = new OllamaClient({ model: "gemma-test", baseUrl: "http://ollama:11434/", fetchImpl });

    await expect(client.completeJson(request)).resolves.toBe('{"claims":[]}');
    expect(calls[0]?.url).toBe("http://ollama:11434/api/chat");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      model: "gemma-test",
      stream: false,
      format: { type: "object" },
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "user text" },
      ],
      options: { temperature: 0, num_ctx: 8192 },
    });
  });

  it('falls back to format "json" when no schema is given', async () => {
    const { fetchImpl, calls } = fakeFetch(async () => Response.json({ message: { content: "{}" } }));
    await new OllamaClient({ model: "m", fetchImpl }).completeJson({ system: "s", prompt: "p" });
    expect(JSON.parse(String(calls[0]?.init.body)).format).toBe("json");
  });

  it("explains how to start Ollama when the connection is refused", async () => {
    const { fetchImpl } = fakeFetch(async () => {
      throw new TypeError("fetch failed: connect ECONNREFUSED 127.0.0.1:11434");
    });
    const err = await new OllamaClient({ model: "m", fetchImpl }).completeJson(request).catch((e) => e);
    expect(err).toBeInstanceOf(OllamaUnavailableError);
    expect(err.message).toContain("ollama serve");
  });

  it("explains how to pull a missing model", async () => {
    const { fetchImpl } = fakeFetch(async () =>
      Response.json({ error: "model 'gemma-test' not found" }, { status: 404 }),
    );
    const err = await new OllamaClient({ model: "gemma-test", fetchImpl }).completeJson(request).catch((e) => e);
    expect(err).toBeInstanceOf(OllamaModelMissingError);
    expect(err.message).toContain("ollama pull gemma-test");
  });

  it("times out instead of hanging", async () => {
    const { fetchImpl } = fakeFetch(
      ({ init }) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const err = await new OllamaClient({ model: "m", fetchImpl, timeoutMs: 20 }).completeJson(request).catch((e) => e);
    expect(err).toBeInstanceOf(OllamaTimeoutError);
  });

  it("reports other HTTP errors and malformed responses", async () => {
    const server500 = fakeFetch(async () => new Response("boom", { status: 500 }));
    await expect(
      new OllamaClient({ model: "m", fetchImpl: server500.fetchImpl }).completeJson(request),
    ).rejects.toBeInstanceOf(OllamaResponseError);

    const noContent = fakeFetch(async () => Response.json({ done: true }));
    await expect(
      new OllamaClient({ model: "m", fetchImpl: noContent.fetchImpl }).completeJson(request),
    ).rejects.toBeInstanceOf(OllamaResponseError);
  });
});
