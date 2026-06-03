import dotenv from 'dotenv';
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { initialCategories, initialUsers, seedQuestions } from './database-simple';
import type {
  Category,
  Question,
  StudyRecord,
  User as PublicUser,
} from '../../shared/types';

dotenv.config();

export interface DbUser extends PublicUser {
  passwordHash: string;
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'study_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

export const pool = mysql.createPool(dbConfig);

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function toUser(row: RowDataPacket): DbUser {
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: toDate(row.created_at),
  };
}

function toCategory(row: RowDataPacket): Category {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: String(row.name),
    description: row.description === null ? null : String(row.description),
  };
}

function toQuestion(row: RowDataPacket): Question {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    categoryId: Number(row.category_id),
    content: String(row.content),
    options: parseJson<string[]>(row.options, []),
    correctAnswer: parseJson<number | number[]>(row.correct_answer, 0),
    isMultiple: Boolean(row.is_multiple),
    type: row.type || undefined,
    explanation: row.explanation === null ? null : String(row.explanation),
    createdAt: toDate(row.created_at),
  };
}

function toStudyRecord(row: RowDataPacket): StudyRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    questionId: Number(row.question_id),
    memoryStrength: Number(row.memory_strength),
    nextReviewAt: toDate(row.next_review_at),
    lastReviewedAt: row.last_reviewed_at ? toDate(row.last_reviewed_at) : null,
    reviewCount: Number(row.review_count),
    correctCount: Number(row.correct_count),
  };
}

async function ensureDatabaseExists(): Promise<void> {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    charset: dbConfig.charset,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

async function createTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_categories_user (user_id),
      CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category_id INT NOT NULL,
      content TEXT NOT NULL,
      options JSON NOT NULL,
      correct_answer JSON NOT NULL,
      is_multiple TINYINT(1) NOT NULL DEFAULT 0,
      type VARCHAR(20) NOT NULL DEFAULT 'single',
      explanation TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_questions_user_category (user_id, category_id),
      CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_questions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      memory_strength INT NOT NULL DEFAULT 0,
      next_review_at DATETIME NOT NULL,
      last_reviewed_at DATETIME NULL,
      review_count INT NOT NULL DEFAULT 0,
      correct_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_question (user_id, question_id),
      INDEX idx_study_records_user (user_id),
      CONSTRAINT fk_study_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_study_records_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function hasUserCategories(userId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM categories WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rows.length > 0;
}

export async function seedDefaultContentForUser(userId: number): Promise<void> {
  if (await hasUserCategories(userId)) return;

  const categoryIdMap = new Map<number, number>();

  for (const templateCategory of initialCategories) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)',
      [userId, templateCategory.name, templateCategory.description || null],
    );
    categoryIdMap.set(templateCategory.id, result.insertId);
  }

  for (const templateQuestion of seedQuestions) {
    const categoryId = categoryIdMap.get(templateQuestion.categoryId);
    if (!categoryId) continue;

    await pool.execute(
      `INSERT INTO questions
        (user_id, category_id, content, options, correct_answer, is_multiple, type, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        categoryId,
        templateQuestion.content,
        JSON.stringify(templateQuestion.options),
        JSON.stringify(templateQuestion.correctAnswer),
        templateQuestion.isMultiple || Array.isArray(templateQuestion.correctAnswer) ? 1 : 0,
        templateQuestion.type || 'single',
        templateQuestion.explanation || null,
      ],
    );
  }
}

async function seedInitialUsers(): Promise<void> {
  for (const user of initialUsers) {
    await pool.execute(
      `INSERT INTO users (id, username, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username)`,
      [user.id, user.username, user.email, user.passwordHash, user.role],
    );
    await seedDefaultContentForUser(user.id);
  }
}

export const db = {
  users: {
    async findByUsername(username: string): Promise<DbUser | undefined> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ? LIMIT 1',
        [username],
      );
      return rows[0] ? toUser(rows[0]) : undefined;
    },

    async findById(id: number): Promise<DbUser | undefined> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [id],
      );
      return rows[0] ? toUser(rows[0]) : undefined;
    },

    async create(data: Omit<DbUser, 'id' | 'createdAt'>): Promise<DbUser> {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [data.username, data.email, data.passwordHash, data.role],
      );
      await seedDefaultContentForUser(result.insertId);

      const user = await this.findById(result.insertId);
      if (!user) throw new Error('Failed to create user');
      return user;
    },
  },

  categories: {
    async getAll(userId: number): Promise<Category[]> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY id ASC',
        [userId],
      );
      return rows.map(toCategory);
    },

    async findById(id: number, userId?: number): Promise<Category | undefined> {
      const sql = userId === undefined
        ? 'SELECT * FROM categories WHERE id = ? LIMIT 1'
        : 'SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1';
      const params = userId === undefined ? [id] : [id, userId];
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows[0] ? toCategory(rows[0]) : undefined;
    },

    async create(data: Omit<Category, 'id'> & { userId: number }): Promise<Category> {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)',
        [data.userId, data.name, data.description || null],
      );
      const category = await this.findById(result.insertId, data.userId);
      if (!category) throw new Error('Failed to create category');
      return category;
    },
  },

  questions: {
    async getAll(userId: number, categoryId?: number): Promise<Question[]> {
      const sql = categoryId
        ? 'SELECT * FROM questions WHERE user_id = ? AND category_id = ? ORDER BY created_at DESC, id DESC'
        : 'SELECT * FROM questions WHERE user_id = ? ORDER BY created_at DESC, id DESC';
      const params = categoryId ? [userId, categoryId] : [userId];
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows.map(toQuestion);
    },

    async findById(id: number, userId?: number): Promise<Question | undefined> {
      const sql = userId === undefined
        ? 'SELECT * FROM questions WHERE id = ? LIMIT 1'
        : 'SELECT * FROM questions WHERE id = ? AND user_id = ? LIMIT 1';
      const params = userId === undefined ? [id] : [id, userId];
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows[0] ? toQuestion(rows[0]) : undefined;
    },

    async create(data: Omit<Question, 'id' | 'createdAt'> & { userId: number }): Promise<Question> {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO questions
          (user_id, category_id, content, options, correct_answer, is_multiple, type, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.categoryId,
          data.content,
          JSON.stringify(data.options),
          JSON.stringify(data.correctAnswer),
          data.isMultiple || Array.isArray(data.correctAnswer) ? 1 : 0,
          data.type || 'single',
          data.explanation || null,
        ],
      );
      const question = await this.findById(result.insertId, data.userId);
      if (!question) throw new Error('Failed to create question');
      return question;
    },

    async update(
      id: number,
      userId: number,
      data: Partial<Omit<Question, 'id' | 'createdAt' | 'userId'>>,
    ): Promise<Question | undefined> {
      const existing = await this.findById(id, userId);
      if (!existing) return undefined;

      const next = { ...existing, ...data };
      await pool.execute(
        `UPDATE questions
         SET category_id = ?, content = ?, options = ?, correct_answer = ?,
             is_multiple = ?, type = ?, explanation = ?
         WHERE id = ? AND user_id = ?`,
        [
          next.categoryId,
          next.content,
          JSON.stringify(next.options),
          JSON.stringify(next.correctAnswer),
          next.isMultiple || Array.isArray(next.correctAnswer) ? 1 : 0,
          next.type || 'single',
          next.explanation || null,
          id,
          userId,
        ],
      );

      return this.findById(id, userId);
    },

    async delete(id: number, userId: number): Promise<boolean> {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM questions WHERE id = ? AND user_id = ?',
        [id, userId],
      );
      return result.affectedRows > 0;
    },
  },

  studyRecords: {
    async getByUserId(userId: number): Promise<StudyRecord[]> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM study_records WHERE user_id = ? ORDER BY id ASC',
        [userId],
      );
      return rows.map(toStudyRecord);
    },

    async getByUserAndQuestion(userId: number, questionId: number): Promise<StudyRecord | undefined> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM study_records WHERE user_id = ? AND question_id = ? LIMIT 1',
        [userId, questionId],
      );
      return rows[0] ? toStudyRecord(rows[0]) : undefined;
    },

    async create(data: Omit<StudyRecord, 'id' | 'createdAt'>): Promise<StudyRecord> {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO study_records
          (user_id, question_id, memory_strength, next_review_at, last_reviewed_at, review_count, correct_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.questionId,
          data.memoryStrength,
          data.nextReviewAt,
          data.lastReviewedAt || null,
          data.reviewCount,
          data.correctCount,
        ],
      );
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM study_records WHERE id = ? LIMIT 1',
        [result.insertId],
      );
      if (!rows[0]) throw new Error('Failed to create study record');
      return toStudyRecord(rows[0]);
    },

    async update(
      id: number,
      data: Partial<Omit<StudyRecord, 'id' | 'createdAt'>>,
    ): Promise<StudyRecord | undefined> {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM study_records WHERE id = ? LIMIT 1',
        [id],
      );
      if (!rows[0]) return undefined;

      const existing = toStudyRecord(rows[0]);
      const next = { ...existing, ...data };

      await pool.execute(
        `UPDATE study_records
         SET memory_strength = ?, next_review_at = ?, last_reviewed_at = ?,
             review_count = ?, correct_count = ?
         WHERE id = ?`,
        [
          next.memoryStrength,
          next.nextReviewAt,
          next.lastReviewedAt || null,
          next.reviewCount,
          next.correctCount,
          id,
        ],
      );

      const [updatedRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM study_records WHERE id = ? LIMIT 1',
        [id],
      );
      return updatedRows[0] ? toStudyRecord(updatedRows[0]) : undefined;
    },
  },
};

export async function initDatabase(): Promise<void> {
  await ensureDatabaseExists();
  await createTables();
  await seedInitialUsers();
  console.log('MySQL database initialized');
}
