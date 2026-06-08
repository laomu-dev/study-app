import { Router } from 'express';
import { QuestionService } from '../services/questionService';
import { UserService } from '../services/userService';
import { generateKnowledgeMap } from '../services/questionGeneratorService';

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

router.post('/generate', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const categoryId = req.body.categoryId ? Number(req.body.categoryId) : undefined;
    const questions = await questionService.getAllQuestions(user.id, categoryId);
    if (questions.length === 0) {
      return res.status(400).json({ error: '当前范围内暂无题目，无法生成知识脉络' });
    }

    const categories = await questionService.getAllCategories(user.id);
    const categoryName = categoryId
      ? categories.find(category => category.id === categoryId)?.name || '当前题库'
      : '全部题库';

    const map = await generateKnowledgeMap({
      categoryName,
      questions: questions.slice(0, 160).map(question => ({
        id: question.id,
        content: question.content,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
      })),
    });

    res.json(map);
  } catch (error: any) {
    console.error('Generate knowledge map error:', error);
    res.status(500).json({ error: error.message || '知识脉络生成失败，请稍后重试' });
  }
});

export default router;
