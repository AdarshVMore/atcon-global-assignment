import OpenAI from "openai";
import { config } from "../../config/env.ts";

/**
 * OpenRouter exposes an OpenAI-compatible chat completions API, so the
 * official `openai` SDK works unmodified against it — no separate
 * OpenRouter package needed.
 */
export function createOpenRouterClient(): OpenAI {
  return new OpenAI({
    apiKey: config.openRouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
