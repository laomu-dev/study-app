
// 记忆强度对应的复习间隔（天）
const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30];

export function calculateNextReview(memoryStrength: number): Date {
  const interval = REVIEW_INTERVALS[Math.min(memoryStrength, REVIEW_INTERVALS.length - 1)];
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return nextReview;
}

export function updateMemoryStrength(isCorrect: boolean, currentStrength: number): number {
  if (isCorrect) {
    return Math.min(currentStrength + 1, REVIEW_INTERVALS.length - 1);
  } else {
    return Math.max(0, currentStrength - 1);
  }
}

export function getReviewIntervalLabel(memoryStrength: number): string {
  const intervals = ['立即', '1天后', '2天后', '4天后', '1周后', '15天后', '1个月后'];
  return intervals[Math.min(memoryStrength, intervals.length - 1)];
}
