import React, { useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  Award,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  PiggyBank,
  CheckCircle,
  Clock,
  Flame,
  X,
} from "lucide-react";
import { SavingsLog, BudgetStats, Recipe } from "../types";
import { formatCurrency, getRecipeImage } from "../utils";
import { PameokiCharacter } from "./RecipeDetail";

interface DashboardProps {
  logs: SavingsLog[];
  stats: BudgetStats;
  onAddManualLog: (log: Omit<SavingsLog, "id" | "date"> & { date: string }) => void;
  onDeleteLog: (id: string) => void;
  onUpdateBudget: (monthlyLimit: number) => void;
  onViewRecipe?: (recipe: Recipe) => void;
}

// Safe self-contained thumbnail component with automatic fallback handling
function DashboardImage({ log }: { log: SavingsLog }) {
  const [failed, setFailed] = useState(false);
  const customImg = log.customImage || log.recipeSnapshot?.customImage;
  
  if (!customImg || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FAF9F6] to-[#EAECE0] flex items-center justify-center p-1 select-none" title="파먹이 요리">
        <PameokiCharacter className="w-8 h-8 opacity-90 animate-pulse" />
      </div>
    );
  }
  
  return (
    <img
      src={customImg}
      alt={log.recipeSnapshot?.name || "요리"}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function Dashboard({
  logs,
  stats,
  onAddManualLog,
  onDeleteLog,
  onUpdateBudget,
  onViewRecipe,
}: DashboardProps) {
  // Budget modification states
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState(stats.monthlyLimit.toString());
  const [dashboardSubTab, setDashboardSubTab] = useState<"logs" | "weekly" | "monthly">("logs");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("");

  // Manual Log Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSavings, setManualSavings] = useState("");
  const [manualPurpose, setManualPurpose] = useState("홈밥");
  const [manualIngredients, setManualIngredients] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [formError, setFormError] = useState("");

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseInt(newBudgetVal.replace(/[^0-9]/g, ""), 10);
    if (isNaN(limitNum) || limitNum <= 0) {
      return;
    }
    onUpdateBudget(limitNum);
    setIsEditingBudget(false);
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const title = manualTitle.trim();
    const savings = parseInt(manualSavings.replace(/[^0-9]/g, ""), 10);
    if (!title) {
      setFormError("식비 절감 항목 이름이나 대체 내용을 입력해 주세요.");
      return;
    }
    if (isNaN(savings) || savings <= 0) {
      setFormError("0보다 큰 올바른 절역 비용을 설정해 주세요.");
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const ingredientsArr = manualIngredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    onAddManualLog({
      date: todayDate,
      recipeName: title,
      savingsAmount: savings,
      purpose: manualPurpose,
      ingredientsSaved: ingredientsArr,
      notes: manualNotes.trim() || undefined,
    });

    // Reset Form
    setManualTitle("");
    setManualSavings("");
    setManualPurpose("홈밥");
    setManualIngredients("");
    setManualNotes("");
    setShowAddForm(false);
  };

  // Dynamic calculations for reports
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  // Projected Month-End Savings
  const dailyAverage = stats.savedTotal / Math.max(currentDay, 1);
  const projectedSavings = Math.round(dailyAverage * daysInMonth);

  // Get last 7 days of logs and group by date for Weekly Chart
  const getLast7DaysData = () => {
    const data = [];
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = weekdays[d.getDay()];
      
      const daySavings = logs
        .filter((log) => log.date === dateStr)
        .reduce((sum, log) => sum + log.savingsAmount, 0);

      data.push({
        dateStr,
        dayLabel: `${dayName}(${d.getDate()}일)`,
        amount: daySavings,
      });
    }
    return data;
  };

  const weeklyData = getLast7DaysData();
  const maxWeeklyAmount = Math.max(...weeklyData.map(d => d.amount), 5000); // Prevent divide by zero and style height proportion

  // Group Savings by Category for Breakdown
  const getCategoryBreakdown = () => {
    const categories: { [key: string]: number } = {
      "홈밥": 0,
      "도시락": 0,
      "유아식": 0,
      "간식": 0,
      "야식": 0,
    };

    logs.forEach((log) => {
      const cat = log.purpose || "홈밥";
      if (categories[cat] !== undefined) {
        categories[cat] += log.savingsAmount;
      } else {
        categories["홈밥"] += log.savingsAmount;
      }
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return Object.entries(categories).map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const categoryBreakdown = getCategoryBreakdown();

  // Fun helper to output level title based on total KRW savings
  const getSavingsLevel = (amt: number) => {
    if (amt < 20000) return { title: "새싹 요리사 🌱", desc: "냉장고 비우기를 열심히 하는 초보 요리사예요!" };
    if (amt < 60000) return { title: "알뜰 요리사 🍳", desc: "남은 재료를 버리지 않고 알차게 요리해요!" };
    if (amt < 150000) return { title: "냉장고 고수 🌟", desc: "식재료도 아끼고 마트 방문도 획기적으로 줄인 고수!" };
    return { title: "절약의 수호신 ⚡", desc: "배달음식을 이겨내고 식비를 꽉 잡은 요리의 달인!" };
  };

  const levelInfo = getSavingsLevel(stats.savedTotal);

  // Dynamic progress percentage (Total Saved relative to limit)
  const budgetRatio = stats.monthlyLimit > 0 ? (stats.savedTotal / stats.monthlyLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 1. Hero Summary Scorebards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* cumulative savings metric card */}
        <div className="bg-[#5C6346] text-[#FAF9F6] p-5 rounded-[28px] shadow-lg border border-[#5C6346] relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute right-3 bottom-0 text-white/10 select-none">
            <PiggyBank className="w-28 h-28 transform translate-y-3 pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[#E9EBD8] text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4 text-orange-200 fill-orange-200" />
              <span>🪙 지금까지 아낀 돈</span>
            </div>
            <h2 className="text-3xl font-black font-sans mt-2">{formatCurrency(stats.savedTotal)}</h2>
          </div>
          <p className="text-[11px] text-[#E9EBD8]/90 font-bold pt-3 border-t border-white/15 z-10 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-orange-200" />
            집밥 먹고 이만큼이나 절약했어요!
          </p>
        </div>

        {/* Current target custom limits card */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5C6346] font-bold uppercase tracking-wider">🎯 이번 달 절약 목표</span>
              <button
                onClick={() => setIsEditingBudget(!isEditingBudget)}
                className="text-xs text-[#BC6C4D] hover:text-[#9A5337] font-bold cursor-pointer transition-colors"
               >
                {isEditingBudget ? "닫기" : "설정 수정"}
              </button>
            </div>
            
            {isEditingBudget ? (
              <form onSubmit={handleBudgetSubmit} className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={newBudgetVal}
                  onChange={(e) => setNewBudgetVal(e.target.value)}
                  className="w-full px-3 py-1 bg-white/80 border border-neutral-300 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold text-[#2D3120]"
                  placeholder="예: 500,000"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#5C6346] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  저장
                </button>
              </form>
            ) : (
              <h2 className="text-2xl font-extrabold text-[#2D3120] font-sans mt-1">
                {formatCurrency(stats.monthlyLimit)}
              </h2>
            )}
          </div>

          <div className="mt-2.5">
            <div className="flex justify-between text-[11px] text-[#5C6346] font-bold mb-1">
              <span>목표 달성률</span>
              <span>{budgetRatio.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-white/40 border border-white/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5C6346] to-[#BC6C4D] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(budgetRatio, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fun level tier progress card */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-xs text-[#BC6C4D] font-black uppercase tracking-wider">🌱 파먹이와 친밀도</span>
            <h4 className="font-extrabold text-[#2D3120] font-sans mt-1 flex items-center gap-1 text-sm md:text-base">
              <Flame className="w-4 h-4 text-[#BC6C4D] fill-[#BC6C4D]" />
              {levelInfo.title}
            </h4>
            <p className="text-[10px] text-[#5C6346] font-semibold leading-tight mt-1">
              {levelInfo.desc}
            </p>
          </div>

          <div className="pt-2.5 border-t border-white/40 flex items-center justify-between text-[11px] text-[#5C6346] font-bold">
            <span>총 {logs.length}번 아꼈어요</span>
            <span className="text-[#BC6C4D] animate-pulse">친밀도 오르는 중! ⚡</span>
          </div>
        </div>
      </div>

      {/* Sub tabs navigation inside Dashboard */}
      <div className="flex border-b border-stone-200/60 pb-1.5 gap-2 md:gap-5 font-sans">
        <button
          onClick={() => setDashboardSubTab("logs")}
          className={`pb-2.5 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === "logs"
              ? "border-[#5C6346] text-[#2D3120]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          📝 절약 일기 (식비 기록)
        </button>
        <button
          onClick={() => setDashboardSubTab("weekly")}
          className={`pb-2.5 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === "weekly"
              ? "border-[#5C6346] text-[#2D3120]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          📊 이번 주 통계
        </button>
        <button
          onClick={() => setDashboardSubTab("monthly")}
          className={`pb-2.5 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === "monthly"
              ? "border-[#5C6346] text-[#2D3120]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          📅 이번 달 통계
        </button>
      </div>

      {/* Render sub branch layout based on sub tabs selection */}
      {dashboardSubTab === "logs" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History of protected log items */}
          <div className="lg:col-span-8 bg-white/50 backdrop-blur-md border border-white/60 rounded-[32px] p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/40">
              <div>
                <h3 className="font-bold text-[#2D3120] text-sm md:text-base flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle className="w-4.5 h-4.5 text-[#5C6346]" />
                  📋 내가 기록한 절약 일기장
                </h3>
                <p className="text-[10px] text-[#5C6346]/80 font-semibold mt-0.5">
                  집에서 직접 요리해 먹으며 알뜰하게 돈을 아낀 기록들입니다.
                </p>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <span className="text-3xl">🍲</span>
                <p className="text-xs text-[#5C6346] font-bold leading-relaxed">
                  아직 오늘의 절약 기록이 없어요! <br />
                  파먹이에게 요리법을 추천받거나 오른쪽 일지에 작성해 보세요!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white/70 backdrop-blur-xs border border-white rounded-2xl flex items-start gap-4 shadow-sm hover:border-[#5C6346]/45 transition-all"
                  >
                    {/* Thumbnail if there is a recipe snapshot or custom image */}
                    {log.recipeSnapshot && (
                      <div 
                        onClick={() => {
                          const imgUrl = log.customImage || log.recipeSnapshot?.customImage || getRecipeImage(log.recipeSnapshot?.name || "");
                          setZoomImage(imgUrl);
                          setZoomTitle(log.recipeName);
                        }}
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-50 md:block hidden animate-fade-in cursor-zoom-in hover:scale-105 hover:shadow-xs active:scale-95 transition-all"
                        title="사진 크게 보기 (클릭)"
                      >
                        <DashboardImage log={log} />
                      </div>
                    )}

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-mono bg-[#E9EBD8] text-[#5C6346] font-extrabold px-2 py-0.5 rounded-md">
                          {log.purpose}
                        </span>
                        <span className="text-[9px] text-[#BC6C4D] font-mono ml-auto sm:ml-0 font-bold">
                          {log.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#2D3120] text-xs sm:text-sm truncate">{log.recipeName}</h4>
                        {log.recipeSnapshot && (
                          <button
                            onClick={() => onViewRecipe?.(log.recipeSnapshot!)}
                            className="text-[9px] bg-[#5C6346]/10 text-[#5C6346] px-1.5 py-0.5 rounded font-bold hover:bg-[#5C6346]/20 cursor-pointer shrink-0"
                            title="요리법 보기"
                          >
                            📖 요리법 보기
                          </button>
                        )}
                      </div>

                      {log.ingredientsSaved.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.ingredientsSaved.map((i) => (
                            <span
                              key={i}
                              className="bg-white/90 border border-[#E9EBD8] text-[9px] text-[#5C6346] font-extrabold px-2.5 py-0.5 rounded-full"
                            >
                              #{i}
                            </span>
                          ))}
                        </div>
                      )}
                      {log.notes && (
                        <p className="text-[10px] text-stone-500 leading-tight">💬 {log.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                      <span className="text-xs sm:text-sm font-black text-[#5C6346] font-serif">
                        +{formatCurrency(log.savingsAmount)}
                      </span>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="p-1 text-stone-300 hover:text-rose-600 rounded-lg cursor-pointer transition-colors mt-2"
                        title="내역 지우기"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Expense Protected Add Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-5 shadow-sm space-y-4 flex flex-col">
              <div className="flex items-center gap-1.5 pb-2 border-b border-white/40">
                <PiggyBank className="w-4.5 h-4.5 text-[#BC6C4D]" />
                <div>
                  <h4 className="font-bold text-[#2D3120] text-xs sm:text-sm font-sans uppercase tracking-wider">
                    📒 오늘 아낀 돈 적기
                  </h4>
                  <p className="text-[10px] text-[#5C6346] font-semibold mt-0.5">
                    내가 아낀 식비를 한눈에 보아요
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualLogSubmit} className="space-y-3.5 mt-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                    어떤 요리를 하셨나요? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 배달 대신 두부김치"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                      아낀 돈 (원) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="예: 18000"
                      value={manualSavings}
                      onChange={(e) => setManualSavings(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                      종류
                    </label>
                    <select
                      value={manualPurpose}
                      onChange={(e) => setManualPurpose(e.target.value)}
                      className="w-full px-2 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-bold shadow-inner h-[34px]"
                    >
                      <option value="홈밥">홈밥 🏠</option>
                      <option value="도시락">도시락 🍱</option>
                      <option value="유아식">유아식 👶</option>
                      <option value="간식">간식 🍪</option>
                      <option value="야식">야식 🌌</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                    사용한 재료 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김치, 두부, 양파"
                    value={manualIngredients}
                    onChange={(e) => setManualIngredients(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                    한 줄 느낌 / 메모
                  </label>
                  <textarea
                    placeholder="예: 배달 대신 집밥 만들어 돈도 아끼고 건강도 챙겼어요!"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner h-16 resize-none"
                  />
                </div>

                {formError && (
                  <p className="text-[10px] text-rose-600 font-bold">{formError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> 등록하기 ✍️
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : dashboardSubTab === "weekly" ? (
        /* WEEKLY REPORT TAB VIEW */
        <div className="bg-white/50 backdrop-blur-md border border-white/60 rounded-[32px] p-5 md:p-6 shadow-sm space-y-6 animate-fade-in font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200/50 gap-2">
            <div>
              <h3 className="font-bold text-[#2D3120] text-sm md:text-base flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-4.5 h-4.5 text-[#5C6346]" />
                이번 주 절약 리포트
              </h3>
              <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                지난 일주일 동안 식비를 얼마나 아꼈는지 한눈에 보여드려요.
              </p>
            </div>
            
            <div className="bg-[#5C6346]/10 px-3 py-1 rounded-xl text-right shrink-0">
              <span className="text-[10px] font-extrabold text-[#5C6346] block uppercase">최근 7일간 아낀 돈</span>
              <span className="text-sm font-black text-[#5C6346] font-serif">
                {formatCurrency(weeklyData.reduce((sum, d) => sum + d.amount, 0))}
              </span>
            </div>
          </div>

          {/* Interactive Responsive SVG Bar Chart for 7 Days */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-[#2D3120] uppercase tracking-wider">🗓️ 요일별 아낀 금액</h4>
            <div className="bg-white/70 border border-stone-100 p-5 rounded-2xl shadow-inner flex flex-col justify-end min-h-[220px]">
              {/* Daily bars flex row */}
              <div className="flex items-end justify-between gap-2 h-[130px] w-full pt-4">
                {weeklyData.map((day) => {
                  const percentage = (day.amount / maxWeeklyAmount) * 100;
                  return (
                    <div key={day.dateStr} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 scale-0 group-hover:scale-100 bg-[#2D3120] text-white text-[9px] font-sans font-bold py-1 px-1.5 rounded shadow-lg transition-transform pointer-events-none whitespace-nowrap z-30">
                        {formatCurrency(day.amount)} 절약
                      </div>

                      {/* Display amount label always if > 0 */}
                      {day.amount > 0 && (
                        <span className="text-[9px] font-serif font-black text-[#5C6346] mb-1">
                          {formatCurrency(day.amount).replace(/원/, '')}
                        </span>
                      )}

                      {/* Vertical Chart Bar */}
                      <div className="w-full max-w-[24px] bg-stone-100 border border-stone-200/50 rounded-t-lg h-full flex items-end">
                        <div
                          style={{ height: `${Math.max(percentage, 3)}%` }}
                          className={`w-full rounded-t-lg transition-all duration-700 ${
                            day.amount > 0 
                              ? "bg-gradient-to-t from-[#5C6346] to-[#BC6C4D] group-hover:brightness-110 shadow-3xs" 
                              : "bg-stone-200/50"
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span className="text-[9px] font-extrabold text-[#5C6346] mt-2 truncate max-w-full">
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Habits Insight */}
            <div className="p-4 bg-white/75 border border-white rounded-2xl shadow-3xs space-y-2">
              <h4 className="text-xs font-black text-[#5C6346] flex items-center gap-1">
                ⭐ 파먹이의 응원 메세지
              </h4>
              <div className="space-y-1.5 text-[11px] text-[#4E4A42] leading-relaxed">
                <p className="font-semibold">
                  이번 주에는 집밥 요리를 <strong className="text-[#BC6C4D]">{logs.filter(l => l.recipeSnapshot).length}번</strong> 만들었네요!
                </p>
                <p className="text-stone-500">
                  {logs.length > 2 
                    ? "집밥을 정말 자주 드시고 계시네요! 냉장고 재료를 최고로 잘 쓰고 계시는 알뜰요리 고수님이십니다. 계속 화이팅해봐요!"
                    : "냉장고에 남은 감자, 계란, 밥을 활용해서 조금 더 밥상을 채워보시는건 어떨까요? 언제든 도전에 도움을 드립니다!"}
                </p>
              </div>
            </div>

            {/* Smart Coaching Plan */}
            <div className="p-4 bg-white/75 border border-white rounded-2xl shadow-3xs space-y-2">
              <h4 className="text-xs font-black text-[#BC6C4D] flex items-center gap-1">
                💡 돈 아끼는 꿀팁
              </h4>
              <ul className="space-y-1 text-[11px] text-[#4E4A42] list-disc pl-4 font-semibold">
                <li>배달 생각이 심해지는 수요일이나 목요일 저녁에 집밥을 만들어 먹어보세요, 몇 만원씩 아낄 수 있습니다.</li>
                <li>남은 야채는 잘 썰어서 냉동실에 보관해 두면, 다음번에 볶음밥을 아주 쉽고 빠르게 완성해 먹을 수 있답니다.</li>
                <li>마트에 들러 장을 보기 전에 미리 필요한 목록들을 종이에 적어가면, 필요 없는 과소비를 완벽하게 막을 수 있어요.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* MONTHLY REPORT TAB VIEW */
        <div className="bg-white/50 backdrop-blur-md border border-white/60 rounded-[32px] p-5 md:p-6 shadow-sm space-y-6 animate-fade-in font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200/50 gap-2">
            <div>
              <h3 className="font-bold text-[#2D3120] text-sm md:text-base flex items-center gap-1.5 uppercase tracking-wider">
                <DollarSign className="w-4.5 h-4.5 text-[#BC6C4D]" />
                이번 달 예산 및 절약 리포트
              </h3>
              <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                이번 달 예산 목표와 지금까지 아낀 성적표를 한눈에 보여드려요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Horizontal budget progress gauge & Category breakdown */}
            <div className="lg:col-span-7 bg-white/40 border border-white p-5 rounded-2xl shadow-3xs space-y-5">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-[#5C6346] block uppercase tracking-wider">📊 이번 달 점검</span>
                
                <div className="p-4 bg-white/70 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-500 font-bold block">요리해서 아낀 총 금액</span>
                    <span className="text-xl font-black text-[#5C6346] font-serif">{formatCurrency(stats.savedTotal)}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-stone-200" />
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-stone-500 font-bold block">내가 정한 한달 목표액</span>
                    <span className="text-xl font-black text-[#2D3120] font-serif">{formatCurrency(stats.monthlyLimit)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-[#5C6346] pt-1">
                    <span>목표 진행 정도</span>
                    <span>{budgetRatio.toFixed(1)}% ({budgetRatio >= 100 ? "목표 달성! 🎉" : "절약 중"})</span>
                  </div>
                  <div className="w-full h-3 bg-white border border-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#5C6346] via-[#BABC9F] to-[#BC6C4D] rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(budgetRatio, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Category-wise Savings Breakdown representation */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                <span className="text-[11px] font-black text-[#5C6346] block uppercase tracking-wider">🥗 종류별 아낀 비중</span>
                
                <div className="space-y-2.5">
                  {categoryBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-[#4E4A42]">
                        <span>{item.name}</span>
                        <span>{formatCurrency(item.amount)} ({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/80 border border-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5C6346] opacity-85 rounded-full transition-all duration-700"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Savings forecasts simulation cardboard */}
            <div className="lg:col-span-5 bg-white/60 backdrop-blur-xs border border-white p-5 rounded-2xl shadow-3xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#BC6C4D] flex items-center gap-1.5 uppercase tracking-wider">
                  🔮 파먹이의 월말 예상 아낌이 계산기
                </h4>
                <p className="text-[10px] text-stone-500 leading-tight">
                  지금까지 아낀 평균 속도를 기준으로, 이번 달 말까지 최종적으로 아낄 수 있는 예상 금액을 계산해 보았어요.
                </p>
              </div>

              {/* Simulation metrics display */}
              <div className="p-4 bg-[#5C6346]/5 rounded-xl border border-[#5C6346]/10 text-center space-y-2.5 my-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#5C6346] block">이번 달 예상 최종 절약액</span>
                  <span className="text-2xl font-black text-[#5C6346] font-serif filter drop-shadow-5xs">
                    {formatCurrency(projectedSavings)}
                  </span>
                </div>
                
                <div className="bg-white/85 p-2 rounded-lg border border-stone-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#4E4A42]">
                    <span>목표 대비 예상률</span>
                    <span className={`${projectedSavings >= stats.monthlyLimit ? "text-[#5C6346]" : "text-[#BC6C4D]"}`}>
                      {stats.monthlyLimit > 0 ? ((projectedSavings / stats.monthlyLimit) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <p className="text-[9px] text-left text-stone-500 leading-tight mt-1 font-semibold">
                    {projectedSavings >= stats.monthlyLimit 
                      ? "🎉 훌륭합니다! 지금 속도를 계속 유지하신다면 이번 달 약속한 절약 목표를 완벽하게 돌파할 수 있어요!"
                      : "💡 조금만 힘내면 목표에 도달할 수 있어요! 냉장고에 수줍게 남아있는 야채들을 활용해서 배달을 조금만 더 줄여볼까요?"}
                  </p>
                </div>
              </div>

              {/* Annual extrapolation encouragement speech */}
              <div className="text-[10px] text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                <p className="font-bold">
                  🚀 <span className="text-[#BC6C4D]">장기적 혜택:</span> 이 알뜰한 습관을 1년 동안 쭉 이어가면, 무려 1년에 약 <strong className="text-[#5C6346] font-serif text-xs">{formatCurrency(projectedSavings * 12)}</strong>을 아껴서 저금할 수 있습니다! 정말 대단해요!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absolute fullscreen image lightbox overlay */}
      {zoomImage && (
        <div 
          className="fixed inset-0 bg-[#F5F6F0]/95 backdrop-blur-lg z-[9999] flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setZoomImage(null)}
        >
          {/* Close trigger */}
          <button 
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 md:top-8 md:right-8 bg-[#5C6346] hover:bg-[#4d5239] text-white rounded-full p-2.5 transition-all cursor-pointer shadow-md z-50 hover:scale-105 duration-150 border border-white/20"
            title="닫기 (Close)"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* High resolution Image with NO black surrounding frame box */}
          <div 
            className="relative max-w-[95vw] max-h-[82vh] flex items-center justify-center m-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()} // Prevent bubble close
          >
            <img
              src={zoomImage}
              alt={zoomTitle || "식비 절약 완성 요리 사진"}
              className="max-w-[98vw] max-h-[90vh] md:max-w-[96vw] md:max-h-[86vh] object-contain select-none duration-300 transition-all cursor-zoom-out hover:scale-103 rounded-3xl shadow-2xl border-4 md:border-8 border-white"
              onClick={() => setZoomImage(null)}
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="mt-4 md:mt-5 text-center space-y-1 max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[#2D3120] font-black text-sm md:text-base tracking-tight font-sans">
              {zoomTitle || "식비 아끼기 성공 요리"}
            </h3>
            <p className="text-[#5C6346] font-semibold text-[10px] md:text-xs">
              🥦 냉장고에 있는 재료들로 아주 정성스럽고 건강하게 완성한 집밥 요리입니다!
            </p>
            <button
              onClick={() => setZoomImage(null)}
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
