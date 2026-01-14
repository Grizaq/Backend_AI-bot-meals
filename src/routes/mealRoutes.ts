// /src/routes/mealRoutes.ts
import { Router, type Request, type Response } from 'express';
import { suggestMeals, type MealHistory, type AvailableIngredients } from '../services/geminiService.js';

const router = Router();

interface SuggestMealsRequest {
  ingredients: AvailableIngredients;
  mealHistory: MealHistory[];
}

router.post('/suggest', async (req: Request<{}, {}, SuggestMealsRequest>, res: Response) => {
  try {
    const { ingredients, mealHistory } = req.body;

    if (!ingredients || !ingredients.pantry || !ingredients.fridge) {
      return res.status(400).json({ 
        error: 'Missing required fields: ingredients.pantry and ingredients.fridge' 
      });
    }

    const suggestions = await suggestMeals(ingredients, mealHistory || []);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error in /suggest endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;