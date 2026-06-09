export type TopicStudyData = {
  title: string;
  subtitle: string;
  overview: string;
  objectives: string[];
  coreSummary: string[];
  chapters: Array<{
    id: string;
    title: string;
    summary: string;
    explanation: string;
    keyPoints: string[];
    questionIds: number[];
  }>;
  pitfalls: Array<{
    title: string;
    explanation: string;
    questionIds: number[];
  }>;
  representativeQuestions: Array<{
    questionId: number;
    reason: string;
  }>;
  studyPlan: Array<{
    step: number;
    title: string;
    action: string;
  }>;
  closingAdvice: string;
  performance: {
    totalQuestions: number;
    accuracy: number;
    dueToday: number;
    reviewedToday: number;
    weakQuestionCount: number;
  };
};

export async function exportTopicStudyPpt(data: TopicStudyData) {
  const response = await fetch('/api/topic-study/export', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const fileName = encodedName ? decodeURIComponent(encodedName) : `${data.title || '专题学习'}.pptx`;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
