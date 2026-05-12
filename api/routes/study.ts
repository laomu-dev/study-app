import { Router } from 'express';
import { StudyService } from '../services/studyService';
import { UserService } from '../services/userService';

const router = Router();
const studyService = new StudyService();
const userService = new UserService();

async function checkAuth(req: any, res: any) {
  const userId = req.session?.userId;
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

router.get('/today', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const tasks = await studyService.getTodayTasks(user.id, limit);
    res.json({ tasks });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/answer', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const { questionId, selectedAnswer } = req.body;

    if (questionId === undefined || selectedAnswer === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await studyService.submitAnswer(user.id, { questionId, selectedAnswer });
    res.json(result);
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/progress', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const progress = await studyService.getStudyProgress(user.id);
    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const stats = await studyService.getStudyStats(user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
