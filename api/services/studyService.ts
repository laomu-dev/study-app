import { db } from '../config/database-simple';
import { Question, StudyRecord, DailyTask, StudyProgress, StudyStats } from '../../shared/types';
import { calculateNextReview, updateMemoryStrength } from '../utils/spacedRepetition';

export interface AnswerSubmission {
  questionId: number;
  selectedAnswer: number;
}

export class StudyService {
  async getTodayTasks(userId: number, limit: number = 20): Promise<DailyTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allQuestions = db.questions.getAll();
    const userRecords = db.studyRecords.getByUserId(userId);
    const recordsMap = new Map(userRecords.map(r => [r.questionId, r]));

    const tasks: DailyTask[] = [];

    for (const q of allQuestions) {
      const record = recordsMap.get(q.id);

      // Include new questions or questions due for review
      if (!record || record.nextReviewAt <= tomorrow) {
        tasks.push({
          question: q,
          isNew: !record,
          studyRecord: record,
        });
      }

      if (tasks.length >= limit) break;
    }

    return tasks;
  }

  async submitAnswer(userId: number, submission: AnswerSubmission): Promise<{ isCorrect: boolean; studyRecord: StudyRecord }> {
    const question = db.questions.findById(submission.questionId);
    if (!question) throw new Error('Question not found');

    const isCorrect = question.correctAnswer === submission.selectedAnswer;

    let studyRecord = db.studyRecords.getByUserAndQuestion(userId, submission.questionId);

    if (studyRecord) {
      const newMemoryStrength = updateMemoryStrength(isCorrect, studyRecord.memoryStrength);
      const nextReviewAt = calculateNextReview(newMemoryStrength);

      studyRecord = db.studyRecords.update(studyRecord.id, {
        memoryStrength: newMemoryStrength,
        nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: studyRecord.reviewCount + 1,
        correctCount: studyRecord.correctCount + (isCorrect ? 1 : 0),
      })!;
    } else {
      const initialMemoryStrength = updateMemoryStrength(isCorrect, 0);
      const nextReviewAt = calculateNextReview(initialMemoryStrength);

      studyRecord = db.studyRecords.create({
        userId,
        questionId: submission.questionId,
        memoryStrength: initialMemoryStrength,
        nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: 1,
        correctCount: isCorrect ? 1 : 0,
      });
    }

    return { isCorrect, studyRecord };
  }

  async getStudyProgress(userId: number): Promise<StudyProgress> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allQuestions = db.questions.getAll();
    const userRecords = db.studyRecords.getByUserId(userId);

    const reviewedToday = userRecords.filter(r => {
      const reviewed = new Date(r.lastReviewedAt!);
      return reviewed >= today && reviewed < tomorrow;
    }).length;

    const dueToday = allQuestions.filter(q => {
      const record = userRecords.find(r => r.questionId === q.id);
      return !record || record.nextReviewAt <= tomorrow;
    }).length;

    const totalReviews = userRecords.reduce((sum, r) => sum + r.reviewCount, 0);
    const totalCorrect = userRecords.reduce((sum, r) => sum + r.correctCount, 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    return {
      totalQuestions: allQuestions.length,
      reviewedToday,
      dueToday,
      accuracy,
    };
  }

  async getStudyStats(userId: number): Promise<StudyStats> {
    const userRecords = db.studyRecords.getByUserId(userId);

    const totalReviews = userRecords.reduce((sum, r) => sum + r.reviewCount, 0);
    const totalCorrect = userRecords.reduce((sum, r) => sum + r.correctCount, 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    return {
      totalReviews,
      totalCorrect,
      accuracy,
      streakDays: 0, // Simplified for demo
    };
  }

  async getStudyRecord(userId: number, questionId: number): Promise<StudyRecord | null> {
    return db.studyRecords.getByUserAndQuestion(userId, questionId) || null;
  }
}
