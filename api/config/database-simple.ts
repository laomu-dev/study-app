// 简化版内存数据库，用于演示
// 实际生产环境应使用MySQL等真实数据库

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPasswordHash = '$2b$10$rzTnHNeE2DzP5mrAX0idOe0dbgF1EL0E/zfszsShlRrG/yoWD5mni';

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
  userId?: number;
  name: string;
  description?: string;
}

export type QuestionType = 'single' | 'multiple' | 'judge';

export interface Question {
  id: number;
  userId?: number;
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
export const initialUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: defaultPasswordHash, // admin123
    role: 'admin',
    createdAt: new Date(),
  },
  {
    id: 2,
    username: 'testuser',
    email: 'user@example.com',
    passwordHash: defaultPasswordHash, // admin123
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: 3,
    username: 'admin2',
    email: 'admin2@example.com',
    passwordHash: defaultPasswordHash, // admin123
    role: 'admin',
    createdAt: new Date(),
  },
  {
    id: 4,
    username: 'admin3',
    email: 'admin3@example.com',
    passwordHash: defaultPasswordHash, // admin123
    role: 'admin',
    createdAt: new Date(),
  },
  {
    id: 5,
    username: 'admin4',
    email: 'admin4@example.com',
    passwordHash: defaultPasswordHash, // admin123
    role: 'admin',
    createdAt: new Date(),
  },
];

export const initialCategories: Category[] = [
  { id: 1, name: '通信题库', description: '通信岗位基础与专业题目' },
  { id: 2, name: '人工智能题库', description: 'AI 基础知识、应用方法与资料生成题' },
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
    categoryId: 1,
    content: '光缆熔接时，最重要的参数是？',
    options: ['熔接电流', '熔接时间', '光纤端面清洁', '以上都是'],
    correctAnswer: 3,
    explanation: '光缆熔接时，端面清洁、熔接电流和时间都很重要',
    createdAt: new Date(),
  },
  {
    id: 5,
    categoryId: 1,
    content: 'OTDR测试仪用于测量什么？',
    options: ['光纤长度', '光纤损耗', '故障点位置', '以上都是'],
    correctAnswer: 3,
    explanation: 'OTDR可测量光纤长度、损耗和故障点位置',
    createdAt: new Date(),
  },
  {
    id: 6,
    categoryId: 2,
    content: '在文档中，Token 被描述为大模型处理信息的什么单位？',
    options: ['最小基础单元', '网络传输协议', '数据库表结构', '模型部署环境'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档明确指出，Token 是大模型解析、处理文本及图像等信息的最小基础单元。',
    createdAt: new Date(),
  },
  {
    id: 7,
    categoryId: 2,
    content: '文档提到 Token 具有哪一项核心作用？',
    options: ['决定上下文窗口的记忆承载长度', '决定显示器分辨率', '决定数据库主键类型', '决定操作系统版本'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档将 Token 与模型上下文窗口，也就是记忆承载长度联系起来。',
    createdAt: new Date(),
  },
  {
    id: 8,
    categoryId: 2,
    content: '相较于纯文本内容，图像为什么通常会消耗更多 Token？',
    options: ['图像需要通过分块编码完成解析', '图像不能被模型识别', '图像会自动转换成数据库', '图像只包含一个固定 Token'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档说明图像需通过分块编码解析，因此会消耗大量 Token 资源。',
    createdAt: new Date(),
  },
  {
    id: 9,
    categoryId: 2,
    content: '文档中将大模型专业化落地的两大核心技术路径概括为哪两项？',
    options: ['微调与 RAG', '压缩与解压', '前端与后端', '登录与注册'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档第二个核心收获明确写到微调与 RAG 是专业化落地的两大核心技术路径。',
    createdAt: new Date(),
  },
  {
    id: 10,
    categoryId: 2,
    content: '微调在文档中被归类为哪类方式？',
    options: ['模型内部优化方式', '外部检索辅助方式', '硬件散热方式', '网页展示方式'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档说明微调属于模型内部优化方式，通过业务专属数据集对预训练模型二次训练。',
    createdAt: new Date(),
  },
  {
    id: 11,
    categoryId: 2,
    content: '微调更适合哪类业务场景？',
    options: ['标准化、固定化的业务场景', '实时政策频繁变化且必须联网检索的场景', '只需要压缩图片的场景', '完全不需要固定输出格式的场景'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档指出微调输出稳定性和统一性强，适用于标准化、固定化业务场景。',
    createdAt: new Date(),
  },
  {
    id: 12,
    categoryId: 2,
    content: 'RAG 的中文含义在文档中对应哪一种技术？',
    options: ['检索增强生成', '随机访问网关', '递归自动生成', '规则答案归档'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档将 RAG 解释为检索增强生成，通过外部知识库辅助生成答案。',
    createdAt: new Date(),
  },
  {
    id: 13,
    categoryId: 2,
    content: 'RAG 的主要优势不包括下列哪一项？',
    options: ['把所有知识永久写入模型参数', '实时检索外部权威知识库', '实现知识动态更新', '降低模型幻觉问题'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档强调 RAG 是外部辅助技术，不是把所有知识内化进模型参数。',
    createdAt: new Date(),
  },
  {
    id: 14,
    categoryId: 2,
    content: '文档认为 RAG 更适配哪类应用场景？',
    options: ['知识迭代频繁、需要精准溯源的场景', '永远不变化的固定格式输出场景', '只追求模型参数变小的场景', '不需要任何知识依据的场景'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档指出 RAG 适配知识迭代频繁、需精准溯源的应用场景。',
    createdAt: new Date(),
  },
  {
    id: 15,
    categoryId: 2,
    content: '模型蒸馏中的“教师模型”通常指什么？',
    options: ['高性能大模型', '低清晰度图片', '前端页面模板', '数据库索引'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档说明模型蒸馏以高性能大模型为教师模型。',
    createdAt: new Date(),
  },
  {
    id: 16,
    categoryId: 2,
    content: '模型蒸馏的核心目标是什么？',
    options: ['实现模型轻量化部署', '增加网页动画效果', '替代所有数据标注', '扩大图片尺寸'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档明确指出模型蒸馏的核心目标是实现模型轻量化落地。',
    createdAt: new Date(),
  },
  {
    id: 17,
    categoryId: 2,
    content: '模型蒸馏通常希望带来什么效果？',
    options: ['缩减参数量、提升推理速度、降低部署与算力成本', '增加参数量并降低速度', '只改变页面颜色', '删除模型的全部推理能力'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档写到蒸馏可大幅缩减模型参数量、提升推理速度并降低成本。',
    createdAt: new Date(),
  },
  {
    id: 18,
    categoryId: 2,
    content: '文档如何区分模型蒸馏与微调的侧重点？',
    options: ['蒸馏侧重轻量化部署，微调侧重业务适配性', '蒸馏侧重网页设计，微调侧重数据库备份', '两者完全没有区别', '微调只用于图片分块'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档指出蒸馏与侧重提升业务适配性的微调存在本质应用差异。',
    createdAt: new Date(),
  },
  {
    id: 19,
    categoryId: 2,
    content: '文档中“大模型幻觉”指的是哪类现象？',
    options: ['内容看似通顺合理，但存在事实错误、逻辑矛盾、虚构信息或无依据推导', '模型可以准确引用所有资料', '模型拒绝回答任何问题', '模型只能处理图片'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档对大模型幻觉的定义包含事实错误、逻辑矛盾、虚构信息和无依据推导。',
    createdAt: new Date(),
  },
  {
    id: 20,
    categoryId: 2,
    content: '“权威来源核验法”主要用于检查什么？',
    options: ['模型输出的事实性内容是否有可靠来源支撑', '页面按钮是否能点击', '电脑内存是否充足', '图片是否足够美观'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档说明该方法要逐一核查公开权威资料，判断是否有可靠溯源依据。',
    createdAt: new Date(),
  },
  {
    id: 21,
    categoryId: 2,
    content: '如果模型回答出现前后矛盾、因果断裂、概念混淆，应优先使用哪种辨别方法判断幻觉？',
    options: ['逻辑自洽校验法', '虚构内容排查法', '文件压缩法', '模型蒸馏法'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档将前后矛盾、因果逻辑断裂等归入逻辑自洽校验的范围。',
    createdAt: new Date(),
  },
  {
    id: 22,
    categoryId: 2,
    content: '针对法律、医疗、金融、工程等强专业领域输出，文档建议使用哪种方法校验？',
    options: ['专业内容校验法', '随机猜测法', '只看语气法', '忽略术语法'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档指出强专业领域要对照行业标准、专业规范和术语体系核查。',
    createdAt: new Date(),
  },
  {
    id: 23,
    categoryId: 2,
    content: '文档提醒应警惕模型哪类表述特征？',
    options: ['过度自信的绝对化表述及模糊概括语句', '明确说明不确定性的表述', '提供具体出处的表述', '承认需要核验的表述'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档要求重点关注“据统计”“相关研究表明”等无具体出处的模糊性概括。',
    createdAt: new Date(),
  },
  {
    id: 24,
    categoryId: 2,
    content: '虚构内容排查法重点核查哪类信息？',
    options: ['文献、案例、法规编号、实验数据、机构名称、人物信息等具体内容', '按钮颜色和字体大小', '浏览器缓存大小', '键盘快捷键设置'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档指出这些具体内容容易无中生有，是幻觉的高频表现。',
    createdAt: new Date(),
  },
  {
    id: 25,
    categoryId: 2,
    content: '时间边界判定法适用于识别哪种幻觉风险？',
    options: ['未联网模型输出训练截止时间之后的新事件或新数据', '模型正确引用已有资料', '用户手动上传文件', '题库名称重复'],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: '文档说明若模型未联网却输出训练截止之后发生的事件或新增数据，内容存在幻觉风险。',
    createdAt: new Date(),
  },
];

function loadAdditionalQuestions(): Question[] {
  const filePath = path.join(__dirname, '../data/provincial-communication-questions.json');
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row: any, index: number): Question | null => {
        if (!row?.content || !Array.isArray(row.options) || row.correctAnswer === undefined) {
          return null;
        }

        return {
          id: 10000 + index,
          categoryId: Number(row.categoryId || 1),
          content: String(row.content),
          options: row.options.map((option: unknown) => String(option)),
          correctAnswer: row.correctAnswer,
          isMultiple: Boolean(row.isMultiple),
          type: row.type || 'single',
          explanation: row.explanation ? String(row.explanation) : undefined,
          createdAt: new Date(),
        };
      })
      .filter((question): question is Question => question !== null);
  } catch (error) {
    console.error('Failed to load additional questions:', error);
    return [];
  }
}

export const seedQuestions = [...initialQuestions, ...loadAdditionalQuestions()];

// 内存存储
const users: Map<number, User> = new Map(initialUsers.map(u => [u.id, u]));
const categories: Map<number, Category> = new Map();
const questions: Map<number, Question> = new Map();
const studyRecords: Map<number, StudyRecord[]> = new Map();

let nextUserId = Math.max(...initialUsers.map(user => user.id)) + 1;
let nextCategoryId = 1;
let nextQuestionId = 1;
let nextStudyRecordId = 1;

function seedDefaultContentForUser(userId: number): void {
  const categoryIdMap = new Map<number, number>();

  for (const templateCategory of initialCategories) {
    const category: Category = {
      id: nextCategoryId++,
      userId,
      name: templateCategory.name,
      description: templateCategory.description,
    };
    categories.set(category.id, category);
    categoryIdMap.set(templateCategory.id, category.id);
  }

  for (const templateQuestion of seedQuestions) {
    const categoryId = categoryIdMap.get(templateQuestion.categoryId);
    if (!categoryId) continue;

    const question: Question = {
      ...templateQuestion,
      id: nextQuestionId++,
      userId,
      categoryId,
      createdAt: new Date(templateQuestion.createdAt),
    };
    questions.set(question.id, question);
  }
}

for (const user of initialUsers) {
  seedDefaultContentForUser(user.id);
}

export const db = {
  users: {
    findByUsername: (username: string): User | undefined => 
      Array.from(users.values()).find(u => u.username === username),
    findById: (id: number): User | undefined => users.get(id),
    create: (data: Omit<User, 'id' | 'createdAt'>): User => {
      const user: User = {
        ...data,
        id: nextUserId++,
        createdAt: new Date(),
      };
      users.set(user.id, user);
      seedDefaultContentForUser(user.id);
      return user;
    },
  },
  categories: {
    getAll: (userId: number): Category[] =>
      Array.from(categories.values()).filter(category => category.userId === userId),
    findById: (id: number, userId?: number): Category | undefined => {
      const category = categories.get(id);
      if (!category) return undefined;
      if (userId !== undefined && category.userId !== userId) return undefined;
      return category;
    },
    create: (data: Omit<Category, 'id'> & { userId: number }): Category => {
      const category: Category = {
        ...data,
        id: nextCategoryId++,
      };
      categories.set(category.id, category);
      return category;
    },
  },
  questions: {
    getAll: (userId: number, categoryId?: number): Question[] => {
      let qs = Array.from(questions.values()).filter(q => q.userId === userId);
      if (categoryId) {
        qs = qs.filter(q => q.categoryId === categoryId);
      }
      return qs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    findById: (id: number, userId?: number): Question | undefined => {
      const question = questions.get(id);
      if (!question) return undefined;
      if (userId !== undefined && question.userId !== userId) return undefined;
      return question;
    },
    create: (data: Omit<Question, 'id' | 'createdAt'> & { userId: number }): Question => {
      const q: Question = {
        ...data,
        id: nextQuestionId++,
        createdAt: new Date(),
      };
      questions.set(q.id, q);
      return q;
    },
    update: (id: number, userId: number, data: Partial<Omit<Question, 'id' | 'createdAt' | 'userId'>>): Question | undefined => {
      const q = questions.get(id);
      if (!q || q.userId !== userId) return undefined;
      const updated = { ...q, ...data };
      questions.set(id, updated);
      return updated;
    },
    delete: (id: number, userId: number): boolean => {
      const question = questions.get(id);
      if (!question || question.userId !== userId) return false;
      return questions.delete(id);
    },
  },
  studyRecords: {
    getByUserId: (userId: number): StudyRecord[] => studyRecords.get(userId) || [],
    getWrongQuestions: (userId: number) => {
      return (studyRecords.get(userId) || [])
        .filter(record => record.reviewCount > record.correctCount)
        .map(record => {
          const question = questions.get(record.questionId);
          if (!question || question.userId !== userId) return null;

          const category = categories.get(question.categoryId);
          const wrongCount = record.reviewCount - record.correctCount;

          return {
            question,
            studyRecord: record,
            categoryName: category?.name || null,
            wrongCount,
            accuracy: record.reviewCount > 0
              ? Math.round((record.correctCount / record.reviewCount) * 100)
              : 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0;
          if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
          return new Date(b.studyRecord.lastReviewedAt || 0).getTime()
            - new Date(a.studyRecord.lastReviewedAt || 0).getTime();
        });
    },
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
