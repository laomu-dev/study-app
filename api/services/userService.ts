import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { User } from '../../shared/types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export class UserService {
  private toPublicUser(u: any): User {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const u = await db.users.findByUsername(username);
    if (!u) return null;
    return this.toPublicUser(u);
  }

  async findById(id: number): Promise<User | null> {
    const u = await db.users.findById(id);
    if (!u) return null;
    return this.toPublicUser(u);
  }

  async createUser(username: string, password: string, email?: string): Promise<User> {
    const normalizedUsername = username.trim();
    const normalizedEmail = email?.trim() || `${normalizedUsername}@example.com`;

    if (await db.users.findByUsername(normalizedUsername)) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: 'user',
    });

    return this.toPublicUser(user);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    const storedUser = await db.users.findById(user.id);
    if (!storedUser) return false;

    return bcrypt.compare(password, storedUser.passwordHash);
  }
}
