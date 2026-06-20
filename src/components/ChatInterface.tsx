import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Camera,
  Sparkles,
  Send,
  RefreshCcw,
  Check,
  ChevronRight,
  User,
  Heart,
  HelpCircle,
  TrendingDown,
} from "lucide-react";
import { ChatMessage, Recipe } from "../types";
import { fileToBase64 } from "../utils";
import pamugiMascot from "../assets/images/pamugi_mascot_1781926745171.jpg";
import { analyzeImage, recommendRecipes } from "../utils/geminiClient";

interface ChatInterfaceProps {
  onRecipesFound: (
    recipes: Recipe[],
    ingredientsUsed: string[],
    purpose: string,
    note: string,
    isFallbackMode?: boolean
  ) => void;
  savedNickname: string;
  setSavedNickname: (name: string) => void;
}

type ChatStep = "name" | "purpose" | "targetNote" | "ingredients";

const FREQUENT_INGREDIENTS = [
  { name: "감자", emoji: "🥔" },
  { name: "계란", emoji: "🥚" },
  { name: "당근", emoji: "🥕" },
  { name: "밥", emoji: "🍚" },
  { name: "양파", emoji: "🧅" },
  { name: "대파", emoji: "🌱" },
  { name: "마늘", emoji: "🧄" },
  { name: "두부", emoji: "⬜" },
  { name: "스팸", emoji: "🥫" },
  { name: "김치", emoji: "🥬" },
  { name: "돼지고기", emoji: "🥩" },
  { name: "닭가슴살", emoji: "🍗" },
  { name: "라면", emoji: "🍜" },
];

const getIngredientEmoji = (name: string): string => {
  const emojiMap: Record<string, string> = {
    감자: "🥔", 계란: "🥚", 달걀: "🥚", 당근: "🥕", 밥: "🍚", 양파: "🧅", 대파: "🌱",
    마늘: "🧄", 두부: "⬜", 스팸: "🥫", 김치: "🥬", 돼지고기: "🥩", 소고기: "🥩",
    닭고기: "🍗", 닭가슴살: "🍗", 라면: "🍜", 버섯: "🍄", 양배추: "🥬", 치즈: "🧀",
    참치: "🐟", 만두: "🥟", 식빵: "🍞", 파: "🌱", 고추: "🌶️", 오이: "🥒", 호박: "🎃",
    가지: "🍆", 브로콜리: "🥦", 사과: "🍎", 우유: "🥛", 버터: "🧈", 베이컨: "🥓",
    소시지: "🌭", 새우: "🍤", 오징어: "🦑", 조개: "🐚", 미역: "🌱", 국수: "🍜",
    파스타: "🍝", 카레: "🍛", 햄: "🍖", 어묵: "🍢", 토마토: "🍅"
  };
  for (const key of Object.keys(emojiMap)) {
    if (name.toLowerCase().includes(key)) return emojiMap[key];
  }
  return "🥦";
};

export default function ChatInterface({
  onRecipesFound,
  savedNickname,
  setSavedNickname,
}: ChatInterfaceProps) {
  const [currentStep, setCurrentStep] = useState<ChatStep>(savedNickname ? "purpose" : "name");
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (savedNickname) {
      return [
        {
          id: "init",
          sender: "mentor",
          text: `안녕하세요, ${savedNickname}님! 멘토 '파먹이'와 함께 냉장고 속 잠자는 식재료들을 멋지게 변신시켜 볼까요? 🍽️ 오늘의 알뜰 장보기 절약 액수를 끌어내 보세요!`,
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        {
          id: "init-2",
          sender: "mentor",
          text: "먼저, 오늘 어떤 요리를 만들고 싶으신지 아래 항목에서 식사 목적을 골라주세요!",
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "options",
        },
      ];
    } else {
      return [
        {
          id: "greeting",
          sender: "mentor",
          text: "반갑습니다! 🙌 냉장고 속 버려지는 식재료들을 알뜰하게 구출하고, 가계부 지출을 야무지게 방어하도록 도와드릴 AI 요리 멘토 '파먹이(Pamugi)'입니다.",
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        {
          id: "ask-name",
          sender: "mentor",
          text: "지출 절약 여정을 함께 가꿔갈 파트너님을 어떻게 불러드리면 좋을까요? 별명이나 멋진 성함을 입력해 주세요! 😊",
          timestamp: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ];
    }
  });

  // Collected criteria
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [targetNote, setTargetNote] = useState("");
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);

  // Persistent essential ingredients list state
  const [frequentIngredients, setFrequentIngredients] = useState<{ name: string; emoji: string }[]>(() => {
    try {
      const saved = localStorage.getItem("pameoki_frequent_ingredients");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return FREQUENT_INGREDIENTS;
  });
  const [isEditModeEssentials, setIsEditModeEssentials] = useState(false);

  // States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [genStatusMessage, setGenStatusMessage] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [errorText, setErrorText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isUploading]);

  const addMessage = (
    sender: "mentor" | "user",
    text: string,
    type: "text" | "options" | "upload" = "text"
  ) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // 1. Submit Name
  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = inputVal.trim();
    if (!name) return;

    setSavedNickname(name);
    addMessage("user", name);
    setInputVal("");

    setTimeout(() => {
      addMessage("mentor", `반갑습니다, ${name}님! 정말 부르기 좋고 아름다운 닉네임이네요! ✨`);
      addMessage(
        "mentor",
        "자, 그럼 오늘 만드실 요리의 주된 쓰임새와 드시는 목적을 골라주세요! 아래 옵션에서 직접 선택해 주세요.",
        "options"
      );
      setCurrentStep("purpose");
    }, 600);
  };

  // 2. Select Purpose
  const handlePurposeSelect = (purpose: string) => {
    setSelectedPurpose(purpose);
    addMessage("user", `${purpose} 요리 구상 🍽️`);

    setTimeout(() => {
      addMessage(
        "mentor",
        "훌륭한 선택입니다! 식단 작성을 도와 드리기 전에 가짜 음식, 특정 알레르기(알레젠), 매운 강도 조절, 혹은 다이어트/건강 제한 요구사항 등이 있으신가요? (특별히 주의할 점이 없으시다면 '없음'을 기재해 주세요.)"
      );
      setCurrentStep("targetNote");
    }, 600);
  };

  // 3. Submit Target Note
  const handleTargetNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const note = inputVal.trim() || "없음";
    setTargetNote(note);
    addMessage("user", note === "없음" ? "특별히 까다로운 특이사항 없어요!" : `주의사항: ${note}`);
    setInputVal("");

    setTimeout(() => {
      addMessage(
        "mentor",
        "맞춤형 안심 식단을 준비하기 위해 해당 주의사항을 잘 숙지했습니다! 이제 냉장고 속에 남아있는 소중한 재료들을 구출할 준비 완료! 📸 냉장고 속 식재료 사진을 업로드하시거나 혹은 텍스트로 적어주시면 '파먹이' 요리사들의 인지 시스템이 시작됩니다.",
        "upload"
      );
      setCurrentStep("ingredients");
    }, 600);
  };

  // 4. Analyze refrigeration image
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress("이미지를 고화질로 스캐닝 및 준비 중...");
    setErrorText("");

    try {
      const base64Data = await fileToBase64(file);
      setUploadProgress("AI가 냉장고 속 식재료나 영수증 물품 분석 중인 것 아시죠? 🔍");

      const apiKey = localStorage.getItem("pamugi_gemini_api_key") || "";
      const data = await analyzeImage(base64Data, file.type, apiKey);
      const detected = data.ingredients || [];

      if (detected.length === 0) {
        addMessage(
          "mentor",
          "사진에서 유효한 조리 재료를 찾지 못했어요 😢 아래 수동 추가 창에서 텍스트로 편리하게 직접 지정해 주세요!"
        );
      } else {
        const newTags = Array.from(new Set([...ingredientTags, ...detected]));
        setIngredientTags(newTags);
        if (data.isFallbackMode) {
          addMessage(
            "mentor",
            "앗! 요리 비법실(AI 이미지 분석기) 요청량이 아주 많아 파먹이 수동 엔진을 대신 가동했어요! 💚 냉장고 5층 석탑 필수 단골 식재료(계란, 대파, 김치, 양배추, 스팸)를 우선 감지해드렸으니 요리하고 싶으신 다른 재미난 재료가 있다면 텍스트로도 마음껏 추가해보세요!"
          );
        } else {
          addMessage(
            "mentor",
            `📸 이미지 분석 결과, 다음의 요긴한 재료들을 감지 및 확보하였습니다: ${detected.join(
              ", "
            )}`
          );
          addMessage(
            "mentor",
            "여기서 더 필요한 소스 양념이나 깜빡한 다른 재료들이 있다면 하단의 태그 Composer를 통해 편하게 정정하신 뒤, [알뜰 레시피 뚝딱 추천받기] 버튼을 작동해 주세요!"
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "이미지 분석 전송 오류입니다. 수동 추가 기능을 이용해 보세요!");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setIngredientTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTagInput.trim();
    if (!tag) return;

    // Support comma separated split
    const parts = tag
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    setIngredientTags((prev) => Array.from(new Set([...prev, ...parts])));
    setCustomTagInput("");
  };

  const handleSaveAsFrequent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = customTagInput.trim();
    if (!tag) return;

    const parts = tag
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    // Add to current ingredient tags as well
    setIngredientTags((prev) => Array.from(new Set([...prev, ...parts])));

    // Add to frequent ingredients list
    setFrequentIngredients((prev) => {
      const updated = [...prev];
      parts.forEach((p) => {
        if (!updated.some((item) => item.name === p)) {
          updated.push({ name: p, emoji: getIngredientEmoji(p) });
        }
      });
      localStorage.setItem("pameoki_frequent_ingredients", JSON.stringify(updated));
      return updated;
    });

    setCustomTagInput("");
  };

  const handleRemoveFromFrequent = (nameToRemove: string) => {
    setFrequentIngredients((prev) => {
      const updated = prev.filter((item) => item.name !== nameToRemove);
      localStorage.setItem("pameoki_frequent_ingredients", JSON.stringify(updated));
      return updated;
    });
  };

  const handleIngredientsTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;

    const parts = text
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      setIngredientTags((prev) => Array.from(new Set([...prev, ...parts])));
      addMessage("user", `추가된 구출 재료: ${parts.join(", ")}`);
      addMessage(
        "mentor",
        `냉장고 보관함에 [${parts.join(", ")}]을(를) 깔끔하게 세팅해 두었습니다! 🥬`
      );
    }
    setInputVal("");
  };

  const triggerRecipeConsultation = async () => {
    if (ingredientTags.length === 0) {
      setErrorText("요리를 매칭하려면 냉장고에 남은 식재료를 최소 1개 이상 올려주세요!");
      return;
    }

    setIsGeneratingRecipes(true);
    setGenStatusMessage("요리 멘토 파먹이가 식비를 최대로 방어하며 맛도 보장하는 레시피 구성 중...");
    setErrorText("");

    try {
      const apiKey = localStorage.getItem("pamugi_gemini_api_key") || "";
      const data = await recommendRecipes(ingredientTags, selectedPurpose, targetNote, apiKey);
      const recipes = data.recipes || [];
      if (recipes.length === 0) {
        throw new Error("AI 요리사가 적당한 조합의 요리를 조율하지 못했습니다. 재료를 조금 조정하고 시도해 주세요!");
      }
      onRecipesFound(recipes, ingredientTags, selectedPurpose, targetNote, false);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "서버 통신 중 장애가 생겼습니다. 재시도해 주세요.");
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const formatFriendlyErrorMessage = (errorStr: string): string => {
    if (!errorStr) return "";
    try {
      if (errorStr.trim().startsWith("{")) {
        const parsed = JSON.parse(errorStr);
        if (parsed.error && parsed.error.message) {
          errorStr = parsed.error.message;
        } else if (parsed.error) {
          errorStr = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
        }
      }
    } catch {
      // ignore
    }

    const cleanLower = errorStr.toLowerCase();

    if (
      cleanLower.includes("quota") ||
      cleanLower.includes("exhausted") ||
      cleanLower.includes("rate") ||
      cleanLower.includes("429") ||
      cleanLower.includes("limit")
    ) {
      return "앗! 현재 파먹이 AI 멘토 서브 가동 요청이 폭증하여 키친이 매우 붐비고 있습니다. 🍲 수동으로 식재료 추가 후 가계부를 사용해 주시거나 잠시 후 재시도 바랍니다. 💚";
    }

    if (cleanLower.includes("api key") || cleanLower.includes("api_key") || cleanLower.includes("invalid key")) {
      return "요리 멘토 비법 열쇠(API Key) 인증에 보수가 완료되지 않았습니다. 관리자 키를 새로 등록하면 정상 가동됩니다! 🔑";
    }

    return errorStr;
  };

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-tr-[40px] rounded-bl-[40px] rounded-tl-[16px] rounded-br-[16px] border border-white/60 shadow-lg overflow-hidden flex flex-col h-[600px] relative font-sans">
      {/* Mentor Welcome Banner */}
      <div className="bg-white/50 backdrop-blur-sm px-5 py-4 border-b border-white/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-white/80 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img
              src={pamugiMascot}
              alt="파먹이"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="font-bold text-[#2D3120] text-sm md:text-base flex items-center gap-1">
              AI 식비 절감 멘토 <span className="text-[#BC6C4D]">파먹이 🥬</span>
            </h3>
            <p className="text-[10px] text-[#5C6346] font-medium leading-tight uppercase tracking-wider">
              Life-Saving Recipe Curator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-full border border-white/80 text-[10px] text-[#BC6C4D] font-bold shadow-3xs">
          <TrendingDown className="w-3.5 h-3.5 text-[#BC6C4D]" />
          지출 방어율 분석
        </div>
      </div>

      {/* Messages Box Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3.5 max-w-[85%] ${
              msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {msg.sender === "mentor" && (
              <div className="w-8 h-8 rounded-full bg-white border border-white/80 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                <img
                  src={pamugiMascot}
                  alt="파먹이"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="space-y-1">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#5C6346] text-white rounded-tr-none shadow-md border border-[#5C6346]"
                    : "bg-white/75 backdrop-blur-sm text-[#2D3120] border border-white rounded-tl-none shadow-xs font-semibold"
                }`}
              >
                {msg.text}

                {/* Sub Options in Greeting Flow */}
                {msg.type === "options" && currentStep === "purpose" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      { l: "가정식 집밥 🏠", v: "가정식 집밥" },
                      { l: "실속형 도시락 🍱", v: "도시락" },
                      { l: "든든 유아식 👶", v: "유아식" },
                      { l: "초간단 홈간식 🍪", v: "간식" },
                      { l: "심야 야식 🌌", v: "야식" },
                      { l: "지인 대접요리 💝", v: "지인 대접요리" },
                    ].map((item) => (
                      <button
                        key={item.v}
                        type="button"
                        onClick={() => handlePurposeSelect(item.v)}
                        className="px-3 py-2 bg-white/80 hover:bg-white border border-white/80 text-[#2D3120] rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 text-left cursor-pointer"
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[9px] text-stone-400 font-mono text-right">{msg.timestamp}</p>
            </div>
          </motion.div>
        ))}

        {/* Dynamic Image Uploading Visual Loader */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mr-auto max-w-[80%]"
          >
            <div className="w-8 h-8 rounded-full bg-white/80 border border-white shadow-3xs flex items-center justify-center shrink-0">
              <RefreshCcw className="w-4 h-4 text-[#5C6346] animate-spin" />
            </div>
            <div className="bg-white/80 backdrop-blur-xs border border-white rounded-2xl px-4 py-2.5 text-xs text-[#2D3120] shadow-xs">
              <p className="font-semibold flex items-center gap-1.5 animate-pulse text-[#BC6C4D]">
                <span>📸</span> {uploadProgress}
              </p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Ingredient Tag Management Center - Sticky above input box on ingredients step */}
      {currentStep === "ingredients" && (
        <div className="p-4 bg-white/20 border-t border-white/40 max-h-[300px] overflow-y-auto shrink-0 z-10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#2D3120] flex items-center gap-1 uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-[#BC6C4D] fill-[#BC6C4D]" />
              구출할 나의 냉장고 재료 태그 ({ingredientTags.length})
            </h4>
            <span className="text-[10px] text-[#5C6346] font-bold">클릭 시 즉시 제외</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {ingredientTags.length === 0 ? (
              <span className="text-[11px] text-stone-500 italic py-2 px-3 bg-white/60 block rounded-xl border border-dashed border-[#5C6346]/20 w-full text-center">
                보관 중인 야채, 고기, 양념을 사진 전송이나 텍스트로 보강해 주세요!
              </span>
            ) : (
              ingredientTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-white border border-[#E9EBD8] text-[#4E4A42] text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="w-3.5 h-3.5 rounded-full bg-[#E9EBD8] hover:bg-neutral-300 flex items-center justify-center text-[#4E4A42] font-semibold transition-all text-[9px] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Quick-add frequently used ingredients section */}
          <div className="mb-3.5 p-2.5 bg-white/50 rounded-2xl border border-white/80">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[10px] font-black text-[#5C6346] block">
                ⭐ 한 번의 간편 클릭으로 냉장고 필수 재료 추가/제거
              </span>
              <button
                type="button"
                onClick={() => setIsEditModeEssentials(!isEditModeEssentials)}
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border transition-all cursor-pointer ${
                  isEditModeEssentials
                    ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                    : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                }`}
              >
                {isEditModeEssentials ? "✅ 편집 완료" : "✏️ 필수목록 편집"}
              </button>
            </div>

            {isEditModeEssentials && (
              <div className="text-[9px] text-[#5C6346] space-y-1 mb-2 bg-[#F5F7EC]/90 p-2 rounded-xl border border-[#E0E6C5] font-semibold">
                <p className="font-extrabold text-[#BC6C4D] flex items-center gap-1">💡 필수재료 추가/제거 방법:</p>
                <p>• <strong className="text-stone-800">제거:</strong> 아래 자주 쓰던 재료 중 삭제할 재료를 클릭하면 영구적으로 제외됩니다.</p>
                <p>• <strong className="text-stone-800">등록/추가:</strong> 아래 직접 입력창에 재료(예: 김치, 참치)를 적고 <strong className="text-[#BC6C4D]">[⭐ 필수등록]</strong> 단추를 터치하면 목록에 저장되어 평생 재활용 가능합니다!</p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
              {frequentIngredients.map((item) => {
                const isActive = ingredientTags.includes(item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      if (isEditModeEssentials) {
                        handleRemoveFromFrequent(item.name);
                      } else {
                        if (isActive) {
                          handleRemoveTag(item.name);
                        } else {
                          setIngredientTags((prev) => Array.from(new Set([...prev, item.name])));
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold duration-150 transition-all select-none cursor-pointer border ${
                      isEditModeEssentials
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80 hover:scale-95"
                        : isActive
                        ? "bg-[#5C6346] text-white border-[#5C6346] shadow-3xs"
                        : "bg-white/85 text-[#4E4A42] border-stone-200/90 hover:bg-stone-50"
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.name}</span>
                    {isEditModeEssentials ? (
                      <span className="text-[10px] text-rose-500 ml-0.5">×</span>
                    ) : (
                      isActive && <Check className="w-2.5 h-2.5 ml-0.5" />
                    )}
                  </button>
                );
              })}
              {frequentIngredients.length === 0 && (
                <p className="text-[10px] text-stone-500 italic py-1 text-center w-full">
                  필수 재료 목록이 비어있어요. 아래에서 새로 등록해 보세요! 👇
                </p>
              )}
            </div>
          </div>

          {/* Tag Quick Adder Input with both single add & save-as-frequent add buttons */}
          <div className="space-y-1.5">
            <form onSubmit={handleAddCustomTag} className="flex gap-1.5">
              <input
                type="text"
                placeholder="직접 재료 입력 (예: 마늘, 스팸)"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                className="flex-1 px-3.5 py-1.5 bg-white text-xs border border-neutral-200 rounded-full focus:outline-none focus:ring-1 focus:ring-[#5C6346] text-stone-700 font-medium shadow-3xs"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm active:scale-95"
                title="이번 요리 재료에만 임시 추가"
              >
                <Plus className="w-3.5 h-3.5" /> 추가
              </button>
              <button
                type="button"
                onClick={() => handleSaveAsFrequent()}
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 bg-[#BC6C4D] hover:bg-[#a0593c] disabled:opacity-40 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm active:scale-95"
                title="자주 쓰는 필수 재료 목록에 영구 추가"
              >
                <Heart className="w-3.5 h-3.5 fill-current" /> ⭐ 필수등록
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Error notification */}
      {errorText && (
        <div className="mx-4 my-2 px-3 py-2 bg-rose-50/80 backdrop-blur-xs border border-rose-100 rounded-xl text-xs text-rose-800 font-medium shadow-3xs flex items-center gap-1.5">
          <span className="shrink-0 bg-rose-100 text-rose-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
            !
          </span>
          <p className="flex-1 leading-relaxed">{formatFriendlyErrorMessage(errorText)}</p>
        </div>
      )}

      {/* Interactive Chat Input Area */}
      <div className="p-3 border-t border-white/40 bg-white/30 backdrop-blur-xs shrink-0">
        {currentStep === "ingredients" ? (
          /* Ingredient submission block with picture upload and recommend trigger */
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              {/* Photo Upload Anchor */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                disabled={isUploading || isGeneratingRecipes}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isGeneratingRecipes}
                className="flex items-center justify-center gap-1.5 bg-white/70 hover:bg-white text-[#2D3120] border border-white/90 px-4 py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 cursor-pointer text-center shadow-3xs shrink-0"
              >
                <Camera className="w-4 h-4 text-[#5C6346]" />
                <span className="hidden sm:inline">사진/영수증 촬영</span>
                <span className="sm:hidden">사진 등록</span>
              </button>

              {/* Sequential comma input as fallback */}
              <form onSubmit={handleIngredientsTextSubmit} className="flex-1 flex gap-1.5">
                <input
                  type="text"
                  placeholder="텍스트 입력 (쉼표 구분)..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isUploading || isGeneratingRecipes}
                  className="flex-1 px-4 py-2.5 bg-white/70 border border-white/90 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#5C6346] text-stone-800 font-semibold shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isUploading || isGeneratingRecipes}
                  className="bg-[#5C6346] hover:bg-[#4A5135] disabled:bg-stone-200 text-white p-2.5 rounded-full transition-all cursor-pointer shadow-3xs disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Direct Recommendation Trigger Button */}
            <button
              type="button"
              onClick={triggerRecipeConsultation}
              disabled={ingredientTags.length === 0 || isUploading || isGeneratingRecipes}
              className="w-full bg-[#BC6C4D] hover:bg-[#A85B3C] text-white font-bold py-3.5 px-5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="w-4.5 h-4.5 text-amber-200 animate-pulse" />
              <span>오늘의 고효율 파먹마 기 레시피 추천받기 뚝딱</span>
              <ChevronRight className="w-4.5 h-4.5 animate-bounce" />
            </button>
          </div>
        ) : (
          /* Normal text chat submission */
          <form
            onSubmit={(e) => {
              if (currentStep === "name") handleNameSubmit(e);
              if (currentStep === "targetNote") handleTargetNoteSubmit(e);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              required
              placeholder={
                currentStep === "name"
                  ? "예: 알뜰집밥러, 지출방위단, 예비신랑"
                  : "예: 매운 것 전혀 못 드시는 유아 동반, 견과류 알레르기 있음, 또는 '없음'"
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white/80 border border-white/90 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#5C6346] text-stone-800 font-semibold shadow-inner"
            />
            <button
              type="submit"
              className="bg-[#5C6346] hover:bg-[#4d5239] text-white px-5 rounded-full font-bold flex items-center justify-center text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              확인
            </button>
          </form>
        )}
      </div>

      {/* Global AI Generating Overlay */}
      <AnimatePresence>
        {isGeneratingRecipes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center text-white"
          >
            <div className="relative w-20 h-20 mb-5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dashed border-[#BC6C4D]"
              />
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center"
              >
                <span className="text-3xl">🍲</span>
              </motion.div>
            </div>

            <h4 className="text-lg font-bold mb-1 tracking-tight text-[#ECE8DF] flex items-center gap-1.5 justify-center">
              <Sparkles className="w-5 h-5 text-[#BC6C4D] animate-bounce" />
              파먹이의 맞춤형 식비 방어 주방 가동 중
            </h4>
            <p className="text-xs text-stone-200 max-w-xs font-semibold leading-relaxed animate-pulse">
              {genStatusMessage}
            </p>
            <div className="mt-8 space-y-1 text-[10px] text-stone-400 font-medium">
              <p>✔ 마트 추가 장보기 지출 비용 0원 달성 조건 검증</p>
              <p>✔ 냉장고 내 폐기대상 야채 우선 순위 반영</p>
              <p>✔ 건강 가치 환산 칼로리 및 단백질 밸런스 배치</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
