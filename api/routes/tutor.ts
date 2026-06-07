import { Router } from 'express';
import { QuestionService } from '../services/questionService';
import { UserService } from '../services/userService';
import { generateTutorReply, type TutorMessage } from '../services/questionGeneratorService';

const router = Router();
const questionService = new QuestionService();
const userService = new UserService();

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

function getSearchTerms(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const terms = new Set(normalized.split(/\s+/).filter(term => term.length >= 2));
  const chinese = normalized.replace(/[^\p{Script=Han}]/gu, '');
  for (let index = 0; index < chinese.length - 1; index++) {
    terms.add(chinese.slice(index, index + 2));
  }
  return [...terms].slice(0, 80);
}

router.post('/chat', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const message = String(req.body.message || '').trim();
    const categoryId = req.body.categoryId ? Number(req.body.categoryId) : undefined;
    const history: TutorMessage[] = Array.isArray(req.body.history)
      ? req.body.history
          .filter((item: any) => item?.role === 'user' || item?.role === 'assistant')
          .map((item: any) => ({
            role: item.role,
            content: String(item.content || '').slice(0, 4000),
          }))
          .slice(-8)
      : [];

    if (!message) {
      return res.status(400).json({ error: '请输入想学习或询问的内容' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: '单次提问请控制在 2000 字以内' });
    }

    const allQuestions = await questionService.getAllQuestions(user.id, categoryId);
    const terms = getSearchTerms(message);
    const ranked = allQuestions
      .map(question => {
        const searchable = `${question.content} ${question.explanation || ''} ${question.options.join(' ')}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
        return { question, score };
      })
      .sort((left, right) => right.score - left.score);

    const hasMatches = ranked.some(item => item.score > 0);
    const contextQuestions = (hasMatches
      ? ranked.filter(item => item.score > 0)
      : ranked
    ).slice(0, 20).map(item => item.question);

    const reply = await generateTutorReply({
      message,
      history,
      questions: contextQuestions,
    });

    res.json(reply);
  } catch (error: any) {
    console.error('AI tutor chat error:', error);
    res.status(500).json({ error: error.message || 'AI 导师暂时无法回答，请稍后重试' });
  }
});

export default router;
