/**
 * Client-side fallback handler for Gemini API calls.
 * This is designed to support BOTH the sandboxed/container-hosted Express backend
 * and client-only static hosting environments like Vercel.
 *
 * It tries to hit the local backend first. If that fails or returns non-JSON (like Vercel
 * returning standard HTML fallback for missing backend routes), it executes the Gemini query
 * directly from the browser using standard fetch against Google's public REST endpoint.
 */

import { Recipe } from "../types";

export interface ValidateKeyResponse {
  valid: boolean;
  error?: string;
}

export interface AnalyzeImageResponse {
  ingredients: string[];
  isFallbackMode?: boolean;
  fallbackReason?: string;
}

export interface RecommendedRecipesResponse {
  recipes: Recipe[];
}

/**
 * Validates a Gemini API Key either via backend server or direct browser API call.
 */
export async function validateApiKey(apiKey: string): Promise<ValidateKeyResponse> {
  const trimmedKey = apiKey.trim();
  
  // 1. Try backend API first
  try {
    const res = await fetch("/api/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: trimmedKey }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data.valid === "boolean") {
        return { valid: data.valid };
      }
    } else {
      throw new Error("Backend not available or did not return JSON");
    }
  } catch (err) {
    console.warn("Backend validate API failed, attempting browser direct validation...", err);
  }

  // 2. Fallback: Browser direct API call to Google Generative Language URL
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${trimmedKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond only with the word 'OK'." }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errMsg = errorJson?.error?.message || `Google API Error (Status ${response.status})`;
      return { valid: false, error: errMsg };
    }

    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (textResult.toUpperCase().includes("OK")) {
      return { valid: true };
    }
    return { valid: false, error: "API 키가 올바르지만 정상적인 응답을 받지 못했습니다." };
  } catch (err: any) {
    console.error("Direct browser validation failed:", err);
    return { valid: false, error: err.message || "구글 서버와의 통신에 실패했습니다. 키 형식을 다시 확인해 주세요." };
  }
}

/**
 * Analyzes an image of food/receipt to extract raw ingredients.
 */
export async function analyzeImage(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<AnalyzeImageResponse> {
  // 1. Try local backend
  try {
    const res = await fetch("/api/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ image: base64Data, mimeType }),
    });

    // Verify if it's actual JSON
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && Array.isArray(data.ingredients)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend image analysis failed, attempting direct browser fallback", err);
  }

  // 2. Direct browser REST API call fallback (Vercel)
  try {
    const prompt = `This photo shows the contents of a refrigerator, freezer, pantry shelf, or a supermarket grocery receipt.
Identify all clear, actionable raw ingredients, meat, vegetables, fruits, cheese, eggs, dairy, seasonings, sauces, canned foods, or other food elements that can be cooked.
List them cleanly in a neat array format. Translate them into descriptive, standard Korean ingredient names (e.g. "스팸", "계란", "양배추", "양파"). No explanations or generic headers.`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            ingredients: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "식재료 이름 목록 (예: ['계란', '파', '스팸'])",
            },
          },
          required: ["ingredients"],
        },
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Google API request failed");
    }

    const resJson = await response.json();
    const responseText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(responseText);
    
    return {
      ingredients: parsed.ingredients || [],
    };
  } catch (err: any) {
    console.error("Direct browser image analysis failed:", err);
    // Graceful fallback to guarantee smooth experience during quota / network limits
    return {
      ingredients: ["계란", "대파", "김치", "양배추", "스팸"],
      isFallbackMode: true,
      fallbackReason: err.message || "direct_api_failed",
    };
  }
}

/**
 * Recommends 2-3 custom leftover recipes based on tags and profile.
 */
export async function recommendRecipes(
  ingredients: string[],
  purpose: string,
  note: string,
  apiKey: string
): Promise<RecommendedRecipesResponse> {
  // 1. Try local backend first
  try {
    const res = await fetch("/api/recommend-recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ ingredients, purpose, note }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && Array.isArray(data.recipes)) {
        const formatted = data.recipes.map((r: any) => ({
          ...r,
          id: r.id || "recipe-" + Math.floor(Math.random() * 1000000)
        }));
        return { recipes: formatted };
      }
    }
  } catch (err) {
    console.warn("Backend recipe generation failed, trying direct browser fallback...", err);
  }

  // 2. Direct browser REST API fallback (Vercel)
  try {
    const prompt = `You are custom highly skilled food cooking mentor '파먹이(Pamugi)'.
Based on the available refrigerator leftovers list: [${ingredients.join(", ")}].
The goal/purpose of the meal is: "${purpose || "홈밥"}".
Client note or special health rules/allergies are: "${note || "없음"}".

Please invent exactly 2 to 3 creative, delectable, cost-effective, and highly achievable cooking recipes in Korean that utilize as many given leftovers as possible. Ensure any missing core ingredients are noted but kept extremely minimal and budget-friendly.
Estimate a logical savingsAmount in Korean Won (KRW) representing the grocery budget saved by making this leftovers dish at home instead of newly buying bulk items or eating out (typically between 3000 KRW and 18000 KRW).

Format the output strictly as JSON following the specified schema structure.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recipes: {
              type: "ARRAY",
              description: "Exactly 2 to 3 tailored leftovers cooking recipes in Korean",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "요리 명칭 (예: 스팸 마요 양배추 덮밥)" },
                  description: { type: "STRING", description: "요리에 대한 한 구절의 먹음직스러운 멘토링 설명" },
                  ingredients: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        name: { type: "STRING", description: "재료 이름" },
                        amount: { type: "STRING", description: "분량 (예: 1/2개, 1캔]" },
                        isFromRefrigerator: { type: "BOOLEAN", description: "제공된 냉장고 가용 재료 목록에 속해 있는지 여부" }
                      },
                      required: ["name", "amount", "isFromRefrigerator"]
                    }
                  },
                  steps: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "차례대로 실습해보는 상세한 요리 과정 단계들"
                  },
                  savingsAmount: { type: "INTEGER", description: "해당 요리로 아끼게 된 장보기 비용 또는 외식비 지출 방어 금액" },
                  calorie: { type: "INTEGER", description: "요리 전체 칼로리 수치(kcal)" },
                  macronutrients: {
                    type: "OBJECT",
                    properties: {
                      carbs: { type: "INTEGER" },
                      protein: { type: "INTEGER" },
                      fat: { type: "INTEGER" }
                    },
                    required: ["carbs", "protein", "fat"]
                  },
                  complexity: { type: "STRING", description: "조리 난이도: '상', '중', '하'" },
                  cookingTime: { type: "INTEGER", description: "예상 조리 시간 (분 단위 숫자만)" },
                  tip: { type: "STRING", description: "파먹기 고수의 남은 보관법 또는 요리 꿀팁" }
                },
                required: [
                  "name",
                  "description",
                  "ingredients",
                  "steps",
                  "savingsAmount",
                  "calorie",
                  "macronutrients",
                  "complexity",
                  "cookingTime",
                  "tip"
                ]
              }
            }
          }
        }
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Google API recommendation request failed");
    }

    const resJson = await response.json();
    const responseText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(responseText);

    const mapped = (parsed.recipes || []).map((r: any) => ({
      ...r,
      id: r.id || "recipe-" + Math.floor(Math.random() * 1000000)
    }));

    return {
      recipes: mapped,
    };
  } catch (err) {
    console.error("Direct browser recipe generation failed:", err);
    throw err;
  }
}
