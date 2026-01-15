// src/repositories/inventoryRepository.ts
import { Collection, ObjectId } from 'mongodb';
import { getDB } from '../services/db.js';
import type { UserInventory } from '../types/database.js';

export class InventoryRepository {
  private collection: Collection<UserInventory> | null = null;

  private async getCollection(): Promise<Collection<UserInventory>> {
    if (!this.collection) {
      const db = await getDB();
      this.collection = db.collection<UserInventory>('user_inventory');
      
      // Create indexes
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ expiresAt: 1 });
    }
    return this.collection;
  }

  async addItem(item: Omit<UserInventory, '_id' | 'addedAt'>): Promise<UserInventory> {
    const collection = await this.getCollection();
    const newItem: UserInventory = {
      ...item,
      addedAt: new Date()
    };
    
    const result = await collection.insertOne(newItem);
    return { ...newItem, _id: result.insertedId };
  }

  async getInventoryByUserId(userId: string): Promise<UserInventory[]> {
    const collection = await this.getCollection();
    return await collection.find({ userId }).toArray();
  }

  async getExpiringSoon(userId: string, daysAhead: number = 3): Promise<UserInventory[]> {
    const collection = await this.getCollection();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return await collection.find({
      userId,
      expiresAt: { $lte: cutoffDate, $gte: new Date() }
    }).toArray();
  }

  async removeItem(itemId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(itemId) });
    return result.deletedCount > 0;
  }

  async updateQuantity(itemId: string, quantity: number): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { quantity } }
    );
    return result.modifiedCount > 0;
  }
}

export const inventoryRepository = new InventoryRepository();