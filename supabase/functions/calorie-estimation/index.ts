import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type CalorieEstimationResult = {
  foodName: string;
  estimatedCalories: number;
  calorieRange: {
    min: number;
    max: number;
  };
  confidence: number;
  portionSize: string;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function validateResult(result: unknown): result is CalorieEstimationResult {
  if (!result || typeof result !== "object") {
    return false;
  }
  const candidate = result as Record<string, unknown>;
  if (typeof candidate.foodName !== "string" || candidate.foodName.trim().length === 0) {
    return false;
  }
  if (typeof candidate.estimatedCalories !== "number") {
    return false;
  }
  if (typeof candidate.confidence !== "number") {
    return false;
  }
  if (typeof candidate.portionSize !== "string") {
    return false;
  }
  if (!candidate.calorieRange || typeof candidate.calorieRange !== "object") {
    return false;
  }
  const range = candidate.calorieRange as Record<string, unknown>;
  return typeof range.min === "number" && typeof range.max === "number";
}

function extractJsonString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Direct JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  // Markdown fenced block
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      return candidate;
    }
  }

  // Fallback: first JSON object in text
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !supabaseAnonKey || !authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader,
    },
  });
  if (!authRes.ok) {
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return jsonResponse({ error: "OPENAI_API_KEY is not configured" }, 500);
  }

  let payload: { imageBase64?: string } | null = null;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const imageBase64 = payload?.imageBase64?.trim();
  if (!imageBase64) {
    return jsonResponse({ error: "imageBase64 is required" }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const aiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "You are a nutritionist AI. Analyze this food photo and return ONLY valid JSON with keys foodName, estimatedCalories, calorieRange(min,max), confidence(0-100), portionSize.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return jsonResponse({ error: "OpenAI request failed", detail: text }, 502);
    }

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return jsonResponse({ error: "Empty AI response" }, 502);
    }

    const jsonString = extractJsonString(content);
    if (!jsonString) {
      return jsonResponse({ error: "AI response is not valid JSON" }, 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return jsonResponse({ error: "AI response is not valid JSON" }, 502);
    }

    if (!validateResult(parsed)) {
      return jsonResponse({ error: "AI response format invalid" }, 502);
    }

    return jsonResponse({ result: parsed });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return jsonResponse({ error: "OpenAI request timeout" }, 504);
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return jsonResponse({ error: message }, 500);
  } finally {
    clearTimeout(timeout);
  }
});
