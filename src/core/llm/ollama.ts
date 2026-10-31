import type { LlmClient, LlmRequest } from "../ports";

export class OllamaUnavailableError extends Error {
  override name = "OllamaUnavailableError";
}

export class OllamaModelMissingError extends Error {
  override name = "OllamaModelMissingError";
}

export class OllamaTimeoutError extends Error {
  override name = "OllamaTimeoutError";
}

export class OllamaResponseError extends Error {
  override name = "OllamaResponseError";
}

export interface OllamaClientOptions {
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export class OllamaClient implements LlmClient {
  readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OllamaClientOptions) {
    this.model = options.model;
    this.baseUrl = (options.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async completeJson(request: LlmRequest): Promise<string> {
    const body = {
      model: this.model,
      stream: false,
      format: request.jsonSchema ?? "json",
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      options: { temperature: 0, num_ctx: 8192 },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw this.timeoutError();
        throw new OllamaUnavailableError(
          `Ollama is not running at ${this.baseUrl}; start it with \`ollama serve\` (${(err as Error).message})`,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 404 && /not found/i.test(text)) {
          throw new OllamaModelMissingError(
            `Model ${this.model} is not installed in Ollama; run \`ollama pull ${this.model}\``,
          );
        }
        throw new OllamaResponseError(`Ollama returned HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      let data: { message?: { content?: unknown } };
      try {
        data = (await res.json()) as typeof data;
      } catch (err) {
        if (controller.signal.aborted) throw this.timeoutError();
        throw new OllamaResponseError(`Ollama returned a body that is not JSON: ${(err as Error).message}`);
      }
      const content = data.message?.content;
      if (typeof content !== "string") {
        throw new OllamaResponseError("Ollama response has no message content");
      }
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  private timeoutError(): OllamaTimeoutError {
    return new OllamaTimeoutError(`Ollama model ${this.model} did not answer within ${this.timeoutMs} ms`);
  }
}
