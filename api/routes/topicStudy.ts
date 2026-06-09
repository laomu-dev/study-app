import { Router } from 'express';
import { QuestionService } from '../services/questionService';
import { StudyService } from '../services/studyService';
import { UserService } from '../services/userService';
import { generateTopicStudy } from '../services/questionGeneratorService';
import { buildTopicStudyPpt, type TopicStudyData } from '../services/topicPptService';

const router = Router();
const questionService = new QuestionService();
const studyService = new StudyService();
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
      return res.status(400).json({ error: '当前范围内暂无题目，无法生成专题学习内容' });
    }

    const categories = await questionService.getAllCategories(user.id);
    const categoryName = categoryId
      ? categories.find(category => category.id === categoryId)?.name || '当前题库'
      : '全部题库';
    const progress = await studyService.getStudyProgress(user.id, categoryId);
    const questionIds = new Set(questions.map(question => question.id));
    const wrongQuestions = (await studyService.getWrongQuestions(user.id))
      .filter(item => questionIds.has(item.question.id))
      .slice(0, 12);

    const topic = await generateTopicStudy({
      categoryName,
      performance: {
        totalQuestions: progress.totalQuestions,
        accuracy: progress.accuracy,
        dueToday: progress.dueToday,
        reviewedToday: progress.reviewedToday,
        weakQuestions: wrongQuestions.map(item => ({
          questionId: item.question.id,
          content: item.question.content,
          accuracy: item.accuracy,
          wrongCount: item.wrongCount,
        })),
      },
      questions: questions.slice(0, 100).map(question => ({
        id: question.id,
        content: question.content,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
      })),
    });

    res.json({
      ...topic,
      performance: {
        totalQuestions: progress.totalQuestions,
        accuracy: progress.accuracy,
        dueToday: progress.dueToday,
        reviewedToday: progress.reviewedToday,
        weakQuestionCount: wrongQuestions.length,
      },
    });
  } catch (error: any) {
    console.error('Generate topic study error:', error);
    res.status(500).json({ error: error.message || '专题学习内容生成失败，请稍后重试' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const topic = req.body as TopicStudyData;
    if (!topic?.title || !Array.isArray(topic.chapters) || topic.chapters.length === 0) {
      return res.status(400).json({ error: '专题内容不完整，无法导出 PPT' });
    }

    const { buffer, fileName } = await buildTopicStudyPpt(topic);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error: any) {
    console.error('Export topic study PPT error:', error);
    res.status(500).json({ error: error.message || 'PPT 导出失败，请稍后重试' });
  }
});

export default router;
