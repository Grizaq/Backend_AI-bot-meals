// /src/routes/mealRoutes.ts
import { Router, type Request, type Response } from 'express';
import { suggestMeals, type MealHistory, type AvailableIngredients } from '../services/geminiService.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { preferencesRepository } from '../repositories/preferencesRepository.js';
import { mealRepository } from '../repositories/mealRepository.js';

const router = Router();

interface SuggestMealsRequest {
  ingredients: AvailableIngredients;
  caloriePreference?: 'low' | 'medium' | 'high';
}

router.post('/suggest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ingredients, caloriePreference } = req.body;
    const userId = req.user!.userId;

    if (!ingredients || !ingredients.pantry || !ingredients.fridge) {
      res.status(400).json({
        error: 'Missing required fields: ingredients.pantry and ingredients.fridge'
      });
      return;
    }

    // Fetch user preferences from database
    let userPrefs = await preferencesRepository.getPreferences(userId);
    
    // Update calorie preference if provided
    if (caloriePreference) {
      if (!userPrefs) {
        userPrefs = await preferencesRepository.createOrUpdatePreferences(
          userId,
          [],
          [],
          caloriePreference
        );
      } else if (userPrefs.caloriePreference !== caloriePreference) {
        userPrefs = await preferencesRepository.createOrUpdatePreferences(
          userId,
          userPrefs.likes,
          userPrefs.dislikes,
          caloriePreference
        );
      }
    }

    // Fetch recent meal history from database
    const recentMeals = await mealRepository.getRecentMeals(userId, 10);
    const mealHistory: MealHistory[] = recentMeals.map(meal => ({
      mealName: meal.mealName,
      date: meal.date.toISOString().split('T')[0],
      liked: meal.liked,
      rating: meal.rating,
      notes: meal.notes
    }));

    // Get AI suggestions
    const result = await suggestMeals(
      ingredients, 
      mealHistory,
      userPrefs || undefined
    );

    // Save new likes/dislikes to database if detected
    if (result.newLikes && result.newLikes.length > 0) {
      await preferencesRepository.addLikes(userId, result.newLikes);
    }
    if (result.newDislikes && result.newDislikes.length > 0) {
      await preferencesRepository.addDislikes(userId, result.newDislikes);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in /suggest endpoint:', error);
    res.status(500).json({
      error: 'Failed to generate meal suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

interface SaveMealRequest {
  mealName: string;
  ingredients: string[];
  rating?: number;
  liked?: boolean;
  notes?: string;
  estimatedCalories?: number;
  aiSuggestion: boolean;
}

router.post('/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { mealName, ingredients, rating, liked, notes, estimatedCalories, aiSuggestion } = req.body;
    const userId = req.user!.userId;

    if (!mealName || !ingredients || ingredients.length === 0) {
      res.status(400).json({
        error: 'Missing required fields: mealName and ingredients'
      });
      return;
    }

    const meal = await mealRepository.createMeal({
      userId,
      mealName,
      ingredients,
      date: new Date(),
      rating,
      liked,
      notes,
      estimatedCalories,
      aiSuggestion
    });

    // Cleanup old meals (keep only 100 most recent)
    await mealRepository.cleanupOldMeals(userId, 100);

    res.status(201).json({
      success: true,
      meal: {
        id: meal._id!.toString(),
        mealName: meal.mealName,
        date: meal.date
      }
    });
  } catch (error) {
    console.error('Error saving meal:', error);
    res.status(500).json({
      error: 'Failed to save meal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get meal history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const meals = await mealRepository.getMealsByUserId(userId, limit);

    res.json({
      success: true,
      meals: meals.map(m => ({
        id: m._id!.toString(),
        mealName: m.mealName,
        ingredients: m.ingredients,
        date: m.date,
        rating: m.rating,
        liked: m.liked,
        notes: m.notes,
        estimatedCalories: m.estimatedCalories,
        aiSuggestion: m.aiSuggestion
      }))
    });
  } catch (error) {
    console.error('Error fetching meal history:', error);
    res.status(500).json({
      error: 'Failed to fetch meal history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const prefs = await preferencesRepository.getPreferences(userId);

    if (!prefs) {
      res.json({
        success: true,
        preferences: {
          likes: [],
          dislikes: [],
          caloriePreference: null
        }
      });
      return;
    }

    res.json({
      success: true,
      preferences: {
        likes: prefs.likes,
        dislikes: prefs.dislikes,
        caloriePreference: prefs.caloriePreference
      }
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


export default router;