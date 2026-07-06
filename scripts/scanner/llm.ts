import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Provider-agnostic LLM extraction with a no-pay bias.
//
// Free tiers, in preference order:
//   1. Groq (GROQ_API_KEY) — OpenAI-compatible, thousands of req/day free.
//   2. Any OpenAI-compatible endpoint (OPENAI_COMPAT_BASE_URL + _API_KEY) —
//      e.g. Cerebras, Together, OpenRouter free models.
//   3. Gemini (GOOGLE_API_KEY) — only ~20 req/day free, so it's last.
//
// On a 429/quota error we advance through the model list; once every model
// is exhausted the run stops calling out (isQuotaExhausted() → true).

interface ModelSpec {
  provider: "groq" | "openai-compat" | "gemini";
  model: string;
}

function buildModelChain(): ModelSpec[] {
  const chain: ModelSpec[] = [];
  if (process.env.GROQ_API_KEY) {
    chain.push(
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "groq", model: "llama-3.1-8b-instant" },
    );
  }
  if (process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL) {
    const m = process.env.OPENAI_COMPAT_MODEL ?? "gpt-4o-mini";
    chain.push({ provider: "openai-compat", model: m });
  }
  if (process.env.GOOGLE_API_KEY) {
    chain.push(
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "gemini", model: "gemini-2.5-flash-lite" },
      { provider: "gemini", model: "gemini-2.0-flash" },
    );
  }
  return chain;
}

const CHAIN = buildModelChain();
let idx = 0;

export function hasLlm(): boolean {
  return CHAIN.length > 0;
}

export function isQuotaExhausted(): boolean {
  return idx >= CHAIN.length;
}

export function activeProvider(): string {
  return CHAIN[idx]?.provider ?? "none";
}

// Gemini-only structured-output schema; other providers use json_object mode
// and rely on the prompt to describe the shape.
const GEMINI_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    events: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING },
          event: { type: SchemaType.STRING },
          where: { type: SchemaType.STRING },
          cost: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          flag: { type: SchemaType.STRING, nullable: true },
          mode: { type: SchemaType.STRING },
          start: { type: SchemaType.STRING, nullable: true },
          end: { type: SchemaType.STRING, nullable: true },
          note: { type: SchemaType.STRING, nullable: true },
          url: { type: SchemaType.STRING },
        },
        required: [
          "day", "date", "event", "where", "cost", "category", "mode", "url",
        ],
      },
    },
  },
  required: ["events"],
};

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const m = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
      temperature: 0,
    },
  });
  const res = await m.generateContent(userPrompt);
  return res.response.text();
}

async function callOpenAiCompat(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  baseUrl: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            systemPrompt +
            '\n\nReturn a JSON object of the form {"events": [ ... ]}.',
        },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`${res.status} ${body.slice(0, 200)}`);
    throw err;
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function isQuotaError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    msg.includes("429") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("too many requests")
  );
}

/** Returns raw JSON text, or null if quota is exhausted across all models. */
export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  while (idx < CHAIN.length) {
    const spec = CHAIN[idx]!;
    try {
      if (spec.provider === "gemini") {
        return await callGemini(systemPrompt, userPrompt, spec.model);
      }
      if (spec.provider === "groq") {
        return await callOpenAiCompat(
          systemPrompt,
          userPrompt,
          spec.model,
          "https://api.groq.com/openai/v1",
          process.env.GROQ_API_KEY!,
        );
      }
      return await callOpenAiCompat(
        systemPrompt,
        userPrompt,
        spec.model,
        process.env.OPENAI_COMPAT_BASE_URL!,
        process.env.OPENAI_COMPAT_API_KEY!,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isQuotaError(msg)) {
        idx += 1;
        if (idx < CHAIN.length) {
          console.warn(
            `   quota/rate limit on ${spec.provider}:${spec.model} — falling back to ${CHAIN[idx]!.provider}:${CHAIN[idx]!.model}`,
          );
          continue;
        }
        console.warn(`   all LLM providers exhausted — LLM disabled for rest of run`);
        return null;
      }
      // Non-quota error (bad model name, network): skip this model, try next.
      console.warn(`   ${spec.provider}:${spec.model} error: ${msg.slice(0, 120)}`);
      idx += 1;
      if (idx >= CHAIN.length) return null;
    }
  }
  return null;
}
