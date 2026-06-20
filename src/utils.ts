export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // We can extract just the base64 data section
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("파일을 읽어오는 데 실패했습니다."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Helper to formats Korean Won currency cleanly (e.g., 25,000원)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  })
    .format(amount)
    .replace("₩", "") + "원";
}

/**
 * Maps a Korean recipe name to a matching high-quality, professional virtual food photography URL.
 * Offers rich keyword matching, and uses a string hash to pick uniquely within each collection to prevent duplicate pictures.
 */
export function getRecipeImage(recipeName: string): string {
  const name = recipeName.toLowerCase().trim();

  // Define pools of food images from Unsplash to ensure diversity!
  // By hashing the recipeName, different recipe names get different images even within the same food category.
  
  const stews = [
    "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600&auto=format&fit=crop&q=80", // Stew pot / sausage stew
    "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600&auto=format&fit=crop&q=80", // Red rich stew
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80", // Doenjang miso pot
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80"  // Shabu-shabu / Japanese stove pot
  ];

  const meats = [
    "https://images.unsplash.com/photo-1532465649062-8084d59f33ae?w=600&auto=format&fit=crop&q=80", // Grilled Korean beef
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80", // Grilled steak ribs
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80", // Meat skewers / barbecue
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80", // Sliced roast beef
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop&q=80"  // Meatball dish
  ];

  const chickens = [
    "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80", // Roast chicken gourmet
    "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&auto=format&fit=crop&q=80", // Chicken wings / snacks
    "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80"  // Fried chicken crispy
  ];

  const rices = [
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80", // Rice bowl / bibimbap style
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80", // Kimchi fried rice egg
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"  // Loaded salad dynamic rice
  ];

  const eggs = [
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80", // Rolled eggs/omelet
    "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&auto=format&fit=crop&q=80", // Soft eggs breakfast
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&auto=format&fit=crop&q=80"  // Toast egg yolk
  ];

  const noodles = [
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80", // Ramen noodle bowl
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80", // Pasta tomato
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80"  // Spaghetti gourmet
  ];

  const seafoods = [
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80", // Plated salmon / seafood
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80", // Salmon steak / fish
    "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80"  // Shellfish/seafood bake
  ];

  const greens = [
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80", // Fresh green salad
    "https://images.unsplash.com/photo-1515003844-1098c546a784?w=600&auto=format&fit=crop&q=80", // Healthy greens plate
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80", // Fresh veggie selection
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&auto=format&fit=crop&q=80"  // Side dish set
  ];

  const savoryPancakes = [
    "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&auto=format&fit=crop&q=80", // Crispy green onion pancake
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80"  // Korean crepe style pancake
  ];

  const fallbacks = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1493770308161-fdc187304723?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515003844-1098c546a784?w=600&auto=format&fit=crop&q=80"
  ];

  // Hash calculation
  let hash = 0;
  for (let i = 0; i < recipeName.length; i++) {
    hash = recipeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hashIdx = Math.abs(hash);

  // Pick category based on keyword in recipeName
  if (name.includes("부대찌개") || name.includes("부대") || name.includes("김치찌개") || name.includes("김치국") || name.includes("김치짜글이") || name.includes("된장찌개") || name.includes("청국장") || name.includes("찌개") || name.includes("국") || name.includes("탕") || name.includes("전골") || name.includes("나베") || name.includes("수제비") || name.includes("조림")) {
    return stews[hashIdx % stews.length];
  }
  if (name.includes("제육") || name.includes("불고기") || name.includes("두루치기") || name.includes("삼겹살") || name.includes("돼지고기") || name.includes("소고기") || name.includes("고기") || name.includes("갈비") || name.includes("스테이크") || name.includes("육회") || name.includes("밀푀유")) {
    return meats[hashIdx % meats.length];
  }
  if (name.includes("치킨") || name.includes("닭") || name.includes("닭가슴살") || name.includes("안동찜닭") || name.includes("닭볶음탕") || name.includes("삼계탕")) {
    return chickens[hashIdx % chickens.length];
  }
  if (name.includes("김치볶음밥") || name.includes("비빔밥") || name.includes("볶음밥") || name.includes("덮밥") || name.includes("김밥") || name.includes("마요덮밥")) {
    return rices[hashIdx % rices.length];
  }
  if (name.includes("계란") || name.includes("달걀") || name.includes("찜") || name.includes("후라이") || name.includes("에그") || name.includes("오믈렛") || name.includes("브런치")) {
    return eggs[hashIdx % eggs.length];
  }
  if (name.includes("라면") || name.includes("우동") || name.includes("국수") || name.includes("비빔국수") || name.includes("칼국수") || name.includes("스파게티") || name.includes("파스타") || name.includes("면")) {
    return noodles[hashIdx % noodles.length];
  }
  if (name.includes("오징어") || name.includes("낙지") || name.includes("조개") || name.includes("새우") || name.includes("생선") || name.includes("갈치") || name.includes("해물") || name.includes("꼬막") || name.includes("해산물")) {
    return seafoods[hashIdx % seafoods.length];
  }
  if (name.includes("샐러드") || name.includes("무침") || name.includes("겉절이") || name.includes("나물") || name.includes("미나리") || name.includes("야채") || name.includes("채소")) {
    return greens[hashIdx % greens.length];
  }
  if (name.includes("전") || name.includes("부침개") || name.includes("장떡") || name.includes("김치전") || name.includes("해물파전") || name.includes("지짐")) {
    return savoryPancakes[hashIdx % savoryPancakes.length];
  }

  // Fallback
  return fallbacks[hashIdx % fallbacks.length];
}

/**
 * Checks if the recipe name should use the fallback placeholder (i.e. does not have a highly specific image match category)
 */
export function isFallbackRecipeImage(recipeName: string): boolean {
  const name = recipeName.toLowerCase().trim();
  const categories = [
    "부대찌개", "부대", "김치찌개", "김치국", "김치짜글이", "된장찌개", "청국장", "찌개", "국", "탕", "전골", "나베", "수제비", "조림",
    "제육", "불고기", "두루치기", "삼겹살", "돼지", "소고기", "고기", "갈비", "스테이크", "육회", "밀푀유",
    "치킨", "닭", "닭가슴살", "안동찜닭", "닭볶음탕", "삼계탕",
    "김치볶음밥", "비빔밥", "볶음밥", "덮밥", "김밥", "마요덮밥",
    "계란", "달걀", "찜", "후라이", "에그", "오믈렛", "브런치",
    "라면", "우동", "국수", "비빔국수", "칼국수", "스파게티", "파스타", "면",
    "오징어", "낙지", "조개", "새우", "생선", "갈치", "해물", "꼬막", "해산물",
    "샐러드", "무침", "겉절이", "나물", "미나리", "야채", "채소",
    "전", "부침개", "장떡", "김치전", "해물파전", "지짐", "핫도그"
  ];
  return !categories.some(cat => name.includes(cat));
}

export const PAMEOKI_MOTIVATIONAL_SLOGANS = [
  "오늘의 파먹기 기록을 남겨주세요! 직접 만든 사진을 올리면 행복이 2배! 📸",
  "지갑 구출 성공! 맛있는 요리를 즐긴 후 기념샷을 한 번 등록해볼까요? 💚",
  "냉고 구출 완료! 직접 만드신 따뜻한 집밥 요리 완성 인증을 환영해요! ⭐",
  "배달비 방어 성공! 나만의 실물 완성 사진으로 가계부 영광을 기록하세요! 🍳",
  "파먹이가 파트너님의 근사한 손맛을 기대 중이에요. 인증을 박제해봐요! ✨",
  "오늘도 완벽한 냉파 집밥 성공! 직접 조리한 요리 사진을 편하게 등록해요! 👑",
  "가상 사진보다 100배 맛있을 직접 요리! 나만의 실전 갤러리를 기록해보세요! 🍲"
];

/**
 * Get a deterministic random motivational slogan for a given recipe name
 */
export function getPameokiMotivationalSlogan(recipeName: string): string {
  let hash = 0;
  for (let i = 0; i < recipeName.length; i++) {
    hash = recipeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PAMEOKI_MOTIVATIONAL_SLOGANS.length;
  return PAMEOKI_MOTIVATIONAL_SLOGANS[idx];
}

