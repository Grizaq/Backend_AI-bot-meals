// src/repositories/preferencesRepository.ts
import { Collection } from 'mongodb';
import { getDB } from '../services/db.js';
import type { UserPreferences } from '../types/database.js';

export class PreferencesRepository {
    private collection: Collection<UserPreferences> | null = null;

    private async getCollection(): Promise<Collection<UserPreferences>> {
        if (!this.collection) {
            const db = await getDB();
            this.collection = db.collection<UserPreferences>('user_preferences');

            // Create indexes
            await this.collection.createIndex({ userId: 1 }, { unique: true });
        }
        return this.collection;
    }

    async getPreferences(userId: string): Promise<UserPreferences | null> {
        const collection = await this.getCollection();
        return await collection.findOne({ userId });
    }

    async createOrUpdatePreferences(
        userId: string,
        likes?: string[],
        dislikes?: string[],
        caloriePreference?: 'low' | 'medium' | 'high'
    ): Promise<UserPreferences> {
        const collection = await this.getCollection();

        const setFields: Partial<UserPreferences> = {
            updatedAt: new Date()
        };

        if (likes !== undefined) setFields.likes = likes;
        if (dislikes !== undefined) setFields.dislikes = dislikes;
        if (caloriePreference !== undefined) setFields.caloriePreference = caloriePreference;

        const setOnInsertFields: Partial<UserPreferences> = {
            userId
        };

        // Only set default empty arrays if not explicitly setting them
        if (likes === undefined) setOnInsertFields.likes = [];
        if (dislikes === undefined) setOnInsertFields.dislikes = [];

        const result = await collection.findOneAndUpdate(
            { userId },
            {
                $set: setFields,
                $setOnInsert: setOnInsertFields
            },
            { upsert: true, returnDocument: 'after' }
        );

        return result!;
    }

    async addLikes(userId: string, newLikes: string[]): Promise<void> {
        const collection = await this.getCollection();
        await collection.updateOne(
            { userId },
            {
                $addToSet: { likes: { $each: newLikes } },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );

        // Trim to latest 100
        await this.trimPreferencesList(userId, 'likes', 100);
    }

    async addDislikes(userId: string, newDislikes: string[]): Promise<void> {
        const collection = await this.getCollection();
        await collection.updateOne(
            { userId },
            {
                $addToSet: { dislikes: { $each: newDislikes } },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );

        // Trim to latest 100
        await this.trimPreferencesList(userId, 'dislikes', 100);
    }

    private async trimPreferencesList(
        userId: string,
        field: 'likes' | 'dislikes',
        maxCount: number
    ): Promise<void> {
        const collection = await this.getCollection();
        const prefs = await collection.findOne({ userId });

        if (!prefs) return;

        const list = prefs[field];
        if (list && list.length > maxCount) {
            const trimmed = list.slice(-maxCount); // Keep latest 100
            await collection.updateOne(
                { userId },
                { $set: { [field]: trimmed } }
            );
        }
    }

    async removePreferenceItem(
        userId: string,
        type: 'like' | 'dislike',
        item: string
    ): Promise<boolean> {
        const collection = await this.getCollection();
        const field = type === 'like' ? 'likes' : 'dislikes';

        const result = await collection.updateOne(
            { userId },
            {
                $pull: { [field]: item },
                $set: { updatedAt: new Date() }
            }
        );

        return result.modifiedCount > 0;
    }
}

export const preferencesRepository = new PreferencesRepository();