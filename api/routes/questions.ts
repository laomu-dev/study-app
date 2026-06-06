import { Router } from 'express';
import { QuestionService } from '../services/questionService';
import { UserService } from '../services/userService';
import { generateQuestionExplanations } from '../services/questionGeneratorService';

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

router.get('/', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const questions = await questionService.getAllQuestions(user.id, categoryId);
    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const categories = await questionService.getAllCategories(user.id);
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-explanations', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const categoryId = req.body.categoryId ? Number(req.body.categoryId) : undefined;
    const batchSize = Math.min(Math.max(Number(req.body.batchSize) || 20, 1), 20);
    const questions = await questionService.getAllQuestions(user.id, categoryId);
    const missing = questions.filter(question => !question.explanation?.trim());
    const batch = missing.slice(0, batchSize);

    if (batch.length === 0) {
      return res.json({ updated: 0, remaining: 0, totalMissing: 0 });
    }

    const generated = await generateQuestionExplanations(batch.map(question => ({
      id: question.id,
      content: question.content,
      options: question.options,
      correctAnswer: question.correctAnswer,
    })));

    let updated = 0;
    for (const item of generated) {
      const question = batch.find(candidate => candidate.id === item.questionId);
      if (!question) continue;
      const result = await questionService.updateQuestion(user.id, question.id, {
        explanation: item.explanation,
      });
      if (result) updated++;
    }

    res.json({
      updated,
      remaining: Math.max(missing.length - updated, 0),
      totalMissing: missing.length,
    });
  } catch (error: any) {
    console.error('Generate explanations error:', error);
    res.status(500).json({ error: error.message || 'AI 解析生成失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const id = parseInt(req.params.id);
    const question = await questionService.getQuestionById(user.id, id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;
    
    const { categoryId, content, options, correctAnswer, explanation } = req.body;

    if (!categoryId || !content || !options || correctAnswer === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const question = await questionService.createQuestion(user.id, {
      categoryId,
      content,
      options,
      correctAnswer,
      explanation
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;
    
    const id = parseInt(req.params.id);
    const { categoryId, content, options, correctAnswer, explanation } = req.body;

    const question = await questionService.updateQuestion(user.id, id, {
      categoryId,
      content,
      options,
      correctAnswer,
      explanation
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;
    
    const id = parseInt(req.params.id);
    const success = await questionService.deleteQuestion(user.id, id);

    if (!success) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;
    
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await questionService.createCategory(user.id, name, description);
    res.status(201).json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
