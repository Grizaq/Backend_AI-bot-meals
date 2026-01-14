// /src/services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export interface MealHistory {
    mealName: string;
    date: string;
    liked?: boolean;
}

export interface AvailableIngredients {
    pantry: string[];
    fridge: string[];
}

export async function suggestMeals(
    ingredients: AvailableIngredients,
    mealHistory: MealHistory[]
): Promise<string> {
    const prompt = `You are a helpful meal planning assistant. Based on the following information, suggest 3 diverse meal ideas.

Available ingredients:
- Pantry: ${ingredients.pantry.join(', ')}
- Fridge: ${ingredients.fridge.join(', ')}

Recent meal history (to avoid repetition):
${mealHistory.map(m => `- ${m.mealName} (${m.date})${m.liked !== undefined ? ` - ${m.liked ? 'liked' : 'disliked'}` : ''}`).join('\n')}

Requirements:
1. Use primarily the available ingredients
2. Avoid suggesting meals similar to recent history
3. Consider user preferences based on liked/disliked meals
4. Keep suggestions practical and easy to make
5. Format each suggestion with: Meal name, brief description, and main ingredients needed

Provide the suggestions in a clear, structured format.`;

    try {
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw error;
    }
}