import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { UserService } from '../services/userService';
import {
  extractRawTextFromBuffer,
  parseJSONFile,
  parseTextFile,
} from '../services/fileParserService';
import { generateQuestionsFromMaterial } from '../services/questionGeneratorService';

const router = Router();
const userService = new UserService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.docx', '.doc', '.txt', '.md', '.pdf'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的资料类型，仅支持: docx, doc, txt, md, pdf'));
    }
  },
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

function buildNotebookPrompt(sourceText: string, questionCount: number): string {
  const excerpt = sourceText.slice(0, 12000);

  return [
    '请基于下面资料生成题库导入用的选择题。',
    '',
    `要求：生成 ${questionCount} 道题，优先生成单选题；如果资料明显适合多选，可以少量生成多选题。`,
    '输出必须是 JSON 数组，不要输出 Markdown，不要添加额外说明。',
    '',
    '每道题格式如下：',
    '[',
    '  {',
    '    "content": "题目内容",',
    '    "options": ["选项A", "选项B", "选项C", "选项D"],',
    '    "answer": "B",',
    '    "explanation": "答案解析，说明依据来自资料哪里"',
    '  }',
    ']',
    '',
    '多选题的 answer 可以写成 "AC"。判断题请转成两个选项 ["错误", "正确"]，answer 写 "正确" 或 "错误"。',
    '',
    '资料如下：',
    excerpt,
  ].join('\n');
}

async function extractMaterialText(req: any, res: any) {
  const user = await checkAdmin(req, res);
  if (!user) return null;

  if (!req.file) {
    res.status(400).json({ error: '请选择资料文件' });
    return null;
  }

  const rawText = await extractRawTextFromBuffer(req.file.buffer, req.file.originalname);
  if (!rawText || rawText.length < 20) {
    res.status(400).json({ error: '未能从资料中提取到足够文本' });
    return null;
  }

  return rawText;
}

router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    const rawText = await extractMaterialText(req, res);
    if (!rawText || !req.file) return;

    const questionCount = Math.min(Math.max(Number(req.body.questionCount) || 20, 1), 100);

    res.json({
      filename: req.file.originalname,
      textLength: rawText.length,
      textPreview: rawText.slice(0, 3000),
      notebookPrompt: buildNotebookPrompt(rawText, questionCount),
      notebookMcpAvailable: false,
      message: '已提取资料文本。当前也支持直接调用模型生成题目。',
    });
  } catch (error: any) {
    console.error('Extract material error:', error);
    res.status(500).json({ error: error.message || '资料解析失败' });
  }
});

router.post('/generate', upload.single('file'), async (req, res) => {
  try {
    const rawText = await extractMaterialText(req, res);
    if (!rawText || !req.file) return;

    const categoryId = Number(req.body.categoryId);
    if (!categoryId) {
      return res.status(400).json({ error: '请选择目标题库' });
    }

    const questionCount = Math.min(Math.max(Number(req.body.questionCount) || 20, 1), 100);
    const questions = await generateQuestionsFromMaterial({
      questionCount,
      sourceText: rawText,
    });

    const questionsWithCategory = questions.map(question => ({
      ...question,
      categoryId,
    }));

    res.json({
      success: questionsWithCategory.length > 0,
      filename: req.file.originalname,
      textLength: rawText.length,
      total: questionsWithCategory.length,
      questions: questionsWithCategory,
      errors: [],
      message: `已生成 ${questionsWithCategory.length} 道题，请检查后导入题库`,
    });
  } catch (error: any) {
    console.error('Generate material questions error:', error);
    res.status(500).json({ error: error.message || '生成题目失败' });
  }
});

router.post('/parse-generated', async (req, res) => {
  try {
    const user = await checkAdmin(req, res);
    if (!user) return;

    const { content, categoryId } = req.body;
    if (!content || !categoryId) {
      return res.status(400).json({ error: '缺少生成内容或目标题库' });
    }

    const text = String(content).trim();
    const parseResult = text.startsWith('[') || text.startsWith('{')
      ? parseJSONFile(text)
      : parseTextFile(text, 'generated.csv');

    const questions = parseResult.questions.map(question => ({
      ...question,
      categoryId: Number(categoryId),
    }));

    res.json({
      success: parseResult.success,
      total: questions.length,
      questions,
      errors: parseResult.errors,
    });
  } catch (error: any) {
    console.error('Parse generated questions error:', error);
    res.status(500).json({ error: error.message || '生成题目解析失败' });
  }
});

export default router;
