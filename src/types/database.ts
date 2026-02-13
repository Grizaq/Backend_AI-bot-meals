// src/types/database.ts
import { ObjectId } from 'mongodb';

export interface Ingredient {
  _id?: ObjectId;
  name: string;
  category: 'pantry' | 'fridge' | 'freezer';
  commonName: string;
  createdAt: Date;
}

export interface Meal {
  _id?: ObjectId;
  userId: string;
  mealName: string;
  ingredients: string[];
  date: Date;
  rating?: number | undefined;
  liked?: boolean | undefined;
  notes?: string | undefined;
  estimatedCalories?: number | undefined;
  aiSuggestion: boolean;
  createdAt: Date;
}

export interface UserInventory {
  _id?: ObjectId;
  userId: string;
  ingredientId: ObjectId;
  ingredientName: string;
  quantity: number;
  location: 'pantry' | 'fridge' | 'freezer';
  addedAt: Date;
  expiresAt?: Date | undefined;
}

export interface UserPreferences {
  _id?: ObjectId | undefined;
  userId: string;
  likes: string[];
  dislikes: string[];
  caloriePreference?: 'low' | 'medium' | 'high' | undefined; // low: <400, medium: 400-700, high: >700
  updatedAt: Date;
}

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date | undefined;
  lastActive?: Date | undefined;
}
