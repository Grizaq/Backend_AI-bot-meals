// src/repositories/userRepository.ts
import { Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDB } from '../services/db.js';
import type { User } from '../types/database.js';

export class UserRepository {
  private collection: Collection<User> | null = null;

  private async getCollection(): Promise<Collection<User>> {
    if (!this.collection) {
      const db = await getDB();
      this.collection = db.collection<User>('users');

      // Create unique index on email
      await this.collection.createIndex({ email: 1 }, { unique: true });
    }
    return this.collection;
  }

  async createUser(email: string, password: string): Promise<User> {
    const collection = await this.getCollection();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser: User = {
      email,
      passwordHash,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newUser);
    return { ...newUser, _id: result.insertedId };
  }

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ email });
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    const collection = await this.getCollection();
    await collection.updateOne(
      { email },
      { $set: { lastLogin: new Date() } }
    );

    return user;
  }

  async updateLastActive(userId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastActive: new Date() } }
    );
  }

  async getLastActive(userId: string): Promise<Date | null> {
    const collection = await this.getCollection();
    const user = await collection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { lastActive: 1 } }
    );
    return user?.lastActive || null;
  }
}



export const userRepository = new UserRepository();