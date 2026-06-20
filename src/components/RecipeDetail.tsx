import React, { useState, useEffect } from "react";
import {
  Clock,
  Flame,
  Gauge,
  Sparkles,
  BookOpen,
  CheckCircle,
  TrendingDown,
  ArrowLeft,
  CalendarCheck,
  Heart,
  Camera,
  ZoomIn,
  X,
} from "lucide-react";
import { Recipe } from "../types";
import { formatCurrency, getRecipeImage, isFallbackRecipeImage, getPameokiMotivationalSlogan } from "../utils";
import pamugiMascot from "../assets/images/pamugi_mascot_1781926745171.jpg";

const PAMEOKI_SLOGANS = [
  "앗! 요리 사진은 수줍어서 숨었지만, 맛은 귀여운 파먹이가 200% 보장해요! 💚",
  "보글보글... 부지런한 파먹이가 주방에서 비법 레시피를 요리하고 있어요! 🍳",
  "비주얼보다 절약과 실속! 파먹이와 함께라면 이미 완벽한 최고급 명품 집밥! ⭐",
  "자투리 재료 구출 성공! 오늘 냉장고의 영웅은 바로 정성껏 조리하는 나 자신! 👑",
  "지갑은 든든하게, 냉장고는 깔끔하게! 파먹이 셰프가 아낌없이 강추하는 맛이에요!",
  "파먹이가 응원 마법을 부리는 중! 냉장고 속 잠자던 재료들의 맛있는 대반전! ✨",
  "비록 사진은 가출했지만 맛있는 고소함은 코끝에 고스란히 퍼지고 있답니다! 🍲",
  "배달비 방어 성공 기념! 파먹이가 엄지 척 들어올리는 가성비 갑 수퍼 푸드! 👍"
];

export function PameokiCharacter({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={`${className} drop-shadow-md animate-pulse`} style={{ animationDuration: "2.5s" }}>
      {/* Green onion sprout on head */}
      <path d="M 100 45 C 90 20, 85 10, 75 15 C 85 25, 95 35, 100 45 Z" fill="#82C91E" />
      <path d="M 100 45 C 110 20, 115 10, 125 15 C 115 25, 105 35, 100 45 Z" fill="#A9E34B" />
      
      {/* Little Chef Hat */}
      <path d="M 85 45 C 85 35, 115 35, 115 45 L 110 55 L 90 55 Z" fill="#FFFFFF" stroke="#5C6346" strokeWidth="2.5" />
      
      {/* Rounded body (soft cream/light green onion white) */}
      <ellipse cx="100" cy="110" rx="42" ry="38" fill="url(#pameokiGrad)" stroke="#5C6346" strokeWidth="3.5" />
      
      {/* Cute chubby cheeks (rosy pink) */}
      <ellipse cx="73" cy="114" rx="8" ry="6" fill="#FFA8A8" opacity="0.8" />
      <ellipse cx="127" cy="114" rx="8" ry="6" fill="#FFA8A8" opacity="0.8" />
      
      {/* Twinkling big happy anime eyes */}
      <ellipse cx="80" cy="104" rx="5.5" ry="7.5" fill="#2C3E50" />
      <circle cx="78.5" cy="101" r="2" fill="#FFFFFF" />
      <circle cx="82" cy="106" r="1" fill="#FFFFFF" />
      
      <ellipse cx="120" cy="104" rx="5.5" ry="7.5" fill="#2C3E50" />
      <circle cx="118.5" cy="101" r="2" fill="#FFFFFF" />
      <circle cx="122" cy="106" r="1" fill="#FFFFFF" />

      {/* Golden stars / sparkles on eyes or next to head */}
      <path d="M 55 80 L 57 84 L 62 85 L 58 88 L 59 93 L 55 90 L 51 93 L 52 88 L 48 85 L 53 84 Z" fill="#FCC419" />
      <path d="M 145 75 L 146.5 78 L 150 78.5 L 147.5 81 L 148 84.5 L 145 82.5 L 142 84.5 L 142.5 81 L 140 78.5 L 143.5 78 Z" fill="#FCC419" />

      {/* Chibi blushing smile */}
      <path d="M 96 114 Q 100 118 104 114" fill="none" stroke="#2C3E50" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Tiny cute arms holding small spatula/spoon */}
      <path d="M 60 114 Q 50 116 58 126" fill="none" stroke="#5C6346" strokeWidth="3" strokeLinecap="round" />
      <path d="M 140 114 Q 150 116 142 126" fill="none" stroke="#5C6346" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(138, 114) rotate(15)">
        <line x1="0" y1="5" x2="15" y2="20" stroke="#BC6C4D" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="16" cy="21" rx="5" ry="4" fill="#BC6C4D" />
      </g>

      {/* Cute tiny feet */}
      <ellipse cx="88" cy="148" rx="8" ry="4" fill="#CCD1B6" stroke="#5C6346" strokeWidth="2.5" />
      <ellipse cx="112" cy="148" rx="8" ry="4" fill="#CCD1B6" stroke="#5C6346" strokeWidth="2.5" />

      {/* Gradient definitions */}
      <defs>
        <radialGradient id="pameokiGrad" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F4F8E4" />
          <stop offset="100%" stopColor="#E0E6C5" />
        </radialGradient>
      </defs>
    </svg>
  );
}

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onCook: (recipe: Recipe) => void;
  isAlreadyCooked: boolean;
  isSaved?: boolean;
  onToggleSave?: (recipe: Recipe) => void;
  onUploadCustomImage?: (recipe: Recipe, base64: string) => void;
}

export default function RecipeDetail({
  recipe,
  onBack,
  onCook,
  isAlreadyCooked,
  isSaved = false,
  onToggleSave,
  onUploadCustomImage,
}: RecipeDetailProps) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showCharacterFlag, setShowCharacterFlag] = useState(() => {
    if (recipe.customImage) return false;
    const preferChar = localStorage.getItem(`pameoki_prefer_char_${recipe.name}`);
    return preferChar === "true" || (preferChar === null && isFallbackRecipeImage(recipe.name));
  });

  // Reset image error state and calculate character preference when recipe changes
  useEffect(() => {
    setImageError(false);
    if (recipe.customImage) {
      setShowCharacterFlag(false);
      return;
    }
    const preferChar = localStorage.getItem(`pameoki_prefer_char_${recipe.name}`);
    if (preferChar !== null) {
      setShowCharacterFlag(preferChar === "true");
    } else {
      setShowCharacterFlag(isFallbackRecipeImage(recipe.name));
    }
  }, [recipe.name, recipe.customImage]);

  const toggleCharacterMode = () => {
    const newVal = !showCharacterFlag;
    setShowCharacterFlag(newVal);
    localStorage.setItem(`pameoki_prefer_char_${recipe.name}`, newVal ? "true" : "false");
  };

  const getPameokiSlogan = (name: string) => {
    return getPameokiMotivationalSlogan(name);
  };

  // Simple ratios for macronutrient visuals (let's assume total mass is carbs + protein + fat)
  const totalMacros = recipe.macronutrients.carbs + recipe.macronutrients.protein + recipe.macronutrients.fat;
  const carbPercent = totalMacros > 0 ? (recipe.macronutrients.carbs / totalMacros) * 100 : 0;
  const protPercent = totalMacros > 0 ? (recipe.macronutrients.protein / totalMacros) * 100 : 0;
  const fatPercent = totalMacros > 0 ? (recipe.macronutrients.fat / totalMacros) * 100 : 0;

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-5 md:p-6 shadow-lg space-y-6 relative font-sans">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/40 gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#5C6346] hover:text-[#2D3120] font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          추천 목록으로 돌아가기
        </button>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(recipe)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                isSaved
                  ? "bg-[#BC6C4D]/10 text-[#BC6C4D] border-[#BC6C4D]/30"
                  : "bg-white/40 hover:bg-white/80 text-[#5C6346] border-stone-200"
              }`}
            >
              <Heart className={`w-3 h-3 ${isSaved ? "fill-[#BC6C4D]" : ""}`} />
              <span>{isSaved ? "보관 해제" : "레시피 보관"}</span>
            </button>
          )}
          <span className="text-[10px] text-[#5C6346] font-mono font-bold">가성비 분석 최적화</span>
        </div>
      </div>

      {/* Hero Header with Meta specifications */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] bg-[#BC6C4D]/10 text-[#BC6C4D] border border-[#BC6C4D]/25 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 duration-300">
            <TrendingDown className="w-3 h-3" />
            장보기 비용 {formatCurrency(recipe.savingsAmount)} 방어 성공
          </span>
          <span className="text-[10px] bg-[#5C6346]/10 text-[#5C6346] border border-[#5C6346]/25 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            조리 난이도: {recipe.complexity}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-[#2D3120] font-sans leading-tight">
          {recipe.name}
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-semibold italic">
          ❝ {recipe.description} ❞
        </p>
      </div>

      {/* Recipe Photo with custom upload option */}
      <div className="space-y-3 font-sans">
        {(showCharacterFlag || imageError) ? (
          <div 
            onClick={() => setIsImageZoomed(true)}
            className="relative w-full min-h-[260px] md:min-h-[320px] rounded-[24px] overflow-hidden border-2 border-dashed border-[#BC6C4D]/35 bg-gradient-to-br from-[#FAF9F6] via-[#F4F6EC] to-[#E3E7D0] flex flex-col items-center justify-center p-6 cursor-zoom-in group shadow-md hover:shadow-lg transition-all duration-300"
            title="파먹이 조언 크게 보기 (클릭)"
          >
            <PameokiCharacter className="w-24 h-24 md:w-32 md:h-32 animate-bounce mt-1" />
            
            <div className="text-center max-w-md space-y-2.5 mt-4 px-2">
              <span className="inline-block text-xs bg-[#BC6C4D] text-[#FAF9F6] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                📸 오늘의 파먹기 기록을 남겨주세요!
              </span>
              <p className="text-[#2D3120] font-black text-sm md:text-base font-sans leading-relaxed filter drop-shadow-3xs px-1 text-center">
                "{getPameokiSlogan(recipe.name)}"
              </p>
              <div className="text-[10px] text-stone-500 font-bold bg-white/70 py-1 px-3 rounded-lg border border-stone-100 inline-block">
                🥦 배달 대신 집밥 완성 후 사진을 직접 올려 기록을 빛내주세요!
              </div>
            </div>
            {/* Quick click zoom in hover text overlay */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3 pointer-events-none">
              <span className="text-xs bg-[#5C6346] text-white font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                <ZoomIn className="w-3.5 h-3.5" /> 대형 화면으로 보기
              </span>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsImageZoomed(true)}
            className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-white/80 shadow-md cursor-zoom-in group"
            title="사진 크게 보기 (클릭)"
          >
            <img
              src={recipe.customImage || getRecipeImage(recipe.name)}
              alt={recipe.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700 animate-fade-in"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            {/* Magnifier hover indicator overlay */}
            <div className="absolute inset-0 bg-[#5C6346]/10 group-hover:bg-[#5C6346]/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 text-[#5C6346] backdrop-blur-md p-3 rounded-full flex items-center justify-center shadow-md scale-95 group-hover:scale-100 transition-transform duration-300 border border-white/40">
                <ZoomIn className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#5C6346]/35 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 bg-[#5C6346]/85 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 filter drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.3)] z-10">
              <span>🍽️</span> 연출용 가상 요리 사진
            </div>
            <div className="absolute bottom-3 left-4 text-xs font-bold text-white flex items-center gap-1.5 filter drop-shadow-[0_1px_2.5px_rgba(45,49,32,0.55)] z-10">
              {recipe.customImage ? (
                <span className="bg-[#5C6346]/95 backdrop-blur-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-sans">
                  📸 내가 직접 조리한 요리 사진 (인증 완료 - 확대 가능)
                </span>
              ) : (
                <span className="bg-[#BC6C4D]/85 backdrop-blur-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-sans">
                  🍳 AI 추천 요리 가이드 비주얼 (확대 가능)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toggle button to switch between Character and Virtual Stock Photo when no custom photo uploaded */}
        {!recipe.customImage && !imageError && (
          <div className="flex justify-end pr-1 mt-1">
            <button
              type="button"
              onClick={toggleCharacterMode}
              className="text-[9.5px] font-black px-3 py-1 bg-[#EEF0E5] hover:bg-[#E3E6D7] text-[#5C6346] border border-[#CCD1B6]/70 rounded-full flex items-center gap-1 cursor-pointer transition-all active:scale-95 duration-100 shadow-3xs"
              title="대표 이미지와 파먹이 캐릭터 중 선택하기"
            >
              {showCharacterFlag ? (
                <>
                  <span>🖼️</span> 가상 요리 사진으로 보기
                </>
              ) : (
                <>
                  <span>🤖</span> 사진이 잘 매칭되지 않나요? 파먹이 캐릭터로 보기
                </>
              )}
            </button>
          </div>
        )}

        {/* Custom recipe photo uploader row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-white/70 border border-white/95 rounded-2xl shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[11px] font-black text-[#5C6346] flex items-center gap-1">
              📸 내 요리 인증 완수 갤러리 등록
            </span>
            <span className="text-[10px] text-stone-500 block leading-tight font-semibold">
              이 레시피로 요리를 마쳤다면 실제 완성본 요리 사진을 올려 자랑하고 보관해보세요!
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {recipe.customImage && (
              <button
                onClick={() => {
                  if (confirm("직접 올린 사진을 비우고 기본 비주얼 이미지로 돌아가시겠습니까?")) {
                    onUploadCustomImage?.(recipe, "");
                  }
                }}
                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100/80 border border-rose-100 rounded-lg text-[10px] font-bold duration-150 cursor-pointer"
              >
                사진 비우기
              </button>
            )}
            <label className="px-3.5 py-1.5 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-lg text-[10px] font-extrabold tracking-tight cursor-pointer duration-150 flex items-center gap-1 shadow-sm select-none">
              <Camera className="w-3.5 h-3.5" />
              <span>{recipe.customImage ? "조리 후기 사진 교체" : "내 실제 요리 사진 추가"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      onUploadCustomImage?.(recipe, base64);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Grid: Left column (Ingredients & Nutrition) & Right column (Steps) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (Ingredients lists and food energy metrics) */}
        <div className="md:col-span-5 space-y-5">
          {/* Ingredients list block */}
          <div className="p-4 bg-white/70 backdrop-blur-xs border border-white/80 rounded-2xl shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-[#2D3120] flex items-center gap-1.5 pb-1 border-b border-neutral-100 uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 text-[#5C6346]" />
              식자재 전술 배치
            </h4>

            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1">
                    {ing.isFromRefrigerator ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5C6346]" title="보유 중인 냉장고 재료" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C4D]" title="기본 소스 및 가벼운 시판 재료" />
                    )}
                    <span className={ing.isFromRefrigerator ? "font-bold text-[#2D3120]" : "text-stone-500 font-medium"}>
                      {ing.name}
                    </span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-bold">{ing.amount}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-100 flex justify-between text-[9px] text-[#5C6346] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C6346]" /> 냉장고 재료
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C4D]" /> 양념/조미료 추가
              </span>
            </div>
          </div>

          {/* Calorie & Nutrition statistics */}
          <div className="p-4 bg-white/70 backdrop-blur-xs border border-white/80 rounded-2xl shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-[#2D3120] flex items-center gap-1.5 pb-1 border-b border-neutral-100 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-[#BC6C4D]" />
              에너지 및 탄단지 칼로리 분석
            </h4>

            <div className="flex justify-between items-center bg-white/60 py-1.5 px-3 rounded-xl border border-white/80">
              <span className="text-[11px] text-[#5C6346] font-bold">총 열량</span>
              <span className="font-mono text-xs font-black text-[#2D3120]">{recipe.calorie} kcal</span>
            </div>

            {/* Micro progress line segments */}
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-0.5">
                  <span>탄수화물 (Carbs)</span>
                  <span className="font-bold">{recipe.macronutrients.carbs}g</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${carbPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-0.5">
                  <span>단백질 (Protein)</span>
                  <span className="font-bold">{recipe.macronutrients.protein}g</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${protPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-0.5">
                  <span>지방 (Fat)</span>
                  <span className="font-bold">{recipe.macronutrients.fat}g</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${fatPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Steps list) */}
        <div className="md:col-span-7 space-y-4">
          <div className="p-4 bg-white/70 backdrop-blur-xs border border-white/80 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-[#2D3120] flex items-center gap-1.5 pb-1 border-b border-neutral-100 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-[#5C6346]" />
              차근차근 조리 로드맵
            </h4>

            <div className="space-y-3.5">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-[#5C6346] text-white border border-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                    {idx + 1}
                  </span>
                  <p className="text-stone-700 text-xs sm:text-sm pt-0.5 font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Master Hack tip */}
          <div className="p-4 bg-orange-50/40 backdrop-blur-xs border border-[#BC6C4D]/35 rounded-2xl flex gap-3.5 shadow-3xs">
            <div className="w-10 h-10 rounded-full border border-[#2D3120] bg-white overflow-hidden shrink-0 shadow-sm relative">
              <img
                src={pamugiMascot}
                alt="파먹이"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 text-xs bg-white/95 rounded-full p-0.5 shadow-3xs leading-none">💡</span>
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-[#BC6C4D]">파먹이네 잔반방지 지혜 주머니:</h5>
              <p className="text-[10px] text-stone-600 leading-relaxed mt-0.5 font-semibold">{recipe.tip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bottom log cooking action CTA */}
      <div className="pt-2 border-t border-white/40 flex justify-end">
        <button
          onClick={() => onCook(recipe)}
          disabled={isAlreadyCooked}
          className={`flex items-center gap-1.5 font-bold py-3.5 px-7 rounded-2xl text-xs sm:text-sm transition-all shadow-md select-none cursor-pointer ${
            isAlreadyCooked
              ? "bg-white/40 border border-white/60 text-stone-400 cursor-not-allowed"
              : "bg-[#5C6346] hover:bg-[#4d5239] text-white shadow-lg"
          }`}
        >
          <CalendarCheck className="w-4.5 h-4.5" />
          {isAlreadyCooked ? (
            <span>이미 식비 아끼기 기록에 반영된 요리입니다!</span>
          ) : (
            <span>이 요리 만들어 먹고 식비 세이빙에 실시간 반영하기</span>
          )}
        </button>
      </div>

      {/* Dynamic Photo Zoom Lightbox Modal */}
      {isImageZoomed && (
        <div 
          className="fixed inset-0 bg-[#F5F6F0]/95 backdrop-blur-lg z-[9999] flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setIsImageZoomed(false)}
        >
          {/* Close button at top corner */}
          <button 
            onClick={() => setIsImageZoomed(false)}
            className="absolute top-4 right-4 md:top-8 md:right-8 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-full p-2.5 transition-all cursor-pointer shadow-md z-50 hover:scale-105 duration-150 border border-white/20"
            title="닫기 (Close)"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Expanded High resolution Image with NO black surrounding frame box */}
          <div 
            className="relative max-w-[95vw] max-h-[82vh] flex items-center justify-center m-auto"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image container itself
          >
            {imageError ? (
              <div className="bg-gradient-to-br from-[#FAF9F6] to-[#E3E7D0] p-10 md:p-14 rounded-[32px] flex flex-col items-center justify-center space-y-5 max-w-md text-center shadow-2xl border-4 border-white animate-fade-in font-sans">
                <PameokiCharacter className="w-28 h-28 md:w-36 md:h-36 animate-bounce" />
                <div className="space-y-3">
                  <span className="inline-block text-xs bg-[#BC6C4D] text-[#FAF9F6] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                    📸 오늘의 파먹기 기록을 남겨주세요!
                  </span>
                  <p className="text-[#2D3120] font-black text-sm md:text-base leading-relaxed filter drop-shadow-3xs">
                    "{getPameokiSlogan(recipe.name)}"
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={recipe.customImage || getRecipeImage(recipe.name)}
                alt={recipe.name}
                className="max-w-[98vw] max-h-[90vh] md:max-w-[96vw] md:max-h-[86vh] object-contain select-none duration-300 transition-all cursor-zoom-out hover:scale-103 rounded-3xl shadow-2xl border-4 md:border-8 border-white"
                onClick={() => setIsImageZoomed(false)}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="mt-4 md:mt-5 text-center space-y-1 max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[#2D3120] font-black text-sm md:text-base tracking-tight font-sans">
              {recipe.name}
            </h3>
            <p className="text-[#5C6346] font-semibold text-[10px] md:text-xs">
              {recipe.customImage 
                ? "✨ 내가 직접 만들어 아끼고 구출해 낸 소중한 집밥 실천 인증 사진" 
                : "인공지능 멘토 파먹이가 선물한 가이드 비주얼"}
            </p>
            <button
              onClick={() => setIsImageZoomed(false)}
              className="mt-3 text-[11px] px-5 py-2 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-xl font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
