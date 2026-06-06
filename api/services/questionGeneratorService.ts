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

type CompatibleAIConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function configureProxyIfNeeded() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl || configuredProxy === proxyUrl) return;

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  configuredProxy = proxyUrl;
}

function getCompatibleAIConfig(): CompatibleAIConfig | null {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) return null;

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
  };
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

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function requestCompatibleJson(
  config: CompatibleAIConfig,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `AI API request failed: HTTP ${response.status}`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 未返回可解析的 JSON 内容。');
  }

  return extractJsonText(content);
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
  const compatibleConfig = getCompatibleAIConfig();
  if (!compatibleConfig) {
    configureProxyIfNeeded();
  }
  const maxSourceChars = Number(process.env.MATERIAL_SOURCE_MAX_CHARS || 60000);
  const excerpt = sourceText.slice(0, maxSourceChars);
  const messages = [
    {
      role: 'system' as const,
      content: [
        '你是严谨的题库编写助手。',
        '只能依据用户提供的资料出题，不得编造资料之外的事实。',
        '优先生成单选题，只有资料确实需要时才生成多选题。',
        'correctAnswer 必须是从 0 开始的下标数组，例如 [1]。',
        '每道题都必须包含简洁、准确的 explanation。',
        `返回 JSON，结构必须符合：${JSON.stringify(questionSchema)}`,
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: [
        `请根据以下资料生成 ${questionCount} 道选择题。`,
        '每题优先提供 4 个选项；只有天然判断题才使用 2 个选项。',
        '只返回 JSON，不要输出 Markdown。',
        '',
        '资料：',
        excerpt,
      ].join('\n'),
    },
  ];

  if (compatibleConfig) {
    const outputText = await requestCompatibleJson(compatibleConfig, messages);
    const parsed = JSON.parse(outputText) as { questions?: RawGeneratedQuestion[] };
    const questions = parsed.questions || [];
    if (!questions.length) {
      throw new Error('AI 未生成任何题目。');
    }
    return questions.map(normalizeQuestion);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 AI_API_KEY 或 OPENAI_API_KEY，请先在服务器环境变量中配置。');
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: messages,
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
  if (questions.length === 0) return [];

  const messages = [
    {
      role: 'system' as const,
      content: [
        '你是严谨的通信专业题库解析编写助手。',
        '根据题干、选项和已给出的正确答案，逐题编写简洁、准确的中文解析。',
        '不得修改正确答案，不得编造题目没有提供的具体标准编号、数值或事实。',
        '每道题用一至三句话说明正确答案为什么成立；必要时简要指出干扰项的问题。',
        `返回 JSON，结构必须符合：${JSON.stringify(explanationSchema)}`,
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: [
        '请为以下题目补充解析。correctAnswer 使用从 0 开始的选项下标。',
        '只返回 JSON，不要输出 Markdown。',
        JSON.stringify(questions),
      ].join('\n\n'),
    },
  ];

  const compatibleConfig = getCompatibleAIConfig();
  if (compatibleConfig) {
    const outputText = await requestCompatibleJson(compatibleConfig, messages);
    return normalizeExplanations(outputText, questions);
  }

  configureProxyIfNeeded();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 AI_API_KEY 或 OPENAI_API_KEY，请先在服务器环境变量中配置。');
  }

  const model = process.env.OPENAI_EXPLANATION_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: messages,
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

  return normalizeExplanations(outputText, questions);
}

function normalizeExplanations(
  outputText: string,
  questions: ExplanationQuestion[],
): GeneratedExplanation[] {
  const parsed = JSON.parse(extractJsonText(outputText)) as { explanations?: GeneratedExplanation[] };
  const questionIds = new Set(questions.map(question => question.id));
  return (parsed.explanations || [])
    .filter(item => questionIds.has(item.questionId) && item.explanation?.trim())
    .map(item => ({
      questionId: item.questionId,
      explanation: item.explanation.trim(),
    }));
}
