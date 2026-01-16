// src/repositories/mealRepository.ts
import { Collection, ObjectId } from 'mongodb';
import { getDB } from '../services/db.js';
import type { Meal } from '../types/database.js';

export class MealRepository {
  private collection: Collection<Meal> | null = null;

  private async getCollection(): Promise<Collection<Meal>> {
    if (!this.collection) {
      const db = await getDB();
      this.collection = db.collection<Meal>('meals');

      // Create indexes
      await this.collection.createIndex({ userId: 1, createdAt: -1 });
      await this.collection.createIndex({ userId: 1, date: -1 });
    }
    return this.collection;
  }

  async createMeal(meal: Omit<Meal, '_id' | 'createdAt'>): Promise<Meal> {
    const collection = await this.getCollection();
    const newMeal: Meal = {
      ...meal,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newMeal);
    return { ...newMeal, _id: result.insertedId };
  }

  async getMealsByUserId(userId: string, limit: number = 100): Promise<Meal[]> {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  }

  async getRecentMeals(userId: string, count: number = 10): Promise<Meal[]> {
    const collection = await this.getCollection();
    return await collection
      .find({ userId })
      .sort({ date: -1 })
      .limit(count)
      .toArray();
  }

  async updateMealRating(
    mealId: string,
    rating?: number,
    liked?: boolean,
    notes?: string
  ): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(mealId) },
      { $set: { rating, liked, notes } }
    );
    return result.modifiedCount > 0;
  }

  async cleanupOldMeals(userId: string, keepCount: number = 100): Promise<number> {
    const collection = await this.getCollection();

    // Get the 100th most recent meal date
    const meals = await collection
      .find({ userId })
      .sort({ date: -1 })
      .skip(keepCount)
      .limit(1)
      .toArray();

    if (meals.length === 0) return 0;

    const cutoffDate = meals[0]?.date;
    if (!cutoffDate) return 0;

    const result = await collection.deleteMany({
      userId,
      date: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  async deleteMeal(mealId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(mealId) });
    return result.deletedCount > 0;
  }
}

export const mealRepository = new MealRepository();