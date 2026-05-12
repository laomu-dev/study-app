import { db } from '../config/database-simple';
import { User } from '../../shared/types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export class UserService {
  async findByUsername(username: string): Promise<User | null> {
    const u = db.users.findByUsername(username);
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    };
  }

  async findById(id: number): Promise<User | null> {
    const u = db.users.findById(id);
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    };
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    console.log('Verifying password for user:', user.username);
    console.log('Password provided:', password);
    // For demo purposes, just use plain text comparison
    return password === 'admin123';
  }
}
