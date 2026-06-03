import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { UserService } from '../services/userService';
import { QuestionService } from '../services/questionService';
import { parseWordFile, parseTextFile, parseJSONFile, parsePDFFile, decodeText, type ParsedQuestion } from '../services/fileParserService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const userService = new UserService();
const questionService = new QuestionService();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.docx', '.doc', '.txt', '.csv', '.json', '.pdf'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持: docx, doc, txt, csv, json, pdf'));
    }
  }
});

function isValidAnswer(answer: unknown, optionsCount: number): boolean {
  if (typeof answer === 'number') {
    return Number.isInteger(answer) && answer >= 0 && answer < optionsCount;
  }

  if (Array.isArray(answer)) {
    return answer.length > 0
      && answer.every(item => Number.isInteger(item) && item >= 0 && item < optionsCount);
  }

  return false;
}

async function checkAuth(req: any, res: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const user = await userService.findById(userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const { categoryId } = req.body;
    
    if (!categoryId) {
      return res.status(400).json({ error: '请选择分类' });
    }

    if (!(await questionService.getAllCategories(user.id)).some(category => category.id === Number(categoryId))) {
      return res.status(404).json({ error: '题库不存在' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let parseResult;
    let rawText = '';

    if (ext === '.docx' || ext === '.doc') {
      parseResult = await parseWordFile(req.file.buffer);
    } else if (ext === '.pdf') {
      parseResult = await parsePDFFile(req.file.buffer);
    } else if (ext === '.json') {
      rawText = decodeText(req.file.buffer);
      parseResult = parseJSONFile(rawText);
    } else {
      rawText = decodeText(req.file.buffer);
      parseResult = parseTextFile(rawText, req.file.originalname);
    }

    const questionsWithCategory = parseResult.questions.map(q => ({
      ...q,
      categoryId: parseInt(categoryId)
    }));

    res.json({
      success: parseResult.success,
      filename: req.file.originalname,
      total: questionsWithCategory.length,
      questions: questionsWithCategory,
      errors: parseResult.errors
    });
  } catch (error: any) {
    console.error('Parse file error:', error);
    res.status(500).json({ error: error.message || '文件解析失败' });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '没有题目可以导入' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        if (!q.categoryId || !q.content || !Array.isArray(q.options) || q.correctAnswer === undefined) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 题: 缺少必填字段`);
          continue;
        }

        const options = q.options.map((option: unknown) => String(option).trim()).filter(Boolean);
        if (options.length < 2) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 题: 至少需要2个有效选项`);
          continue;
        }

        if (!isValidAnswer(q.correctAnswer, options.length)) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 题: 答案超出选项范围`);
          continue;
        }

        await questionService.createQuestion(user.id, {
          categoryId: Number(q.categoryId),
          content: String(q.content).trim(),
          options,
          correctAnswer: q.correctAnswer,
          isMultiple: Array.isArray(q.correctAnswer) || q.isMultiple,
          explanation: q.explanation ? String(q.explanation).trim() : undefined
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`第 ${i + 1} 题: ${err.message}`);
      }
    }

    res.json({
      message: `导入完成: ${results.success} 成功, ${results.failed} 失败`,
      ...results
    });
  } catch (error: any) {
    console.error('Batch import error:', error);
    res.status(500).json({ error: '批量导入失败' });
  }
});

export default router;
