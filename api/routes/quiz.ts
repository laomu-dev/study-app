import { Router } from 'express';
import { QuestionService } from '../services/questionService';
import { UserService } from '../services/userService';

const router = Router();
const questionService = new QuestionService();
const userService = new UserService();

type QuizAnswer = {
  questionId: number;
  selectedAnswer: number | number[];
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function checkAnswerCorrect(correct: number | number[], selected: number | number[]): boolean {
  if (Array.isArray(correct) && Array.isArray(selected)) {
    if (correct.length !== selected.length) return false;
    const sortedCorrect = [...correct].sort();
    const sortedSelected = [...selected].sort();
    return sortedCorrect.every((value, index) => value === sortedSelected[index]);
  }

  return !Array.isArray(correct) && !Array.isArray(selected) && correct === selected;
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

router.post('/start', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const categoryId = req.body.categoryId ? Number(req.body.categoryId) : undefined;
    const limit = Math.min(Math.max(Number(req.body.limit) || 20, 1), 100);
    const questions = shuffle(await questionService.getAllQuestions(categoryId)).slice(0, limit);

    if (questions.length === 0) {
      return res.status(400).json({ error: '当前题库暂无题目' });
    }

    (req.session as any).quizQuestionIds = questions.map(question => question.id);

    res.json({
      questions: questions.map(question => ({
        id: question.id,
        categoryId: question.categoryId,
        content: question.content,
        options: question.options,
        isMultiple: question.isMultiple,
        type: question.type,
      })),
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const user = await checkAuth(req, res);
    if (!user) return;

    const answers: QuizAnswer[] = Array.isArray(req.body.answers) ? req.body.answers : [];
    const quizQuestionIds: number[] = (req.session as any).quizQuestionIds || [];

    if (quizQuestionIds.length === 0) {
      return res.status(400).json({ error: '请先开始一次测验' });
    }

    const answerMap = new Map(answers.map(answer => [Number(answer.questionId), answer.selectedAnswer]));
    const results = [];
    let correctCount = 0;

    for (const questionId of quizQuestionIds) {
      const question = await questionService.getQuestionById(questionId);
      if (!question) continue;

      const selectedAnswer = answerMap.get(questionId);
      const isCorrect = selectedAnswer !== undefined
        ? checkAnswerCorrect(question.correctAnswer, selectedAnswer)
        : false;

      if (isCorrect) correctCount++;

      results.push({
        questionId,
        content: question.content,
        options: question.options,
        selectedAnswer: selectedAnswer ?? null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      });
    }

    res.json({
      total: results.length,
      correct: correctCount,
      accuracy: results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0,
      results,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
