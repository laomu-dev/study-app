import type { ParsedQuestion, QuestionType } from './fileParserService';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

type RawGeneratedQuestion = {
  content: string;
  options: string[];
  correctAnswer: number[];
  explanation?: string;
};

type GenerateQuestionOptions = {
  questionCount: number;
  sourceText: string;
};

export type GeneratedQuestion = ParsedQuestion;

export type ExplanationQuestion = {
  id: number;
  content: string;
  options: string[];
  correctAnswer: number | number[];
};

export type GeneratedExplanation = {
  questionId: number;
  explanation: string;
};

const DEFAULT_MODEL = 'gpt-5.5';
let configuredProxy: string | undefined;

function configureProxyIfNeeded() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl || configuredProxy === proxyUrl) return;

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  configuredProxy = proxyUrl;
}

const questionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['content', 'options', 'correctAnswer', 'explanation'],
        properties: {
          content: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          correctAnswer: {
            type: 'array',
            items: { type: 'integer' },
          },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

const explanationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['explanations'],
  properties: {
    explanations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['questionId', 'explanation'],
        properties: {
          questionId: { type: 'integer' },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

function extractResponseText(response: any): string {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const parts: string[] = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function normalizeQuestion(raw: RawGeneratedQuestion, index: number): GeneratedQuestion {
  const options = raw.options.map(option => String(option).trim()).filter(Boolean);
  const answers = raw.correctAnswer;
  const correctAnswer = answers.length === 1 ? answers[0] : answers;

  if (!raw.content?.trim()) {
    throw new Error(`Question ${index + 1} is missing content`);
  }
  if (options.length < 2) {
    throw new Error(`Question ${index + 1} needs at least 2 options`);
  }
  if (!answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer < options.length)) {
    throw new Error(`Question ${index + 1} answer index is out of range`);
  }

  const type: QuestionType = answers.length > 1 ? 'multiple' : 'single';

  return {
    content: raw.content.trim(),
    options,
    correctAnswer,
    isMultiple: type === 'multiple',
    type,
    explanation: raw.explanation?.trim() || undefined,
  };
}

export async function generateQuestionsFromMaterial({
  questionCount,
  sourceText,
}: GenerateQuestionOptions): Promise<GeneratedQuestion[]> {
  configureProxyIfNeeded();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Please configure it in the environment first.');
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const maxSourceChars = Number(process.env.MATERIAL_SOURCE_MAX_CHARS || 60000);
  const excerpt = sourceText.slice(0, maxSourceChars);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            'You are a careful question-bank author.',
            'Only write questions from the provided material. Do not invent facts outside the source.',
            'Prefer single-choice questions. Use multiple-choice only when the source naturally requires it.',
            'correctAnswer must be a zero-based array, such as [1] for one correct answer.',
            'explanation should briefly explain the evidence from the source material.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `Generate ${questionCount} choice questions from the following material.`,
            'Prefer 4 options for each question; use 2 options only when the question is naturally binary.',
            'Return only JSON that matches the schema. Do not output Markdown.',
            '',
            'Material:',
            excerpt,
          ].join('\n'),
        },
      ],
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: 'generated_questions',
          schema: questionSchema,
          strict: true,
        },
      },
      reasoning: {
        effort: 'low',
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI API request failed: HTTP ${response.status}`;
    throw new Error(message);
  }

  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error('The model did not return parseable question content.');
  }

  const parsed = JSON.parse(outputText) as { questions?: RawGeneratedQuestion[] };
  const questions = parsed.questions || [];
  if (!questions.length) {
    throw new Error('The model did not generate any questions.');
  }

  return questions.map(normalizeQuestion);
}

export async function generateQuestionExplanations(
  questions: ExplanationQuestion[],
): Promise<GeneratedExplanation[]> {
  configureProxyIfNeeded();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 OPENAI_API_KEY，请先在服务器环境变量中配置。');
  }

  if (questions.length === 0) return [];

  const model = process.env.OPENAI_EXPLANATION_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            '你是严谨的通信专业题库解析编写助手。',
            '根据题干、选项和已给出的正确答案，逐题编写简洁、准确的中文解析。',
            '不得修改正确答案，不得编造题目没有提供的具体标准编号、数值或事实。',
            '每道题用一至三句话说明正确答案为什么成立；必要时简要指出干扰项的问题。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            '请为以下题目补充解析。correctAnswer 使用从 0 开始的选项下标。',
            '只返回符合指定结构的 JSON。',
            JSON.stringify(questions),
          ].join('\n\n'),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'question_explanations',
          schema: explanationSchema,
          strict: true,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI API request failed: HTTP ${response.status}`;
    throw new Error(message);
  }

  const outputText = extractResponseText(payload);
  if (!outputText) {
    throw new Error('AI 未返回可解析的题目解析。');
  }

  const parsed = JSON.parse(outputText) as { explanations?: GeneratedExplanation[] };
  const questionIds = new Set(questions.map(question => question.id));
  return (parsed.explanations || [])
    .filter(item => questionIds.has(item.questionId) && item.explanation?.trim())
    .map(item => ({
      questionId: item.questionId,
      explanation: item.explanation.trim(),
    }));
}
