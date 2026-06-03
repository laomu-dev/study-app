import { db } from '../config/database';
import { Question, Category } from '../../shared/types';

export interface CreateQuestionData {
  categoryId: number;
  content: string;
  options: string[];
  correctAnswer: number | number[];
  isMultiple?: boolean;
  explanation?: string;
}

export class QuestionService {
  async getAllQuestions(userId: number, categoryId?: number): Promise<Question[]> {
    return await db.questions.getAll(userId, categoryId);
  }

  async getQuestionById(userId: number, id: number): Promise<Question | null> {
    return (await db.questions.findById(id, userId)) || null;
  }

  async createQuestion(userId: number, data: CreateQuestionData): Promise<Question> {
    if (!(await db.categories.findById(data.categoryId, userId))) {
      throw new Error('Category not found');
    }

    return await db.questions.create({ ...data, userId });
  }

  async updateQuestion(userId: number, id: number, data: Partial<CreateQuestionData>): Promise<Question | null> {
    if (data.categoryId && !(await db.categories.findById(data.categoryId, userId))) {
      throw new Error('Category not found');
    }

    return (await db.questions.update(id, userId, data)) || null;
  }

  async deleteQuestion(userId: number, id: number): Promise<boolean> {
    return await db.questions.delete(id, userId);
  }

  async getAllCategories(userId: number): Promise<Category[]> {
    return await db.categories.getAll(userId);
  }

  async createCategory(userId: number, name: string, description?: string): Promise<Category> {
    return await db.categories.create({ userId, name, description });
  }

  async getRandomQuestions(userId: number, count: number, excludeIds?: number[]): Promise<Question[]> {
    let qs = await db.questions.getAll(userId);
    if (excludeIds && excludeIds.length > 0) {
      qs = qs.filter(q => !excludeIds.includes(q.id));
    }
    return qs.slice(0, count);
  }
}
