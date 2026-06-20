import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request body parsers to handle Base64 images from clients safely
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for GoogleGenAI SDK to prevent app crash if key is missing on start
let genAIClient: GoogleGenAI | null = null;

function getGenAI(customKey?: string): GoogleGenAI {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Gemini API 키가 입력되지 않았거나 GEMINI_API_KEY 환경변수가 정의되지 않았습니다. AI 가동을 위해 API 키를 올바르게 입력해 주세요."
    );
  }

  // If custom key is specified, always create a fresh dynamic instance to avoid cross-talk
  if (customKey) {
    return new GoogleGenAI({
      apiKey: customKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Endpoint to validate user-entered Gemini API key
 */
app.post("/api/validate-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "Gemini API 키가 입력되지 않았습니다." });
    }
    
    // Instantiate test GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Make a minimal model test request to verify viability
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Respond only with the word 'OK'.",
    });

    if (response && response.text) {
      return res.json({ valid: true });
    } else {
      return res.status(400).json({ error: "API 키가 올바르지 않거나 응답을 받지 못했습니다." });
    }
  } catch (err: any) {
    console.error("Gemini API key validation failed:", err);
    res.status(400).json({ error: err.message || "유효하지 않은 Gemini API Key이거나 네트워크 에러입니다." });
  }
});

/**
 * Endpoint to analyze refrigerator photo or grocery receipt
 */
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "이미지 데이터 또는 MIME 타입이 누락되었습니다." });
    }

    const customKey = req.headers["x-gemini-api-key"] as string;
    const ai = getGenAI(customKey);
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    const prompt = `This photo shows the contents of a refrigerator, freezer, pantry shelf, or a supermarket grocery receipt.
Identify all clear, actionable raw ingredients, meat, vegetables, fruits, cheese, eggs, dairy, seasonings, sauces, canned foods, or other food elements that can be cooked.
List them cleanly in a neat array format. Translate them into descriptive, standard Korean ingredient names (e.g. "스팸", "계란", "양배추", "양파"). No explanations or generic headers.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "식재료 이름 목록 (예: ['계란', '파', '스햄'])",
            },
          },
          required: ["ingredients"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ ingredients: parsedData.ingredients || [] });
  } catch (err: any) {
    console.error("Image analysis failed:", err);
    const errStr = (err.message || "").toLowerCase();
    const isRateLimit = errStr.includes("quota") || errStr.includes("exhausted") || errStr.includes("429") || errStr.includes("limit") || err.status === 429;
    if (isRateLimit) {
      console.warn("Gemini Image analysis rate limit/quota. Serving default ingredients.");
      return res.json({
        ingredients: ["계란", "대파", "김치", "양배추", "스팸"],
        isFallbackMode: true,
        fallbackReason: "quota_exceeded"
      });
    }
    res.status(500).json({ error: err.message || "이미지 분석 과정 중 오류가 생겼습니다." });
  }
});

// Simple in-memory cache for recipes
const recipeCache = new Map<string, any>();

/**
 * Generate smart Korean cookbooks when API server is hit with quota limits
 */
function generateLocalFallbackRecipes(ingredients: string[], purpose: string, note: string): any[] {
  const normIngredients = ingredients.map(i => i.trim());
  const hasIn = (kw: string) => normIngredients.some(i => i.includes(kw));

  const recipes = [];

  // Recipe 1: 파볶음밥 / 스팸볶음밥
  if (hasIn("스팸") || hasIn("햄") || hasIn("밥") || hasIn("계란") || hasIn("달걀") || !hasIn("김치")) {
    recipes.push({
      id: "fallback-rice-" + Math.floor(Math.random() * 100000),
      name: hasIn("스팸") ? "초간단 스팸 소복 계란볶음밥" : "식비 수호 파기름 야채볶음밥",
      description: "남은 야채와 고슬고슬한 밥에 노릇향긋한 대파 기름 향을 가득 입혀 5분 만에 푸짐하게 차려내는 구원 가성비 일품 요리! 🍳",
      ingredients: [
        { name: "찬밥", amount: "1.5공기", isFromRefrigerator: hasIn("밥") || hasIn("햇반") },
        { name: "달걀", amount: "2개", isFromRefrigerator: hasIn("계란") || hasIn("달걀") },
        { name: "대파", amount: "1/2대", isFromRefrigerator: hasIn("파") || hasIn("대파") },
        { name: hasIn("스팸") ? "스팸" : "스팸 또는 자투리 야채", amount: "50g", isFromRefrigerator: hasIn("스팸") || hasIn("마늘") || hasIn("당근") },
        { name: "굴소스 또는 진간장", amount: "1큰술", isFromRefrigerator: false },
        { name: "참기름", amount: "1작은술", isFromRefrigerator: false }
      ],
      steps: [
        "쪽파나 대파는 송송 썰어 준비하고 햄이나 남은 야채는 잘게 사각으로 다집니다.",
        "식용유 2큰술을 두른 팬에 먼저 대파를 가득 볶아 향기로운 파기름을 서서히 우려냅니다.",
        "다진 햄이나 고기, 야채를 우려낸 파기름에 넣고 달달 노릇해질 때까지 같이 한차례 볶습니다.",
        "볶은 재료를 구석으로 밀어낸 빈 공간에 달걀을 풀고 숟가락으로 마구 저어 부드러운 스크램블을 만듭니다.",
        "불을 줄이고 준비해 둔 한김 식힌 밥과 굴소스를 넣고 주걱을 세우듯이 밥알을 솔솔 가르며 골고루 볶습니다.",
        "참기름 한 바울과 깨를 살짝 솔솔 뿌려 담백하고 깊은 불맛 계란볶음밥을 세팅합니다."
      ],
      savingsAmount: 9500,
      calorie: 460,
      macronutrients: { carbs: 65, protein: 14, fat: 12 },
      complexity: "하",
      cookingTime: 10,
      tip: "식은밥을 볶기 직전에 전자레인지에 가볍게 30초만 돌려서 눅눅함을 기화시켜 주면 밥알 알알이 살아나며 최고로 고슬고슬한 중식 볶음밥이 연출됩니다!"
    });
  }

  // Recipe 2: 김치짜글이 / 제육
  if (hasIn("김치") || hasIn("돼지") || hasIn("삼겹살") || hasIn("고기") || recipes.length < 2) {
    recipes.push({
      id: "fallback-kimchi-" + Math.floor(Math.random() * 100000),
      name: hasIn("돼지") || hasIn("고기") ? "냉장고 구원 맛깔 제육짜글이" : "지갑수호 초밀착 김치볶음짜글이",
      description: "어느 집에나 있는 묵은 김치와 냉장고 가용 야채를 매콤달콤 양념으로 바짝 조려내 밥도둑을 자처하는 냉장 방어 시그니처! 🍲",
      ingredients: [
        { name: "신김치 또는 묵은지", amount: "1.5컵", isFromRefrigerator: hasIn("김치") || hasIn("배추김치") },
        { name: hasIn("돼지") || hasIn("고기") ? "돼지고기" : "참치캔 또는 오뎅", amount: "120g", isFromRefrigerator: hasIn("돼지") || hasIn("고기") || hasIn("참치") },
        { name: "양파", amount: "1/2개", isFromRefrigerator: hasIn("양파") },
        { name: "대파", amount: "1/4대", isFromRefrigerator: hasIn("파") || hasIn("대파") },
        { name: "고추장 & 고춧가루", amount: "각 1.5큰술", isFromRefrigerator: false },
        { name: "올리고당 또는 설탕", amount: "1/2작은술", isFromRefrigerator: false }
      ],
      steps: [
        "김치와 어묵, 혹은 냉장실 고기를 숟가락으로 떠먹기 편하게 1.5cm 자잘한 크기로 등분합니다.",
        "가열된 냄비 바닥에 고기 또는 참치캔 기름을 넣고 썰어둔 김치, 설탕을 더해 고소하게 3분 동안 볶습니다.",
        "김치가 숨이 폭 죽어 반투명해지면 자작하게 쌀뜨물 또는 생수 1.5컵(300ml)을 조심스레 채웁니다.",
        "얼큰 매콤한 고추장, 고춧가루, 진간장 1큰술씩을 풀어 넣고 채 썬 양파와 함께 중불에서 자글자글 졸입니다.",
        "국물이 거의 절반 이하로 자작자작하게 졸아 감칠맛이 응축되면 파를 뿌려 얼큰하고 든든하게 마무리합니다."
      ],
      savingsAmount: 12000,
      calorie: 390,
      macronutrients: { carbs: 24, protein: 18, fat: 22 },
      complexity: "중",
      cookingTime: 15,
      tip: "신김치의 톡 쏘는 강렬한 산미를 제어하려면 식초나 조미료 대신 '설탕 한 꼬집'을 기름에 볶을 때 올려주세요. 신맛이 신기하게 잡히며 사먹는 찌개 맛이 납니다!"
    });
  }

  // Recipe 3: 보들 버섯두부계란국 / 계란찜
  if (recipes.length < 3) {
    recipes.push({
      id: "fallback-soup-" + Math.floor(Math.random() * 100000),
      name: hasIn("두부") || hasIn("야채") ? "포근몽글 겨울 야채두부달걀국" : "식비 절약의 전설 보들푸딩 전자레인지 계란찜",
      description: "속을 뜨끈하고 부드럽게 감싸안고, 지갑도 영양도 꽉 지키는 파먹이만의 초스피드 레시피 웰빙 푸드! ⭐",
      ingredients: [
        { name: "달걀", amount: "3개", isFromRefrigerator: hasIn("계란") || hasIn("달걀") },
        { name: "두부", amount: "1/3팩", isFromRefrigerator: hasIn("두부") },
        { name: "대파", amount: "약간", isFromRefrigerator: hasIn("파") || hasIn("대파") },
        { name: "당근", amount: "1/8개", isFromRefrigerator: hasIn("당근") },
        { name: "참기름 & 소금", amount: "1작은술", isFromRefrigerator: false }
      ],
      steps: [
        "대접에 신선한 달걀 3개를 통째로 깨뜨리고 물 50ml, 소금 2꼬집을 넣고 곱게 휘저어 달걀물을 만듭니다.",
        "두부는 수분을 빼낸 뒤 칼등으로 자잘하게 으깨고, 파와 자투리 당근은 기분 좋게 쫑쫑 송송 매우 고운 입자로 다져줍니다.",
        "전자레인지용 전용 용기에 달걀 가득한 베이스를 잘 부어주고 다진 당근과 으깬 두부를 한데 모아 가볍게 저어 섞습니다.",
        "수분이 날아가지 않도록 랩을 살짝 씌운 채 작은 구멍을 3개 내주고 전자레인지에 먼저 2분간 작동시킵니다.",
        "꺼내어 전체적으로 숟가락으로 가운데 부분까지 싹 뒤섞고, 위에 곱게 다진 대파와 고소한 참기름을 살포시 더해 얹습니다.",
        "다시 전자레인지에 조심히 넣고 마지막 2분간 회전시켜 꺼내면 푸딩처럼 입안에서 녹는 보들보들 건강 계란찜이 등장합니다!"
      ],
      savingsAmount: 7000,
      calorie: 180,
      macronutrients: { carbs: 6, protein: 12, fat: 8 },
      complexity: "하",
      cookingTime: 8,
      tip: "완성하기 직전에 시중에 누구나 가진 국간장이나 시판 참치액젓 반 스푼만 살짝 배합해주면 풍미가 순식간에 살아오릅니다!"
    });
  }

  return recipes;
}

/**
 * Endpoint to generate recipe recommendation
 */
app.post("/api/recommend-recipes", async (req, res) => {
  const { ingredients, purpose, note } = req.body;
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: "음식을 구상하기 위한 냉장고 식재료가 최소 1개 이상 필요합니다." });
  }

  // Check in-memory cache to save time and API quota
  const sortedIngredients = [...ingredients].map(i => i.trim().toLowerCase()).sort();
  const cacheKey = JSON.stringify({
    ingredients: sortedIngredients,
    purpose: (purpose || "").trim().toLowerCase(),
    note: (note || "").trim().toLowerCase(),
  });

  if (recipeCache.has(cacheKey)) {
    console.log("Serving recipe recommendation from server-side cache!");
    return res.json(recipeCache.get(cacheKey));
  }

  try {
    const customKey = req.headers["x-gemini-api-key"] as string;
    const ai = getGenAI(customKey);

    const prompt = `You are custom highly skilled food cooking mentor '파먹이(Pamugi)'.
Based on the available refrigerator leftovers list: [${ingredients.join(", ")}].
The goal/purpose of the meal is: "${purpose || "홈밥"}".
Client note or special health rules/allergies are: "${note || "없음"}".

Please invent exactly 2 to 3 creative, delectable, cost-effective, and highly achievable cooking recipes in Korean that utilize as many given leftovers as possible. Ensure any missing core ingredients are noted but kept extremely minimal and budget-friendly.
Estimate an logical savingsAmount in Korean Won (KRW) representing the grocery budget saved by making this leftovers dish at home instead of newly buying bulk items or eating out (typically between 3,000 KRW and 18,000 KRW).

Format the output strictly as JSON following the specified schema structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature makes generation faster and highly structured
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              description: "Exactly 2 to 3 tailored leftovers cooking recipes in Korean",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "요리 명칭 (예: 스팸 마요 양배추 덮밥)" },
                  description: { type: Type.STRING, description: "요리에 대한 한 구절의 먹음직스러운 멘토링 설명" },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "재료 이름" },
                        amount: { type: Type.STRING, description: "분량 (예: 1/2개, 1캔, 1큰술, 약간)" },
                        isFromRefrigerator: {
                          type: Type.BOOLEAN,
                          description: "제공된 냉장고 가용 재료 목록에 속해 있는지 여부",
                        },
                      },
                      required: ["name", "amount", "isFromRefrigerator"],
                    },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "차례대로 실습해보는 상세한 요리 과정 단계들",
                  },
                  savingsAmount: {
                    type: Type.INTEGER,
                    description: "해당 요리로 아끼게 된 장보기 비용 또는 외식비 지출 방어 금액 (예: 5000 ~ 15000원)",
                  },
                  calorie: { type: Type.INTEGER, description: "요리 전체 칼로리 수치(kcal)" },
                  macronutrients: {
                    type: Type.OBJECT,
                    properties: {
                      carbs: { type: Type.INTEGER, description: "탄수화물 (g 단위 정수)" },
                      protein: { type: Type.INTEGER, description: "단백질 (g 단위 정수)" },
                      fat: { type: Type.INTEGER, description: "지방 (g 단위 정수)" },
                    },
                    required: ["carbs", "protein", "fat"],
                  },
                  complexity: { type: Type.STRING, description: "조리 난이도: '상', '중', '하' 중 1개 선택" },
                  cookingTime: { type: Type.INTEGER, description: "예상 조리 시간 (분 단위 숫자만)" },
                  tip: { type: Type.STRING, description: "파먹기 고수의 남은 보관법 또는 요리 꿀팁" },
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
                  "tip",
                ],
              },
            },
          },
          required: ["recipes"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    const result = { recipes: parsedData.recipes || [] };

    // Save success response to cache
    recipeCache.set(cacheKey, result);

    res.json(result);
  } catch (err: any) {
    console.error("Recipe lookup failed:", err);
    const errStr = (err.message || "").toLowerCase();
    const isRateLimit = errStr.includes("quota") || errStr.includes("exhausted") || errStr.includes("429") || errStr.includes("limit") || err.status === 429;
    
    if (isRateLimit) {
      console.warn("Gemini API rate limit or quota exceeded. Serving smart local fallback recipes.");
      const fallbackResult = generateLocalFallbackRecipes(ingredients, purpose, note);
      const result = {
        recipes: fallbackResult,
        isFallbackMode: true,
        fallbackReason: "quota_exceeded"
      };
      return res.json(result);
    }
    res.status(500).json({ error: err.message || "추천 레시피 생성 과정 중 오류가 발생했습니다." });
  }
});

// Configure Vite middleware / production serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
