import { GoogleGenAI } from '@google/genai';
import { ExpertReview, MonthlyMealPlan, MenuItem } from '../types';

const getApiKey = (): string | undefined => {
  return import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
};

const mapNamesToIds = (flaggedNames: string[], allItems: MenuItem[]): string[] => {
  return flaggedNames
    .map(name => allItems.find(item => item.name.includes(name) || name.includes(item.name)))
    .filter((item): item is MenuItem => item !== undefined)
    .map(item => item.id);
};

export const getExpertReview = async (mealPlan: MonthlyMealPlan): Promise<ExpertReview> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    return {
      nutritionistComment: 'API 키가 없어 영양 분석을 진행할 수 없습니다.',
      processExpertComment: 'API 키가 없어 공정 분석을 진행할 수 없습니다.',
      costExpertComment: 'API 키가 없어 단가 분석을 진행할 수 없습니다.',
      overallScore: 0,
      flaggedItemIds: [],
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    let menuDesc = '';
    const allItems: MenuItem[] = [];
    mealPlan.weeks.forEach(week => {
      menuDesc += `[Week ${week.weekIndex}] ${week.items.map(i => `${i.name}(${i.cost}원, ${i.mainIngredient})`).join(', ')}\n`;
      allItems.push(...week.items);
    });

    const target = mealPlan.target;

    const prompt = `
      You are an Expert Review Panel for a meal subscription service.
      Target Audience: ${target}

      Review the following 4-week meal plan:
      ${menuDesc}

      Act as three personas and provide specific feedback in Korean:
      1. Nutritionist: Balance of nutrients, sodium/sugar concerns for the target.
      2. Process Expert: Ease of mass production, packing issues (e.g. fried foods getting soggy, soup spilling).
      3. Cost Expert: Ingredient cost efficiency, seasonality.

      Also list exact Names of items that are problematic (flagged).

      Output JSON format:
      {
        "nutritionistComment": "string",
        "processExpertComment": "string",
        "costExpertComment": "string",
        "overallScore": number (0-100),
        "flaggedItemNames": ["string", "string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(response.text || '{}');
    } catch {
      result = {};
    }

    const flaggedNames = Array.isArray(result.flaggedItemNames) ? (result.flaggedItemNames as string[]) : [];

    return {
      nutritionistComment: (result.nutritionistComment as string) || '분석 실패',
      processExpertComment: (result.processExpertComment as string) || '분석 실패',
      costExpertComment: (result.costExpertComment as string) || '분석 실패',
      overallScore: (result.overallScore as number) || 50,
      flaggedItemIds: mapNamesToIds(flaggedNames, allItems),
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      nutritionistComment: 'AI 통신 오류',
      processExpertComment: 'AI 통신 오류',
      costExpertComment: 'AI 통신 오류',
      overallScore: 0,
      flaggedItemIds: [],
    };
  }
};
