// src/services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UserPreferences } from '../types/database.js';

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
  liked?: boolean | undefined;
  rating?: number | undefined;
  notes?: string | undefined;
}

export interface AvailableIngredients {
  pantry: string[];
  fridge: string[];
  expiringSoon?: string[];
}

export interface MealSuggestion {
  mealName: string;
  description: string;
  ingredients: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedCalories: number;
  expiringIngredientsUsed?: string[];
}

export interface SuggestionResponse {
  suggestions: MealSuggestion[];
  newLikes?: string[];
  newDislikes?: string[];
}

export async function suggestMeals(
  ingredients: AvailableIngredients,
  mealHistory: MealHistory[],
  preferences?: Partial<UserPreferences>
): Promise<SuggestionResponse> {
  
  const prefs: UserPreferences = {
    userId: 'default', // Will be replaced when we add auth
    likes: preferences?.likes || [],
    dislikes: preferences?.dislikes || [],
    caloriePreference: preferences?.caloriePreference,
    updatedAt: new Date()
  };
  
  const allIngredients = [...ingredients.pantry, ...ingredients.fridge];
  const expiringSoon = ingredients.expiringSoon || [];
  
  const recentMeals = mealHistory.slice(0, 10);

  const prompt = `You are a helpful meal planning assistant. Analyze the user's preferences and suggest 3 diverse meals.

AVAILABLE INGREDIENTS:
${allIngredients.join(', ')}

${expiringSoon.length > 0 ? `EXPIRING SOON (prioritize these): ${expiringSoon.join(', ')}` : ''}

USER PREFERENCES:
Likes: ${prefs.likes.join(', ') || 'None specified'}
Dislikes: ${prefs.dislikes.join(', ') || 'None specified'}

RECENT MEAL HISTORY (last 10 meals):
${recentMeals.map(m => 
  `- ${m.mealName} (${m.date}) - Rating: ${m.rating || 'N/A'}/5, Liked: ${m.liked !== undefined ? (m.liked ? 'Yes' : 'No') : 'N/A'}${m.notes ? `, Notes: "${m.notes}"` : ''}`
).join('\n')}

INSTRUCTIONS:
1. Suggest 3 diverse meal ideas using primarily available ingredients
2. Prioritize ingredients expiring soon
3. Avoid meals similar to recent history (especially low-rated or disliked ones)
4. Consider user preferences and meal feedback notes
5. ${prefs.caloriePreference ? `Target ${prefs.caloriePreference} calorie meals: ${prefs.caloriePreference === 'low' ? '<400 calories' : prefs.caloriePreference === 'medium' ? '400-700 calories' : '>700 calories'}` : 'Estimate calories for each meal'}
6. If you notice new patterns in the user's preferences from the meal history, suggest new items for their likes/dislikes list

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no explanations):
{
  "suggestions": [
    {
      "mealName": "Name of meal",
      "description": "Brief description",
      "ingredients": ["ingredient1", "ingredient2"],
      "estimatedTime": "30 minutes",
      "difficulty": "easy",
      "estimatedCalories": 450,
      "expiringIngredientsUsed": ["tomatoes"]
    }
  ],
  "newLikes": ["any new preference patterns you detected"],
  "newDislikes": ["any new dislike patterns you detected"]
}`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Remove markdown code blocks if present
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedText) as SuggestionResponse;
    return parsed;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}