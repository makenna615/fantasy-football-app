import OpenAI from "openai";
import { z } from "zod";

const resultSchema = z.object({ summary: z.string().min(1).max(1200) });

export async function explainFacts(facts: unknown, fallback: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 12_000, maxRetries: 1 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4",
      instructions: "Explain the supplied deterministic fantasy-football result concisely. Never alter rankings, scores, deltas, or invent injuries/news. Return JSON.",
      input: JSON.stringify(facts),
      text: { format: { type: "json_schema", name: "fantasy_explanation", strict: true, schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false } } },
      max_output_tokens: 300,
    });
    return resultSchema.parse(JSON.parse(response.output_text)).summary;
  } catch { return fallback; }
}
