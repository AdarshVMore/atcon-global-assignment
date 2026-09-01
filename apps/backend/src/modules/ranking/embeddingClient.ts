import type OpenAI from "openai";
import { config } from "../../config/env.ts";

// Embedding models don't need much context to place a resume/job in vector
// space — keeps the request cheap.
const MAX_INPUT_CHARS = 8_000;

export class EmbeddingClient {
  constructor(private readonly client: OpenAI) {}

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: config.openRouterEmbeddingModel,
      input: text.slice(0, MAX_INPUT_CHARS),
    });

    const vector = response.data[0]?.embedding;
    if (!vector) {
      throw new Error("OpenRouter returned no embedding");
    }
    return vector;
  }
}
