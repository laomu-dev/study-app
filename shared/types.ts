
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface Question {
  id: number;
  categoryId: number;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  createdAt: Date;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface StudyRecord {
  id: number;
  userId: number;
  questionId: number;
  memoryStrength: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
  reviewCount: number;
  correctCount: number;
}

export interface DailyTask {
  question: Question;
  isNew: boolean;
  studyRecord?: StudyRecord;
}

export interface StudyProgress {
  totalQuestions: number;
  reviewedToday: number;
  dueToday: number;
  accuracy: number;
}

export interface StudyStats {
  totalReviews: number;
  totalCorrect: number;
  accuracy: number;
  streakDays: number;
}
