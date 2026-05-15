// Pure helpers for removing non-food labels from AI meal estimate items.

const PROVIDER_TOKEN_RE = /(?:\bgemini\b|제미나이|\bgoogle\b|구글|\bai\b|인공지능)/i;
const MEAL_TOKEN_RE = /(?:아침|점심|저녁|간식|\bbreakfast\b|\blunch\b|\bdinner\b|\bsnack\b)/i;
const DATE_TOKEN_RE = /(?:^|[^\d])(?:\d{4}\s*[-./_]\s*)?\d{1,2}\s*[-./_]\s*\d{1,2}(?:\s*[-./_]\s*\d{1,2})?(?:[^\d]|$)/;

export function isNonFoodArtifactName(name) {
  const n = String(name || '').trim();
  if (!n) return true;

  const hasProvider = PROVIDER_TOKEN_RE.test(n);
  const hasMealOrDate = MEAL_TOKEN_RE.test(n) || DATE_TOKEN_RE.test(n);

  return /^(gemini|제미나이|google|구글|ai|인공지능|분석|분석\s*결과|음식\s*사진|이미지)$/i.test(n)
    || /(gemini|제미나이|google|구글)\s*(응답|분석|결과|추정|출력)/i.test(n)
    || /^(ai|인공지능)\s*(응답|분석|결과|추정|출력)/i.test(n)
    || /(제공자|모델|프롬프트|텍스트\s*출력|json)/i.test(n)
    || (hasProvider && hasMealOrDate);
}

export function mealDisplayText(foods = [], memo = '', fallback = '메뉴 미기록') {
  const names = (Array.isArray(foods) ? foods : [])
    .map(item => String(item?.name || '').trim())
    .filter(name => name && !isNonFoodArtifactName(name));
  const memoText = String(memo || '').trim();
  if (names.length) return names.join(', ');
  if (memoText && !isNonFoodArtifactName(memoText)) return memoText;
  return fallback;
}
