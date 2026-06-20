import React, { useState, useEffect } from "react";
import {
  TrendingDown,
  Sparkles,
  Calendar,
  PiggyBank,
  Check,
  ChevronRight,
  User,
  Heart,
  HelpCircle,
  Menu,
  ChefHat,
  LayoutDashboard,
  RefreshCw,
  Clock,
  ThumbsUp,
} from "lucide-react";
import { Recipe, SavingsLog, BudgetStats, UserProfile } from "./types";
import { UserPlus, Plus, Trash2, LogOut, ArrowLeft, Edit2, X } from "lucide-react";
import { formatCurrency, getRecipeImage, isFallbackRecipeImage, getPameokiMotivationalSlogan } from "./utils";
import { PameokiCharacter } from "./components/RecipeDetail";
import ChatInterface from "./components/ChatInterface";
import Dashboard from "./components/Dashboard";
import RecipeDetail from "./components/RecipeDetail";

// Beautiful starter logs to demonstrate visual telemetry immediately on first load
const SEED_LOGS: SavingsLog[] = [
  {
    id: "seed-1",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    recipeName: "배달치킨 유혹 완전 방어! 냉동실 대패삼겹파볶음",
    savingsAmount: 22000,
    purpose: "가정식 집밥",
    ingredientsSaved: ["대파", "대패삼겹살", "마늘"],
    notes: "배달앱에서 결제하기 직전에 냉장고 파먹기를 결심하며 소중한 2만 2천원을 온전히 방어했어요!",
  },
  {
    id: "seed-2",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    recipeName: "야채칸 방치 양배추 계란지짐 토스트",
    savingsAmount: 9500,
    purpose: "도시락",
    ingredientsSaved: ["양배추", "계란", "식빵"],
    notes: "유통기한 직전의 숨죽은 양배추 반통과 달걀을 구출해 실속 넘치는 아침 도시락 완성!",
  },
];

export default function App() {
  // Navigation: "cook" (recipe search) vs "favorites" (saved bookmarks) vs "dashboard" (progress tracker)
  const [activeTab, setActiveTab] = useState<"cook" | "favorites" | "dashboard">("cook");

  // All user profiles
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("pamugi_profiles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse profiles", e);
      }
    }
    // Default starter profiles with custom purposes
    return [
      {
        id: "prof-mom",
        nickname: "안심식단 엄마",
        purposeType: "가족 건강 삼시세끼 웰빙 식단 👩‍🍳",
        avatar: "👩‍🍳",
        budgetLimit: 600000,
        logs: SEED_LOGS,
        savedRecipes: [],
      },
      {
        id: "prof-student",
        nickname: "알뜰요리 자취생",
        purposeType: "초간단 5분 생존형 가성비 한끼 🍳",
        avatar: "🍳",
        budgetLimit: 300000,
        logs: [],
        savedRecipes: [],
      },
      {
        id: "prof-dad",
        nickname: "야식장인 아빠",
        purposeType: "주말 특식 및 하루 스트레스 푸는 술안주 요리 👨‍🍳",
        avatar: "👨‍🍳",
        budgetLimit: 400000,
        logs: [],
        savedRecipes: [],
      },
    ];
  });

  // Current active profile ID
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return localStorage.getItem("pamugi_active_profile_id");
  });

  const currentProfile = profiles.find((p) => p.id === activeProfileId) || null;

  // Gemini API Key validation state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("pamugi_gemini_api_key") || "");
  const [apiKeyValidated, setApiKeyValidated] = useState(() => {
    return localStorage.getItem("pamugi_gemini_api_key_valid") === "true";
  });
  const [validationError, setValidationError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  const handleValidateApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey || !apiKey.trim()) {
      setValidationError("올바른 Gemini API Key를 입력해 주세요.");
      return;
    }

    setIsValidating(true);
    setValidationError("");

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "입력하신 API Key 유효성 검증에 실패했습니다.");
      }

      // Success!
      localStorage.setItem("pamugi_gemini_api_key", apiKey.trim());
      localStorage.setItem("pamugi_gemini_api_key_valid", "true");
      setApiKeyValidated(true);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || "유효성 테스트 실패: 다시 입력해 보시거나, 인터넷 연결을 확인해 주세요.");
      localStorage.removeItem("pamugi_gemini_api_key_valid");
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetApiKey = () => {
    localStorage.removeItem("pamugi_gemini_api_key");
    localStorage.removeItem("pamugi_gemini_api_key_valid");
    setApiKey("");
    setApiKeyValidated(false);
    setValidationError("");
  };

  // Recommended recipes states
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [chosenIngredients, setChosenIngredients] = useState<string[]>([]);
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Sync to database/localStorage
  useEffect(() => {
    localStorage.setItem("pamugi_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem("pamugi_active_profile_id", activeProfileId);
    } else {
      localStorage.removeItem("pamugi_active_profile_id");
    }
  }, [activeProfileId]);

  // Helper to update active profile in the list
  const updateActiveProfile = (updated: Partial<UserProfile>) => {
    if (!activeProfileId) return;
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === activeProfileId) {
          return { ...p, ...updated };
        }
        return p;
      })
    );
  };

  // Derive isolated values from active profile
  const nickname = currentProfile ? currentProfile.nickname : "";
  const logs = currentProfile ? currentProfile.logs : [];
  const budgetLimit = currentProfile ? currentProfile.budgetLimit : 500000;
  const savedRecipes = currentProfile ? currentProfile.savedRecipes : [];

  // Implement corresponding setters
  const setLogs = (updater: SavingsLog[] | ((prev: SavingsLog[]) => SavingsLog[])) => {
    if (!currentProfile) return;
    const nextLogs = typeof updater === "function" ? updater(currentProfile.logs) : updater;
    updateActiveProfile({ logs: nextLogs });
  };

  const setBudgetLimit = (limit: number) => {
    updateActiveProfile({ budgetLimit: limit });
  };

  const setSavedRecipes = (updater: Recipe[] | ((prev: Recipe[]) => Recipe[])) => {
    if (!currentProfile) return;
    const nextSaved = typeof updater === "function" ? updater(currentProfile.savedRecipes) : updater;
    updateActiveProfile({ savedRecipes: nextSaved });
  };

  const setSavedNickname = (name: string) => {
    updateActiveProfile({ nickname: name });
  };

  // Profile creation states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newPurposeType, setNewPurposeType] = useState("");
  const [newAvatar, setNewAvatar] = useState("👩‍🍳");
  const [newBudgetLimit, setNewBudgetLimit] = useState(500000);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim() || !newPurposeType.trim()) return;

    const newId = "prof-" + Math.random().toString(36).substring(2, 9);
    const newProfile: UserProfile = {
      id: newId,
      nickname: newNickname.trim(),
      purposeType: newPurposeType.trim(),
      avatar: newAvatar,
      budgetLimit: newBudgetLimit,
      logs: [],
      savedRecipes: [],
      createdAt: Date.now(),
    };

    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newId);

    // Reset form states
    setNewNickname("");
    setNewPurposeType("");
    setNewAvatar("👩‍🍳");
    setNewBudgetLimit(500000);
    setShowAddForm(false);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering selection
    if (confirm("정말로 이 프로필을 삭제하시겠습니까? 해당 프로필의 지출가계부와 보관된 요리 정보가 모두 소멸됩니다.")) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId(null);
      }
    }
  };

  const toggleSaveRecipe = (recipe: Recipe) => {
    setSavedRecipes((prev) => {
      const exists = prev.some((r) => r.name === recipe.name);
      if (exists) {
        return prev.filter((r) => r.name !== recipe.name);
      } else {
        return [...prev, recipe];
      }
    });
  };

  const isRecipeSaved = (recipe: Recipe) => {
    return savedRecipes.some((r) => r.name === recipe.name);
  };

  // Derived budget stats
  const totalSavedValue = logs.reduce((sum, item) => sum + item.savingsAmount, 0);
  const budgetStats: BudgetStats = {
    monthlyLimit: budgetLimit,
    currentSpent: Math.max(0, budgetLimit - totalSavedValue),
    savedTotal: totalSavedValue,
  };

  // Add custom savings record
  const handleAddManualLog = (newLogData: Omit<SavingsLog, "id" | "date"> & { date: string }) => {
    const logItem: SavingsLog = {
      ...newLogData,
      id: "log-" + Math.random().toString(36).substring(2, 9),
    };
    setLogs((prev) => [logItem, ...prev]);
  };

  // Remove log record
  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  // Update Monthly Goal limit
  const handleUpdateBudget = (limit: number) => {
    setBudgetLimit(limit);
  };

  // Callback once Gemini answers recipes
  const handleRecipesFound = (
    recipes: Recipe[],
    ingredientsUsed: string[],
    purpose: string,
    note: string
  ) => {
    setRecommendedRecipes(recipes);
    setChosenIngredients(ingredientsUsed);
    setSelectedPurpose(purpose);
    setSpecialNote(note);
    setSelectedRecipe(null); // Clear selected details on new search
  };

  // Log currently cooked leftovers recipe
  const handleMarkAsCooked = (recipe: Recipe) => {
    const today = new Date().toISOString().split("T")[0];
    const logItem: SavingsLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      date: today,
      recipeName: `🎯 추천요리 실천: ${recipe.name}`,
      savingsAmount: recipe.savingsAmount,
      purpose: selectedPurpose || "홈밥",
      ingredientsSaved: recipe.ingredients
        .filter((i) => i.isFromRefrigerator)
        .map((i) => i.name),
      notes: `파먹이 멘토 추천 집밥으로 식생활 개선 및 지출 방어 성공! (조리시간 ${recipe.cookingTime}분)`,
      recipeSnapshot: recipe,
      customImage: recipe.customImage,
    };

    setLogs((prev) => [logItem, ...prev]);
    // Switch to dashboard to see updated scores
    setTimeout(() => {
      setActiveTab("dashboard");
    }, 200);
  };

  const handleUploadCustomImage = (recipe: Recipe, base64: string) => {
    // Update the currently viewed recipe state
    setSelectedRecipe((prev) => {
      if (prev && prev.name === recipe.name) {
        return { ...prev, customImage: base64 };
      }
      return prev;
    });

    // Update in profile saved recipes list
    setSavedRecipes((prev) =>
      prev.map((r) => {
        if (r.name === recipe.name) {
          return { ...r, customImage: base64 };
        }
        return r;
      })
    );

    // Update in recommendations state list
    setRecommendedRecipes((prev) =>
      prev.map((r) => {
        if (r.name === recipe.name) {
          return { ...r, customImage: base64 };
        }
        return r;
      })
    );

    // Update in history logs
    setLogs((prev) =>
      prev.map((log) => {
        if (log.recipeSnapshot && log.recipeSnapshot.name === recipe.name) {
          return {
            ...log,
            customImage: base64,
            recipeSnapshot: { ...log.recipeSnapshot, customImage: base64 }
          };
        }
        return log;
      })
    );
  };

  const isRecipeAlreadyCooked = (recipe: Recipe) => {
    return logs.some((l) => l.recipeName.includes(recipe.name));
  };

  const resetRecipeSearch = () => {
    setRecommendedRecipes([]);
    setSelectedRecipe(null);
  };

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-stone-800 p-4 md:p-12 flex flex-col items-center justify-center relative font-sans selection:bg-[#5C6346]/20 selection:text-[#5C6346]">
        {/* Subtle grid styling */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e4da_1px,transparent_1px)] [background-size:16px_16px] opacity-65 pointer-events-none" />

        <div className="max-w-4xl w-full z-10 space-y-8 animate-fade-in">
          {/* Logo / Brand */}
          <div className="text-center space-y-3">
            <div className="inline-flex w-16 h-16 bg-white/60 border border-white rounded-3xl items-center justify-center shadow-md overflow-hidden">
              <img
                src="/src/assets/images/pamugi_mascot_1781926745171.jpg"
                alt="파먹이"
                className="w-full h-full object-cover animate-pulse"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3.5xl font-extrabold tracking-tight text-[#2D3120]">
                식비 절감 멘토 <span className="text-[#BC6C4D]">파먹이 🥬</span>
              </h1>
              <p className="text-xs md:text-sm text-[#5C6346] font-semibold mt-1">
                만들어주시는 <strong>주인공의 목적</strong>에 꼭 맞춘 냉장고 구출 맞춤 레시피
              </p>
            </div>
          </div>

          {/* Intro Section */}
          <div className="bg-white/45 border border-white/60 backdrop-blur-md rounded-3xl p-5 text-center space-y-1.5 max-w-lg mx-auto shadow-2xs">
            <h2 className="text-sm md:text-base font-extrabold text-[#1C1F14]">누가 요리를 준비하시나요?</h2>
            <p className="text-[11px] md:text-xs text-stone-500 leading-relaxed">
              아이 영양 한끼, 자취생의 5분 생존 요리, 아빠의 야식 등!<br />
              누가 조리하느냐에 따라 식비 가계부와 멘토링 조언이 다르게 작용합니다.
            </p>
          </div>

          {/* Gemini API Key Section */}
          <div 
            id="gemini-key-auth-card" 
            className="max-w-xl mx-auto bg-white/95 border border-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-7 shadow-xs space-y-4 sm:space-y-5 transition-all text-left"
          >
            {/* Header / Intro */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex-shrink-0 shadow-3xs">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </div>
              <div className="space-y-0.5 select-none">
                <h3 className="text-xs sm:text-sm md:text-base font-black text-[#2D3120] leading-tight">무료로 시작하세요. Gemini API 키만 있으면 됩니다.</h3>
                <p className="text-[10px] sm:text-xs text-stone-500 font-medium">
                  본 애플리케이션은 냉장고 재료 스캔 및 파먹이 AI 레시피 설계를 위해 고유한 API Key를 필요로 합니다.
                </p>
              </div>
            </div>

            {/* Input & Validate Button */}
            {!apiKeyValidated ? (
              <form onSubmit={handleValidateApiKey} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setValidationError("");
                      }}
                      disabled={isValidating}
                      placeholder="Gemini API Key 입력 (AIzaSy...)"
                      className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 placeholder-stone-400 font-mono text-xs text-stone-800 bg-stone-50 border border-stone-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:border-[#BC6C4D] focus:ring-1 focus:ring-[#BC6C4D] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isValidating || !apiKey.trim()}
                    className="px-5 py-2.5 sm:py-3 bg-[#5C6346] hover:bg-[#494E37] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl sm:rounded-2xl shadow-xs transition-all focus:outline-none flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap min-w-[90px]"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>검사 중...</span>
                      </>
                    ) : (
                      <span>시작하기</span>
                    )}
                  </button>
                </div>
                
                {validationError && (
                  <p className="text-[10px] sm:text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                    <span>⚠️</span> {validationError}
                  </p>
                )}
              </form>
            ) : (
              <div className="bg-[#FAF9F5] border border-[#BC6C4D]/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-bounce"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] sm:text-xs font-extrabold text-emerald-800">Gemini API Key 정상 등록됨</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-mono">
                    {apiKey.substring(0, 8)}••••••••••••••••{apiKey.substring(apiKey.length - 4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetApiKey}
                  className="px-2.5 py-1.5 bg-white border border-stone-200 hover:border-rose-200 text-stone-600 hover:text-rose-600 font-extrabold text-[10px] rounded-xl shadow-3xs transition-all active:scale-95 cursor-pointer"
                >
                  변경하기
                </button>
              </div>
            )}

            {/* Guide Collapse Accordion */}
            <div className="border border-stone-100 rounded-xl sm:rounded-2xl overflow-hidden bg-stone-50/50">
              <button
                type="button"
                onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-left font-sans cursor-pointer hover:bg-stone-50 transition-colors"
                aria-expanded={isGuideExpanded}
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#BC6C4D]/80" />
                  <span className="text-xs font-extrabold text-[#2D3120]">Gemini API Key 발급 가이드</span>
                </div>
                <span className="text-stone-400 transition-transform duration-200">
                  {isGuideExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m18 15-6-6-6 6"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  )}
                </span>
              </button>

              {isGuideExpanded && (
                <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3.5 font-sans text-xs border-t border-stone-100/80 bg-white transition-all duration-300">
                  <div className="space-y-3 font-semibold text-stone-600 text-[11px] sm:text-xs">
                    {/* Step 1 */}
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px] shadow-3xs">1</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-stone-800">Google AI Studio 접속</p>
                        <p className="text-[10px] text-stone-500 font-medium">아래의 공식 키 발급 페이지로 이동해 주세요.</p>
                        <a 
                          href="https://aistudio.google.com/apikey" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-block text-blue-600 hover:underline hover:text-blue-700 font-bold text-[10px]"
                        >
                          https://aistudio.google.com/apikey
                        </a>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px] shadow-3xs">2</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-stone-800">Google 계정으로 로그인</p>
                        <p className="text-[10px] text-stone-500 font-medium leading-normal">Gmail 계정으로 로그인하세요. 계정이 없으면 무료로 만들 수 있어요.</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px] shadow-3xs">3</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-stone-800">'API 키 만들기' 클릭</p>
                        <p className="text-[10px] text-stone-500 font-medium">화면에서 <strong className="text-stone-700 font-extrabold">'Create API Key'</strong> 또는 <strong className="text-stone-700 font-extrabold">'API 키 만들기'</strong> 버튼을 클릭하세요.</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px] shadow-3xs">4</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-stone-800">프로젝트 선택 후 생성</p>
                        <p className="text-[10px] text-stone-500 font-medium">기본 프로젝트를 선택하고 <strong className="text-stone-700 font-extrabold">'Create API key in existing project'</strong>를 클릭하세요.</p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-blue-50 text-blue-600 font-bold rounded-lg text-[10px] shadow-3xs">5</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-stone-800">API 키 복사</p>
                        <p className="text-[10px] text-stone-500 font-medium leading-normal">생성된 API 키 (AIza로 시작)를 복사하세요. 이 키를 입력창에 붙여넣기하면 됩니다!</p>
                      </div>
                    </div>
                  </div>

                  {/* Redirection Link Button */}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1.5 font-bold font-sans text-blue-700 rounded-xl transition-all hover:scale-[1.01] active:scale-95 cursor-pointer text-xs"
                  >
                    <span>🔑 API 키 발급 페이지로 이동</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Profile Choice Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[...profiles]
              .sort((a, b) => {
                const aTime = a.createdAt || 0;
                const bTime = b.createdAt || 0;
                if (bTime !== aTime) return bTime - aTime;
                return (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0);
              })
              .map((p) => {
                const totalSaved = p.logs.reduce((sum, item) => sum + item.savingsAmount, 0);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!apiKeyValidated) {
                        setValidationError("프로필을 선택하기 전에 먼저 위에서 Gemini API Key를 입력하고 인증(시작하기)을 완료해 주세요!");
                        document.getElementById("gemini-key-auth-card")?.scrollIntoView({ behavior: "smooth" });
                        return;
                      }
                      // Update lastAccessedAt timestamp for this chosen profile
                      setProfiles((prev) =>
                        prev.map((item) =>
                          item.id === p.id ? { ...item, lastAccessedAt: Date.now() } : item
                        )
                      );
                      setActiveProfileId(p.id);
                    }}
                    className={`group relative bg-white/70 hover:bg-white/95 backdrop-blur-lg rounded-2xl sm:rounded-[32px] border border-white/80 hover:border-[#BC6C4D]/60 p-4 sm:p-5 md:p-6 flex flex-col justify-between items-start transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-1 sm:hover:-translate-y-1.5 duration-300 ${
                      !apiKeyValidated ? "opacity-60 saturate-50 select-none" : ""
                    }`}
                  >
                    <div className="w-full space-y-4">
                      {/* Header */}
                      <div className="flex justify-between items-start w-full">
                        <span className="text-3xl sm:text-4xl bg-white/80 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-3xs group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300">{p.avatar}</span>
                        {profiles.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setConfirmDeleteId(p.id);
                            }}
                            className="p-1.5 border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-stone-400 hover:text-rose-600 rounded-xl transition-all shadow-3xs active:scale-90 cursor-pointer flex items-center justify-center relative z-20"
                            title="프로필 삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <h3 className="font-extrabold text-[#2D3120] text-sm sm:text-base group-hover:text-[#BC6C4D] transition-colors">
                          {p.nickname}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 min-h-[24px] sm:min-h-[32px] leading-relaxed">
                          {p.purposeType}
                        </p>
                      </div>
                    </div>

                    {/* Summary Footer Stats */}
                    <div className="w-full mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-100 flex justify-between items-center text-[9px] sm:text-[10px] text-stone-600 font-bold">
                      <div>
                        <div className="text-[8px] sm:text-[9px] text-stone-400 font-normal">누적 절약수익</div>
                        <div className="text-[#BC6C4D] text-xs font-black">{formatCurrency(totalSaved)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] sm:text-[9px] text-stone-400 font-normal">보관집밥</div>
                        <div className="text-stone-800 text-xs font-black">{p.savedRecipes.length}개 소장</div>
                      </div>
                    </div>

                    {/* Play Hover Decor */}
                    <div className="absolute bottom-4 right-4 bg-[#BC6C4D] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-sm">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}

            {/* Profile Adding Bento Card Button */}
            {!showAddForm ? (
              <button
                onClick={() => {
                  if (!apiKeyValidated) {
                    setValidationError("새 프로필을 추가하기 전에 먼저 위에서 Gemini API Key를 입력하고 인증(시작하기)을 완료해 주세요!");
                    document.getElementById("gemini-key-auth-card")?.scrollIntoView({ behavior: "smooth" });
                    return;
                  }
                  setShowAddForm(true);
                }}
                className={`bg-dashed-border group h-full min-h-[180px] sm:min-h-[220px] rounded-2xl sm:rounded-[32px] border-2 border-dashed border-stone-300 hover:border-[#BC6C4D] p-5 sm:p-6 flex flex-col justify-center items-center gap-3 transition-all cursor-pointer hover:bg-white/40 ${
                  !apiKeyValidated ? "opacity-60 saturate-50 select-none" : ""
                }`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-100 group-hover:bg-[#BC6C4D]/10 text-stone-400 group-hover:text-[#BC6C4D] flex items-center justify-center transition-colors">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-stone-700 text-xs sm:text-sm group-hover:text-[#BC6C4D] transition-colors">새 요리 목적 프로필 추가</p>
                  <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1">대접 대상/역할별 가계부 및 추천 세팅</p>
                </div>
              </button>
            ) : null}
          </div>

          {/* Expanded Bento Addition Form */}
          {showAddForm && (
            <div className="max-w-xl mx-auto bg-white/80 border border-white backdrop-blur-md rounded-[32px] p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <h3 className="font-bold text-[#2D3120] text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#BC6C4D]" /> 새로운 요리 목적 프로필 정보 설정
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-stone-400 hover:text-stone-700 font-bold text-sm"
                >
                  취소
                </button>
              </div>

              <form onSubmit={handleCreateProfile} className="space-y-4 text-left">
                {/* Nickname Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 block">👤 가명 / 닉네임</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="예: 안심간식 엄마, 주말폭식 대학생, 헬창 삼촌"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:border-[#BC6C4D] focus:ring-1 focus:ring-[#BC6C4D] text-sm bg-white"
                  />
                </div>

                {/* Purpose/Role input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 block">🎯 요리 대접 및 파먹기 목적</label>
                  <input
                    type="text"
                    required
                    maxLength={35}
                    value={newPurposeType}
                    onChange={(e) => setNewPurposeType(e.target.value)}
                    placeholder="예: 가족 웰빙 밥상, 자취생 초간단 생존 가성비 요리, 혼술 안주파티"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:border-[#BC6C4D] focus:ring-1 focus:ring-[#BC6C4D] text-sm bg-white"
                  />
                </div>

                {/* Avatar Icon */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 block">🎨 대표 캐릭터 아바타 이모지</label>
                  <div className="flex flex-wrap gap-2">
                    {["👩‍🍳", "🍳", "👨‍🍳", "🥗", "🧑‍🌾", "🍲", "🍖", "🍱", "🍕", "🍰"].map((emo) => (
                      <button
                        type="button"
                        key={emo}
                        onClick={() => setNewAvatar(emo)}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                          newAvatar === emo
                            ? "bg-[#BC6C4D] text-white scale-110 shadow-sm animate-pulse"
                            : "bg-white hover:bg-stone-50 text-stone-700 border border-stone-100"
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target savings limit input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 block">💰 월 목표 식비 절약 금액 (원)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={10000}
                      max={5000000}
                      step={10000}
                      value={newBudgetLimit}
                      onChange={(e) => setNewBudgetLimit(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 outline-none focus:border-[#BC6C4D] focus:ring-1 focus:ring-[#BC6C4D] text-sm bg-white pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">원</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#5C6346] hover:bg-[#474D36] text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    🚀 파먹이 맞춤형 방어 세트 생성 및 선택
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-800 pb-16 selection:bg-[#5C6346]/20 selection:text-[#5C6346]">
      {/* 1. Styled navigation header bar */}
      <header className="sticky top-0 z-40 bg-white/30 backdrop-blur-md border-b border-white/40 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="w-12 h-12 bg-white/50 border border-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img
                src="/src/assets/images/pamugi_mascot_1781926745171.jpg"
                alt="파먹이 캐릭터"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#2D3120] font-sans flex items-center gap-1.5 leading-none">
                  식비 절감 멘토 <span className="text-[#BC6C4D]">파먹이</span>
                </h1>
                <p className="text-[10px] text-[#5C6346] font-semibold mt-1 uppercase tracking-wider">
                  Life-Saving Recipe Curator
                </p>
              </div>
            </div>

            {/* Profile Avatar & Quick-Switcher Badge */}
            <div className="flex items-center gap-2.5 bg-white/65 backdrop-blur-xs py-1.5 px-3.5 rounded-2xl border border-white/80 shadow-3xs hover:bg-white/85 transition-all max-w-full">
              <span className="text-2xl animate-bounce" style={{ animationDuration: '3s' }}>{currentProfile.avatar}</span>
              <div className="text-left leading-tight shrink min-w-0">
                <div className="font-extrabold text-xs text-stone-850 flex items-center gap-1">
                  <span>{currentProfile.nickname}</span>
                  <button
                    onClick={() => {
                      const newName = prompt("변경할 새로운 별명/이름을 입력해주세요:", currentProfile.nickname);
                      if (newName && newName.trim()) {
                        setSavedNickname(newName.trim());
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-[#BC6C4D] transition-colors rounded-lg ml-0.5"
                    title="별명 수정"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="text-[9px] text-[#BC6C4D] font-bold truncate max-w-[140px] md:max-w-[200px]" title={currentProfile.purposeType}>
                  🎯 {currentProfile.purposeType.replace(/[👩‍🍳🍳👨‍🍳🥗🧑‍🌾🍲🍖🍱🍕🍰]/g, '')}
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveProfileId(null);
                  resetRecipeSearch();
                }}
                className="ml-1.5 bg-[#BC6C4D]/10 hover:bg-[#BC6C4D]/25 text-[#BC6C4D] py-1 px-2.5 rounded-lg text-[9.5px] font-extrabold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                title="다른 요리 목적으로 프로필을 전환합니다."
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '8s' }} /> 전환
              </button>
            </div>

            {/* Tab buttons with frosted borders */}
          <nav className="flex items-center bg-white/40 backdrop-blur-xs p-1 rounded-xl border border-white/60 shadow-xs">
            <button
              onClick={() => {
                setActiveTab("cook");
                setSelectedRecipe(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeTab === "cook"
                  ? "bg-[#5C6346] text-white shadow-md"
                  : "text-[#5C6346] hover:text-[#2D3120]"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 shrink-0" />
              <span>레시피 파먹기</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab("favorites");
                setSelectedRecipe(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeTab === "favorites"
                  ? "bg-[#5C6346] text-white shadow-md"
                  : "text-[#5C6346] hover:text-[#2D3120]"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 shrink-0 ${savedRecipes.length > 0 ? "fill-red-500 text-red-500" : ""}`} />
              <span className="flex items-center gap-1">
                보관집밥
                {savedRecipes.length > 0 && (
                  <span className="bg-[#BC6C4D] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {savedRecipes.length}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedRecipe(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#5C6346] text-white shadow-md"
                  : "text-[#5C6346] hover:text-[#2D3120]"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 shrink-0" />
              <span>식비 가계부</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Primary layout board container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {activeTab === "cook" ? (
          /* RECIPE COOK SECTION */
          <div className="space-y-6">
            {recommendedRecipes.length === 0 ? (
              /* Chat Interface to lookup recipes first */
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white/50 backdrop-blur-md border border-white/80 rounded-[32px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-6 items-center text-left relative overflow-hidden">
                  {/* Botanical offset circles from the uploaded image */}
                  <div className="flex md:flex-col gap-4 shrink-0 sm:pb-0 pb-2">
                    <div className="relative w-14 h-14 rounded-full border border-[#2D3120] flex items-center justify-center bg-white/40 shadow-sm">
                      <div className="absolute inset-[2px] rounded-full border border-dashed border-[#5C6346]/40" />
                      <span className="text-2xl">🥬</span>
                    </div>
                    <div className="relative w-14 h-14 rounded-full border border-[#2D3120] flex items-center justify-center bg-white/40 shadow-sm">
                      <div className="absolute inset-[2px] rounded-full border border-dashed border-[#5C6346]/40" />
                      <span className="text-2xl">🥕</span>
                    </div>
                    <div className="relative w-14 h-14 rounded-full border border-[#2D3120] flex items-center justify-center bg-white/40 overflow-hidden shadow-sm">
                      <div className="absolute inset-[2px] rounded-full border border-dashed border-[#5C6346]/40 z-10" />
                      <img
                        src="/src/assets/images/pamugi_mascot_1781926745171.jpg"
                        alt="파먹이"
                        className="w-full h-full object-cover scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="inline-flex items-center gap-2 bg-[#BC6C4D]/10 px-3 py-1 rounded-full border border-[#BC6C4D]/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C4D] animate-ping" />
                      <h3 className="text-xs font-black text-[#BC6C4D] uppercase tracking-widest leading-none">
                        식자재 구출 요령 꿀팁
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-[#4E4A42] leading-relaxed font-bold">
                      냉장고 문을 열고 한 장의 스마트폰 찰칵 사진을 보내시거나, 남은 재료들을 쉼표로 나열하세요. 
                      멘토 파먹이가 탄단지 영양 비율과 실용적인 요리법을 설계합니다.
                    </p>
                  </div>
                </div>
                
                <ChatInterface
                  onRecipesFound={handleRecipesFound}
                  savedNickname={nickname}
                  setSavedNickname={setSavedNickname}
                />
              </div>
            ) : (
              /* Recipes matched, render detail viewer or list selector */
              <div className="space-y-6">
                {selectedRecipe ? (
                  /* Expanded recipe steps panel */
                  <RecipeDetail
                    recipe={selectedRecipe}
                    onBack={() => setSelectedRecipe(null)}
                    onCook={handleMarkAsCooked}
                    isAlreadyCooked={isRecipeAlreadyCooked(selectedRecipe)}
                    isSaved={isRecipeSaved(selectedRecipe)}
                    onToggleSave={toggleSaveRecipe}
                    onUploadCustomImage={handleUploadCustomImage}
                  />
                ) : (
                  /* Recipes selection list menu */
                  <div className="space-y-5">
                    {/* Meta prompt status banner */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-3xl p-5 md:p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-[10px] bg-[#5C6346]/10 text-[#5C6346] font-bold px-2 py-0.5 rounded-md">
                          요리 목적: {selectedPurpose}
                        </span>
                        <h3 className="font-extrabold text-[#2D3120] text-base md:text-lg tracking-tight font-serif mt-1">
                          🍴 파먹이가 추천하는 소중한 구출 요리 {recommendedRecipes.length}종
                        </h3>
                        <p className="text-[11px] text-[#5C6346] font-semibold">
                          가용 식재료: [{chosenIngredients.join(", ")}] 기반으로 생성되었습니다.
                        </p>
                      </div>
                      <button
                        onClick={resetRecipeSearch}
                        className="flex items-center gap-1.5 bg-[#BC6C4D] hover:bg-[#A85B3C] text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md hover:shadow-lg active:scale-95 duration-200 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        식재료 다시 구성하기 (새 채팅)
                      </button>
                    </div>

                    {/* Recommendation cards array */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {recommendedRecipes.map((recipe) => {
                        const isCooked = isRecipeAlreadyCooked(recipe);
                        const showCharOnCard = !recipe.customImage && (
                          localStorage.getItem(`pameoki_prefer_char_${recipe.name}`) === "true" ||
                          (localStorage.getItem(`pameoki_prefer_char_${recipe.name}`) === null && isFallbackRecipeImage(recipe.name))
                        );
                        return (
                          <div
                            key={recipe.name}
                            className="bg-white/50 backdrop-blur-md border border-white/60 hover:border-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Virtual Recipe Food Photo / Pameoki Character Preview */}
                              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/80 shadow-3xs shrink-0 font-sans">
                                {showCharOnCard ? (
                                  <div className="w-full h-full bg-gradient-to-br from-[#F5F7EC] to-[#E5E8D3] flex flex-col items-center justify-center p-2 relative select-none">
                                    <PameokiCharacter className="w-16 h-16 animate-bounce" />
                                    <span className="text-xs sm:text-xs text-[#BC6C4D] font-black text-center mt-1.5 px-3 block drop-shadow-[0_0.5px_1px_rgba(255,255,255,0.8)]">
                                      오늘의 파먹기 기록을 남겨주세요 📸
                                    </span>
                                    <div className="absolute top-2 left-2 bg-[#51573c] text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-3xs">
                                      <span>💚</span> 야무진 파먹이 셰프
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={recipe.customImage || getRecipeImage(recipe.name)}
                                      alt={recipe.name}
                                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/45 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 filter drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.5)]">
                                      {recipe.customImage ? (
                                        <>
                                          <span>📸</span> 실제 조리 인증샷
                                        </>
                                      ) : (
                                        <>
                                          <span>🍽️</span> 연출용 가상 요리 사진
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSaveRecipe(recipe);
                                  }}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 hover:bg-white active:scale-90 flex items-center justify-center cursor-pointer shadow-sm transition-all text-[#BC6C4D] z-10"
                                  title={isRecipeSaved(recipe) ? "보관 해제" : "레시피 보관"}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isRecipeSaved(recipe) ? "fill-[#BC6C4D]" : ""}`} />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#BC6C4D] font-mono">
                                  <span className="bg-[#BC6C4D]/10 px-2 py-0.5 rounded-md">
                                    지출 방어: {formatCurrency(recipe.savingsAmount)}
                                  </span>
                                  <span className="text-[#5C6346] flex items-center gap-1 select-none font-sans font-semibold">
                                    <Clock className="w-3.5 h-3.5" /> {recipe.cookingTime}분
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-[#2D3120] text-base">
                                  {recipe.name}
                                </h4>
                                <p className="text-xs text-stone-600 leading-normal line-clamp-2 font-medium">
                                  {recipe.description}
                                </p>
                              </div>

                              {/* Ingredient snippet chips */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {recipe.ingredients.slice(0, 5).map((ing, i) => (
                                  <span
                                    key={i}
                                    className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                                      ing.isFromRefrigerator
                                        ? "bg-[#5C6346]/10 text-[#5C6346] border-[#5C6346]/20 font-bold"
                                        : "bg-white/60 text-stone-500 border-white/80 shadow-3xs"
                                    }`}
                                  >
                                    {ing.name}
                                  </span>
                                ))}
                                {recipe.ingredients.length > 5 && (
                                  <span className="text-[10px] text-stone-400 p-0.5 font-bold">외 {recipe.ingredients.length - 5}</span>
                                )}
                              </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-white/40 flex justify-between items-center bg-transparent">
                              <span className="text-[10px] text-[#5C6346] font-mono font-bold flex items-center gap-1 leading-none">
                                {recipe.calorie} kcal | 난이도 {recipe.complexity}
                              </span>
                              
                              <button
                                onClick={() => setSelectedRecipe(recipe)}
                                className="bg-[#5C6346] hover:bg-[#4d5239] text-white py-1.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                {isCooked ? "조리 상태 보기" : "차례 보기"}
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Cook stamp ribbon decoration */}
                            {isCooked && (
                              <div className="absolute top-2 right-2 bg-emerald-700/15 text-emerald-800 border border-emerald-800/25 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 select-none">
                                <Check className="w-3 h-3" /> 조리 완료
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === "favorites" ? (
          /* SAVED/FAVORITED RECIPES SECTION */
          <div className="space-y-6">
            {selectedRecipe ? (
              /* Expanded recipe detail view from saved recipes */
              <RecipeDetail
                recipe={selectedRecipe}
                onBack={() => setSelectedRecipe(null)}
                onCook={handleMarkAsCooked}
                isAlreadyCooked={isRecipeAlreadyCooked(selectedRecipe)}
                isSaved={isRecipeSaved(selectedRecipe)}
                onToggleSave={toggleSaveRecipe}
                onUploadCustomImage={handleUploadCustomImage}
              />
            ) : (
              /* Saved recipes list selection */
              <div className="space-y-5">
                <div className="bg-white/50 backdrop-blur-md border border-white/80 rounded-[32px] p-6 md:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-[#2D3120] text-base md:text-lg tracking-tight font-sans">
                      📚 보관집밥 레시피 보관함
                    </h3>
                    <p className="text-[11px] text-[#5C6346] font-semibold mt-1">
                      마음에 들어서 보관해두신 나만의 가성비 집밥 백과사전입니다. 언제든지 다시 꺼내 조리해보세요!
                    </p>
                  </div>
                </div>

                {savedRecipes.length === 0 ? (
                  <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl p-12 text-center text-stone-500 space-y-3">
                    <div className="text-4xl text-[#BC6C4D]">📚</div>
                    <h4 className="font-bold text-[#2D3120] text-sm">보관해둔 레시피가 아직 없습니다</h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      '레시피 파먹기'에서 AI 요리 멘토가 제안하는 레시피의 하트 버튼을 눌러보세요! 이곳에 간직할 수 있습니다.
                    </p>
                    <button
                      onClick={() => setActiveTab("cook")}
                      className="inline-flex mt-2 items-center gap-1.5 bg-[#5C6346] hover:bg-[#4d5239] text-white py-1.5 px-4.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      레시피 파먹으러 가기
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {savedRecipes.map((recipe) => {
                      const isCooked = isRecipeAlreadyCooked(recipe);
                      const showCharOnCard = !recipe.customImage && (
                        localStorage.getItem(`pameoki_prefer_char_${recipe.name}`) === "true" ||
                        (localStorage.getItem(`pameoki_prefer_char_${recipe.name}`) === null && isFallbackRecipeImage(recipe.name))
                      );
                      return (
                        <div
                          key={recipe.name}
                          className="bg-white/50 backdrop-blur-md border border-white/60 hover:border-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            {/* Virtual Recipe Food Photo / Pameoki Character Preview */}
                            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/80 shadow-3xs shrink-0 font-sans">
                              {showCharOnCard ? (
                                <div className="w-full h-full bg-gradient-to-br from-[#F5F7EC] to-[#E5E8D3] flex flex-col items-center justify-center p-2 relative select-none">
                                  <PameokiCharacter className="w-16 h-16 animate-bounce" />
                                  <span className="text-xs sm:text-xs text-[#BC6C4D] font-black text-center mt-1.5 px-3 block drop-shadow-[0_0.5px_1px_rgba(255,255,255,0.8)]">
                                    오늘의 파먹기 기록을 남겨주세요 📸
                                  </span>
                                  <div className="absolute top-2 left-2 bg-[#51573c] text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-3xs">
                                    <span>💚</span> 야무진 파먹이 셰프
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={recipe.customImage || getRecipeImage(recipe.name)}
                                    alt={recipe.name}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-2 left-2 bg-black/45 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 filter drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.5)]">
                                    {recipe.customImage ? (
                                      <>
                                        <span>📸</span> 실제 조리 인증샷
                                      </>
                                    ) : (
                                      <>
                                        <span>🍽️</span> 연출용 가상 요리 사진
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                              
                              {/* Absolute Favorite Heart Icon Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveRecipe(recipe);
                                }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 hover:bg-white active:scale-90 flex items-center justify-center cursor-pointer shadow-sm transition-all text-[#BC6C4D] z-10"
                                title="보관 해제"
                              >
                                <Heart className="w-3.5 h-3.5 fill-[#BC6C4D]" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#BC6C4D] font-mono">
                                <span className="bg-[#BC6C4D]/10 px-2 py-0.5 rounded-md">
                                  지출 방어: {formatCurrency(recipe.savingsAmount)}
                                </span>
                                <span className="text-[#5C6346] flex items-center gap-1 select-none font-sans font-semibold">
                                  <Clock className="w-3.5 h-3.5" /> {recipe.cookingTime}분
                                </span>
                              </div>

                              <h4 className="font-extrabold text-[#2D3120] text-base">
                                {recipe.name}
                              </h4>
                              <p className="text-xs text-stone-600 leading-normal line-clamp-2 font-medium">
                                {recipe.description}
                              </p>
                            </div>

                            {/* Ingredient snippet chips */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {recipe.ingredients.slice(0, 5).map((ing, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                                    ing.isFromRefrigerator
                                      ? "bg-[#5C6346]/10 text-[#5C6346] border-[#5C6346]/20 font-bold"
                                      : "bg-white/60 text-stone-500 border-white/80 shadow-3xs"
                                  }`}
                                >
                                  {ing.name}
                                </span>
                              ))}
                              {recipe.ingredients.length > 5 && (
                                <span className="text-[10px] text-stone-400 p-0.5 font-bold">외 {recipe.ingredients.length - 5}</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-white/40 flex justify-between items-center bg-transparent">
                            <span className="text-[10px] text-[#5C6346] font-mono font-bold flex items-center gap-1 leading-none">
                              {recipe.calorie} kcal | 난이도 {recipe.complexity}
                            </span>
                            
                            <button
                              onClick={() => setSelectedRecipe(recipe)}
                              className="bg-[#5C6346] hover:bg-[#4d5239] text-white py-1.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              조리 상태 보기
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* DASHBOARD TRACKER SECTION */
          <div className="space-y-6">
            {selectedRecipe ? (
              <RecipeDetail
                recipe={selectedRecipe}
                onBack={() => setSelectedRecipe(null)}
                onCook={handleMarkAsCooked}
                isAlreadyCooked={isRecipeAlreadyCooked(selectedRecipe)}
                isSaved={isRecipeSaved(selectedRecipe)}
                onToggleSave={toggleSaveRecipe}
                onUploadCustomImage={handleUploadCustomImage}
              />
            ) : (
              <Dashboard
                logs={logs}
                stats={budgetStats}
                onAddManualLog={handleAddManualLog}
                onDeleteLog={handleDeleteLog}
                onUpdateBudget={handleUpdateBudget}
                onViewRecipe={(recipe) => setSelectedRecipe(recipe)}
              />
            )}
          </div>
        )}
      </main>

      {/* Custom Confirmation Modal for Deleting Profile */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in font-sans">
          <div className="bg-[#FAF9F6] rounded-[32px] border border-stone-200 shadow-2xl p-6 md:p-8 max-w-sm w-full text-center space-y-6 transform scale-100 transition-all">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#2D3120]">프로필 삭제 확인</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                정말로 선택하신 프로필을 삭제하시겠습니까?<br />
                삭제 시 해당 프로필의 <strong className="text-rose-600">식비 지출 가계부 기록</strong>과 <strong className="text-rose-600">보관된 나만의 집밥 요리 목록</strong>이 모두 영구 소멸되며, 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-stone-200"
              >
                취소하기
              </button>
              <button
                onClick={() => {
                  if (confirmDeleteId) {
                    setProfiles((prev) => prev.filter((p) => p.id !== confirmDeleteId));
                    if (activeProfileId === confirmDeleteId) {
                      setActiveProfileId(null);
                    }
                    setConfirmDeleteId(null);
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-rose-300"
              >
                네, 삭제합니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
