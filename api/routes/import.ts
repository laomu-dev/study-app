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

async function checkAdmin(req: any, res: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const user = await userService.findById(userId);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin only' });
    return null;
  }
  return user;
}

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    console.log('=== 开始解析请求');
    const user = await checkAdmin(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const { categoryId } = req.body;
    console.log('文件名:', req.file.originalname);
    console.log('文件大小:', req.file.size);
    console.log('分类ID:', categoryId);
    
    if (!categoryId) {
      return res.status(400).json({ error: '请选择分类' });
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
      console.log('JSON文件内容:', rawText.substring(0, 500));
      parseResult = parseJSONFile(rawText);
    } else {
      rawText = decodeText(req.file.buffer);
      console.log('文本文件内容:', rawText.substring(0, 500));
      parseResult = parseTextFile(rawText, req.file.originalname);
    }

    console.log('解析结果:', parseResult);

    const questionsWithCategory = parseResult.questions.map(q => ({
      ...q,
      categoryId: parseInt(categoryId)
    }));

    console.log('分类后的题目:', questionsWithCategory.length);

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
    const user = await checkAdmin(req, res);
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
        if (!q.categoryId || !q.content || !q.options || q.correctAnswer === undefined) {
          results.failed++;
          results.errors.push(`第 ${i + 1} 题: 缺少必填字段`);
          continue;
        }

        await questionService.createQuestion({
          categoryId: q.categoryId,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          isMultiple: q.isMultiple,
          explanation: q.explanation
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
