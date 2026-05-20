// 简化版内存数据库，用于演示
// 实际生产环境应使用MySQL等真实数据库

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export type QuestionType = 'single' | 'multiple' | 'judge';

export interface Question {
  id: number;
  categoryId: number;
  content: string;
  options: string[];
  correctAnswer: number | number[];
  isMultiple?: boolean;
  type?: QuestionType;
  explanation?: string;
  createdAt: Date;
}

export interface StudyRecord {
  id: number;
  userId: number;
  questionId: number;
  memoryStrength: number;
  nextReviewAt: Date;
  lastReviewedAt?: Date;
  reviewCount: number;
  correctCount: number;
  createdAt: Date;
}

// 模拟数据
const initialUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
    role: 'admin',
    createdAt: new Date(),
  },
  {
    id: 2,
    username: 'testuser',
    email: 'user@example.com',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
    role: 'user',
    createdAt: new Date(),
  },
];

const initialCategories: Category[] = [
  { id: 1, name: '通信基础知识', description: '通信岗位基础题目' },
  { id: 2, name: '专业技能', description: '专业技能题目' },
];

const initialQuestions: Question[] = [
  {
    id: 1,
    categoryId: 1,
    content: '光纤通信中，常用的波长窗口是？',
    options: ['850nm', '1310nm', '1550nm', '以上都是'],
    correctAnswer: 3,
    explanation: '光纤通信常用三个波长窗口包括850nm、1310nm和1550nm',
    createdAt: new Date(),
  },
  {
    id: 2,
    categoryId: 1,
    content: 'TCP/IP协议中，IP层对应OSI模型的哪一层？',
    options: ['数据链路层', '网络层', '传输层', '应用层'],
    correctAnswer: 1,
    explanation: 'IP协议工作在OSI模型的网络层',
    createdAt: new Date(),
  },
  {
    id: 3,
    categoryId: 1,
    content: '以下哪个不是移动通信系统？',
    options: ['GSM', 'CDMA', 'WiFi', 'LTE'],
    correctAnswer: 2,
    explanation: 'WiFi是无线局域网技术，不是移动通信系统',
    createdAt: new Date(),
  },
  {
    id: 4,
    categoryId: 2,
    content: '光缆熔接时，最重要的参数是？',
    options: ['熔接电流', '熔接时间', '光纤端面清洁', '以上都是'],
    correctAnswer: 3,
    explanation: '光缆熔接时，端面清洁、熔接电流和时间都很重要',
    createdAt: new Date(),
  },
  {
    id: 5,
    categoryId: 2,
    content: 'OTDR测试仪用于测量什么？',
    options: ['光纤长度', '光纤损耗', '故障点位置', '以上都是'],
    correctAnswer: 3,
    explanation: 'OTDR可测量光纤长度、损耗和故障点位置',
    createdAt: new Date(),
  },
];

// 内存存储
const users: Map<number, User> = new Map(initialUsers.map(u => [u.id, u]));
const categories: Map<number, Category> = new Map(initialCategories.map(c => [c.id, c]));
const questions: Map<number, Question> = new Map(initialQuestions.map(q => [q.id, q]));
const studyRecords: Map<number, StudyRecord[]> = new Map();

let nextUserId = 3;
let nextQuestionId = 6;
let nextStudyRecordId = 1;

export const db = {
  users: {
    findByUsername: (username: string): User | undefined => 
      Array.from(users.values()).find(u => u.username === username),
    findById: (id: number): User | undefined => users.get(id),
  },
  categories: {
    getAll: (): Category[] => Array.from(categories.values()),
  },
  questions: {
    getAll: (categoryId?: number): Question[] => {
      let qs = Array.from(questions.values());
      if (categoryId) {
        qs = qs.filter(q => q.categoryId === categoryId);
      }
      return qs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    findById: (id: number): Question | undefined => questions.get(id),
    create: (data: Omit<Question, 'id' | 'createdAt'>): Question => {
      const q: Question = {
        ...data,
        id: nextQuestionId++,
        createdAt: new Date(),
      };
      questions.set(q.id, q);
      return q;
    },
    update: (id: number, data: Partial<Omit<Question, 'id' | 'createdAt'>>): Question | undefined => {
      const q = questions.get(id);
      if (!q) return undefined;
      const updated = { ...q, ...data };
      questions.set(id, updated);
      return updated;
    },
    delete: (id: number): boolean => questions.delete(id),
  },
  studyRecords: {
    getByUserId: (userId: number): StudyRecord[] => studyRecords.get(userId) || [],
    getByUserAndQuestion: (userId: number, questionId: number): StudyRecord | undefined =>
      studyRecords.get(userId)?.find(sr => sr.questionId === questionId),
    create: (data: Omit<StudyRecord, 'id' | 'createdAt'>): StudyRecord => {
      const sr: StudyRecord = {
        ...data,
        id: nextStudyRecordId++,
        createdAt: new Date(),
      };
      if (!studyRecords.has(sr.userId)) {
        studyRecords.set(sr.userId, []);
      }
      studyRecords.get(sr.userId)!.push(sr);
      return sr;
    },
    update: (id: number, data: Partial<Omit<StudyRecord, 'id' | 'createdAt'>>): StudyRecord | undefined => {
      for (const [userId, records] of studyRecords) {
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
          const updated = { ...records[index], ...data };
          records[index] = updated;
          return updated;
        }
      }
      return undefined;
    },
  },
};

export async function initDatabase() {
  console.log('Using in-memory database for demonstration');
}
