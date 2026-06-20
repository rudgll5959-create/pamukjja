export interface ChatMessage {
  id: string;
  sender: "mentor" | "user";
  text: string;
  timestamp: string;
  type?: "text" | "options" | "upload";
}

export interface IngredientItem {
  name: string;
  amount: string;
  isFromRefrigerator: boolean;
}

export interface Macronutrients {
  carbs: number;   // grams
  protein: number; // grams
  fat: number;     // grams
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: IngredientItem[];
  steps: string[];
  savingsAmount: number; // Estimated amount saved in KRW (Korean Won) by using refrigerator leftovers instead of newly purchasing or eating out
  calorie: number;       // total kcal
  macronutrients: Macronutrients;
  complexity: "상" | "중" | "하";
  cookingTime: number;   // minutes
  tip: string;
  customImage?: string;  // User's custom cooked recipe photo (Base64 data URL)
}

export interface SavingsLog {
  id: string;
  date: string;          // YYYY-MM-DD
  recipeName: string;
  savingsAmount: number; // In KRW
  purpose: string;       // e.g. 도시락, 홈밥, 간식, 야식
  ingredientsSaved: string[];
  notes?: string;
  recipeSnapshot?: Recipe; // Backed-up recipe snapshot so users can click and view full details later!
  customImage?: string;    // Custom user photo uploaded for this specific cooking activity session
}

export interface BudgetStats {
  monthlyLimit: number;  // Current target budget for the month (e.g. 500,000 KRW)
  currentSpent: number;  // Cumulative spent (manual logs or estimated leftovers savings offsets)
  savedTotal: number;    // Cumulative saved KRW by custom leftovers recipe matches
}

export interface UserProfile {
  id: string;
  nickname: string;
  purposeType: string;  // e.g. "엄마의 건강 영양식", "자취생 초스피드 생존요리", "아빠의 주말 냉장고 파티", "다이어터 헬시 저탄고지"
  avatar: string;       // emoji avatar character
  budgetLimit: number;
  logs: SavingsLog[];
  savedRecipes: Recipe[];
  lastAccessedAt?: number;
  createdAt?: number;
}

