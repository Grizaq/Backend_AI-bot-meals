// /src/routes/mealRoutes.ts
import { Router, type Request, type Response } from 'express';
import { suggestMeals, type MealHistory, type AvailableIngredients } from '../services/geminiService.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { preferencesRepository } from '../repositories/preferencesRepository.js';
import { mealRepository } from '../repositories/mealRepository.js';
import type { Meal } from '../types/database.js';

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
    const mealHistory: MealHistory[] = recentMeals.map((meal: Meal) => {
      const dateString = meal.date.toISOString().split('T')[0];
      if (!dateString) throw new Error('Invalid date format');

      return {
        mealName: meal.mealName,
        date: dateString,
        liked: meal.liked,
        rating: meal.rating,
        notes: meal.notes
      };
    });

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

// Update meal rating/feedback
interface UpdateMealRequest {
  rating?: number;
  liked?: boolean;
  notes?: string;
}

router.patch('/:mealId', authenticate, async (req: AuthRequest<{ mealId: string }>, res: Response) => {
  try {
    const mealId = req.params.mealId;
    if (!mealId) {
      res.status(400).json({ error: 'Missing mealId parameter' });
      return;
    }

    const { rating, liked, notes } = req.body;
    const userId = req.user!.userId;

    // Verify meal belongs to user
    const meals = await mealRepository.getMealsByUserId(userId, 1000);
    const mealExists = meals.some(m => m._id!.toString() === mealId);

    if (!mealExists) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }

    const updated = await mealRepository.updateMealRating(mealId, rating, liked, notes);

    if (!updated) {
      res.status(404).json({ error: 'Failed to update meal' });
      return;
    }

    res.json({
      success: true,
      message: 'Meal updated successfully'
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({
      error: 'Failed to update meal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a meal
router.delete('/:mealId', authenticate, async (req: AuthRequest<{ mealId: string }>, res: Response) => {
  try {
    const mealId = req.params.mealId;
    if (!mealId) {
      res.status(400).json({ error: 'Missing mealId parameter' });
      return;
    }

    const userId = req.user!.userId;

    // Verify meal belongs to user before deleting
    const meals = await mealRepository.getMealsByUserId(userId, 1000);
    const meal = meals.find(m => m._id!.toString() === mealId);

    if (!meal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }

    const deleted = await mealRepository.deleteMeal(mealId);

    if (!deleted) {
      res.status(404).json({ error: 'Failed to delete meal' });
      return;
    }

    res.json({
      success: true,
      message: 'Meal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({
      error: 'Failed to delete meal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update preferences manually
interface UpdatePreferencesRequest {
  likes?: string[];
  dislikes?: string[];
  caloriePreference?: 'low' | 'medium' | 'high';
}

router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { likes, dislikes, caloriePreference } = req.body;
    const userId = req.user!.userId;

    const prefs = await preferencesRepository.createOrUpdatePreferences(
      userId,
      likes,
      dislikes,
      caloriePreference
    );

    res.json({
      success: true,
      preferences: {
        likes: prefs.likes,
        dislikes: prefs.dislikes,
        caloriePreference: prefs.caloriePreference
      }
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete specific preference items
interface DeletePreferenceRequest {
  type: 'like' | 'dislike';
  item: string;
}

router.delete('/preferences/item', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, item } = req.body;
    const userId = req.user!.userId;

    if (!type || !item) {
      res.status(400).json({ error: 'Missing required fields: type and item' });
      return;
    }

    const deleted = await preferencesRepository.removePreferenceItem(userId, type, item);

    if (!deleted) {
      res.status(404).json({ error: 'Preference item not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Preference item removed successfully'
    });
  } catch (error) {
    console.error('Error deleting preference item:', error);
    res.status(500).json({
      error: 'Failed to delete preference item',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;