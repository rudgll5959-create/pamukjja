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

interface DashboardProps {
  logs: SavingsLog[];
  stats: BudgetStats;
  onAddManualLog: (log: Omit<SavingsLog, "id" | "date"> & { date: string }) => void;
  onDeleteLog: (id: string) => void;
  onUpdateBudget: (monthlyLimit: number) => void;
  onViewRecipe?: (recipe: Recipe) => void;
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
    if (amt < 20000) return { title: "새싹 파먹러 🌱", desc: "이제 막 냉장고 절약을 시작해 나가는 비기너 요리사" };
    if (amt < 60000) return { title: "주부 9단 우등생 🍳", desc: "남은 야채를 버리지 않는 꼼꼼한 지출 수호 방위단" };
    if (amt < 150000) return { title: "우주 알뜰 고수 🌟", desc: "재료 유통기한을 미리 꿰뚫어 마트 붐비는 횟수를 줄이는 파먹마스터" };
    return { title: "식비의 절대 성벽 신 제우스 ⚡", desc: "배달음식 유혹을 완전 타파하고 냉장고 속 식물들을 생명 창조한 절정의 신수" };
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
              <span>누적 식비 철통 절감액</span>
            </div>
            <h2 className="text-3xl font-black font-sans mt-2">{formatCurrency(stats.savedTotal)}</h2>
          </div>
          <p className="text-[11px] text-[#E9EBD8]/90 font-bold pt-3 border-t border-white/15 z-10 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-orange-200" />
            내 냉장고 속에서 매달 부활시킨 식당 몫!
          </p>
        </div>

        {/* Current target custom limits card */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 p-5 rounded-[28px] shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5C6346] font-bold uppercase tracking-wider">이번 달 절약 목표 예산</span>
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
              <span>목표 방어 달성률</span>
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
            <span className="text-xs text-[#BC6C4D] font-black uppercase tracking-wider">파먹마스터 등급 달성</span>
            <h4 className="font-extrabold text-[#2D3120] font-sans mt-1 flex items-center gap-1 text-sm md:text-base">
              <Flame className="w-4 h-4 text-[#BC6C4D] fill-[#BC6C4D]" />
              {levelInfo.title}
            </h4>
            <p className="text-[10px] text-[#5C6346] font-semibold leading-tight mt-1">
              {levelInfo.desc}
            </p>
          </div>

          <div className="pt-2.5 border-t border-white/40 flex items-center justify-between text-[11px] text-[#5C6346] font-bold">
            <span>총 {logs.length}회 지출 방어 실적 쌓임</span>
            <span className="text-[#BC6C4D] animate-pulse">LV 계단 상승 중 ⚡</span>
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
          📂 식비 피드 & 일지 등록
        </button>
        <button
          onClick={() => setDashboardSubTab("weekly")}
          className={`pb-2.5 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === "weekly"
              ? "border-[#5C6346] text-[#2D3120]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          📅 주간 리포트 & 절약 분석
        </button>
        <button
          onClick={() => setDashboardSubTab("monthly")}
          className={`pb-2.5 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === "monthly"
              ? "border-[#5C6346] text-[#2D3120]"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          📊 월간 예산 리포트 & 예측
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
                  식비 절감 & 요리 구출 내역 일지
                </h3>
                <p className="text-[10px] text-[#5C6346]/80 font-semibold mt-0.5">
                  냉장고를 털며 집밥 요리를 완성해 절임한 장보기 내역
                </p>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <span className="text-3xl">🍲</span>
                <p className="text-xs text-[#5C6346] font-bold leading-relaxed">
                  아직 기록된 덮밥이나 찌개, 식비 절약 실적이 없습니다. <br />
                  채팅 멘토 파먹이에게 레시피를 주문하거나 아래 수동 절약 일지에 기입해 보세요!
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
                        <img
                          src={log.customImage || log.recipeSnapshot.customImage || getRecipeImage(log.recipeSnapshot.name)}
                          alt={log.recipeSnapshot.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
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
                            title="레시피 다시보기"
                          >
                            📖 레시피 다시보기
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
                              #{i} 구출
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
                    알뜰 절약내역 일지 작성
                  </h4>
                  <p className="text-[10px] text-[#5C6346] font-semibold mt-0.5">
                    나만의 가계부 절약 액수 보태기
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualLogSubmit} className="space-y-3.5 mt-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                    항목 이름 / 대체 명목 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 배달 대신 냉장고 두부김치"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                      추산 방어 비용 (원) *
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
                      카테고리
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
                    해결된 식재료 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 신김치, 두부, 양파"
                    value={manualIngredients}
                    onChange={(e) => setManualIngredients(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/70 text-stone-700 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5C6346] font-semibold shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5C6346] mb-1">
                    실천 비망록 / 감상평
                  </label>
                  <textarea
                    placeholder="예: 배달 치킨 22,000원 아끼고 건강도 구출 성공!"
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
                  <Plus className="w-4 h-4" /> 일지 추가 등록
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
                주간 식비 절감 분석 리포트
              </h3>
              <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                최근 7일간 냉장고 파먹기를 통한 일별 지출 절감 정밀 통계입니다.
              </p>
            </div>
            
            <div className="bg-[#5C6346]/10 px-3 py-1 rounded-xl text-right shrink-0">
              <span className="text-[10px] font-extrabold text-[#5C6346] block uppercase">최근 7일 지출 방어액</span>
              <span className="text-sm font-black text-[#5C6346] font-serif">
                {formatCurrency(weeklyData.reduce((sum, d) => sum + d.amount, 0))}
              </span>
            </div>
          </div>

          {/* Interactive Responsive SVG Bar Chart for 7 Days */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-[#2D3120] uppercase tracking-wider">🗓️ 7일간의 지출 절약 피크 통계</h4>
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
                          className={`w-full rounded-t-md transition-all duration-700 ${
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
                ⭐ 지출 방위 코치의 요리 분석
              </h4>
              <div className="space-y-1.5 text-[11px] text-[#4E4A42] leading-relaxed">
                <p className="font-semibold">
                  이번 주 실제 냉장고 파먹기를 기록한 횟수는 총 <strong className="text-[#BC6C4D]">{logs.filter(l => l.recipeSnapshot).length}회</strong> 입니다.
                </p>
                <p className="text-stone-500">
                  {logs.length > 2 
                    ? "주 2회 이상 고정 홈밥 일과를 달성하셨네요! 마트 가기 전 소량의 재료만으로 알차게 냉장고 식수를 유지해 나가고 있는 기품있는 살림꾼이십니다. 훌륭한 주간 리듬을 고수하고 계십니다."
                    : "아직 이번 주 주방 가동률을 더 올릴 수 있습니다! 감자, 계란, 밥 같은 필수 상비형 기본 재료들의 구출 탭을 활용해 간단한 볶음밥이나 찌개를 기획해보세요."}
                </p>
              </div>
            </div>

            {/* Smart Coaching Plan */}
            <div className="p-4 bg-white/75 border border-white rounded-2xl shadow-3xs space-y-2">
              <h4 className="text-xs font-black text-[#BC6C4D] flex items-center gap-1">
                💡 다음 주 냉장고 구출 장보기 가이드
              </h4>
              <ul className="space-y-1 text-[11px] text-[#4E4A42] list-disc pl-4 font-semibold">
                <li>배달 충동률이 높은 수/목요일 저녁 야식을 방어하면 주간 20,000원의 추가 세이빙이 가능합니다.</li>
                <li>남은 자투리 당근과 양파는 잘게 다진 후 보관 백에 얼려두면, 다음 주 볶음밥에 재투자할 수 있어 폐기 제로에 도달합니다!</li>
                <li>목표 예산 소진이 빨라지지 않도록 주말 마트는 명단 작성 후에만 방문을 기획하세요.</li>
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
                월간 목표 예산 & 예상 절감액 리포트
              </h3>
              <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                이번 달 예산 지표와 실제 누적 절감 성과, 미래 예상 시뮬레이션을 분석합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Horizontal budget progress gauge & Category breakdown */}
            <div className="lg:col-span-7 bg-white/40 border border-white p-5 rounded-2xl shadow-3xs space-y-5">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-[#5C6346] block uppercase tracking-wider">📊 이번 달 목표 예산 중간 점검</span>
                
                <div className="p-4 bg-white/70 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-500 font-bold block">기록된 집밥 지출 방어액</span>
                    <span className="text-xl font-black text-[#5C6346] font-serif">{formatCurrency(stats.savedTotal)}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-stone-200" />
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-stone-500 font-bold block">설정한 절약 목표</span>
                    <span className="text-xl font-black text-[#2D3120] font-serif">{formatCurrency(stats.monthlyLimit)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-[#5C6346] pt-1">
                    <span>목표 진행률</span>
                    <span>{budgetRatio.toFixed(1)}% ({budgetRatio >= 100 ? "초과 달성! 🎉" : "방어 중"})</span>
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
                <span className="text-[11px] font-black text-[#5C6346] block uppercase tracking-wider">🥗 카테고리별 아낀 식비 비중</span>
                
                <div className="space-y-2.5">
                  {categoryBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-[#4E4A42]">
                        <span>{item.name} 방어</span>
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
                  🔮 AI 스마트 월말 예상 절감액 예측
                </h4>
                <p className="text-[10px] text-stone-500 leading-tight">
                  현재 일일 평균 지출 절약 속도({formatCurrency(Math.round(dailyAverage))})를 기반으로 이번 달 말에 최종 도달할 절감 수치를 과학적으로 시뮬레이션했습니다.
                </p>
              </div>

              {/* Simulation metrics display */}
              <div className="p-4 bg-[#5C6346]/5 rounded-xl border border-[#5C6346]/10 text-center space-y-2.5 my-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#5C6346] block">이번 달 최종 예측 절감 한도액</span>
                  <span className="text-2xl font-black text-[#5C6346] font-serif filter drop-shadow-5xs">
                    {formatCurrency(projectedSavings)}
                  </span>
                </div>
                
                <div className="bg-white/85 p-2 rounded-lg border border-stone-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#4E4A42]">
                    <span>목표액 대비 예측도</span>
                    <span className={`${projectedSavings >= stats.monthlyLimit ? "text-[#5C6346]" : "text-[#BC6C4D]"}`}>
                      {stats.monthlyLimit > 0 ? ((projectedSavings / stats.monthlyLimit) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <p className="text-[9px] text-left text-stone-500 leading-tight mt-1 font-semibold">
                    {projectedSavings >= stats.monthlyLimit 
                      ? "🎉 훌륭합니다! 지금 월 중반 기세를 계속 유지한다면 이번 달 목표 수치를 완전 점령할 것으로 전망됩니다."
                      : "💡 조금만 더 노력하면 목표에 닿을 수 있습니다! 냉장고 야채들을 정기 요리로 환원하여 배달비 1~2회만 더 구출해보세요."}
                  </p>
                </div>
              </div>

              {/* Annual extrapolation encouragement speech */}
              <div className="text-[10px] text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                <p className="font-bold">
                  🚀 <span className="text-[#BC6C4D]">장기 비전:</span> 이 습관을 1년간 이어나가면, 연간 총 약 <strong className="text-[#5C6346] font-serif text-xs">{formatCurrency(projectedSavings * 12)}</strong>의 불필요한 외식비를 저금하여 미래 재정 독립의 기초를 다질 수 있습니다!
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
              {zoomTitle || "식비 수호 일지 전경 사진"}
            </h3>
            <p className="text-[#5C6346] font-semibold text-[10px] md:text-xs">
              🥦 냉장고 소중한 재료를 탈출시켜 정성껏 조리해 낸 맛있는 행복의 증표입니다!
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
