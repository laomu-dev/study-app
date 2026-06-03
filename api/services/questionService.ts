import { db } from '../config/database-simple';
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
  async getAllQuestions(categoryId?: number): Promise<Question[]> {
    return db.questions.getAll(categoryId);
  }

  async getQuestionById(id: number): Promise<Question | null> {
    return db.questions.findById(id) || null;
  }

  async createQuestion(data: CreateQuestionData): Promise<Question> {
    return db.questions.create(data);
  }

  async updateQuestion(id: number, data: Partial<CreateQuestionData>): Promise<Question | null> {
    return db.questions.update(id, data) || null;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    return db.questions.delete(id);
  }

  async getAllCategories(): Promise<Category[]> {
    return db.categories.getAll();
  }

  async createCategory(name: string, description?: string): Promise<Category> {
    return db.categories.create({ name, description });
  }

  async getRandomQuestions(count: number, excludeIds?: number[]): Promise<Question[]> {
    let qs = db.questions.getAll();
    if (excludeIds && excludeIds.length > 0) {
      qs = qs.filter(q => !excludeIds.includes(q.id));
    }
    return qs.slice(0, count);
  }
}
