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
  explanation?: string | null;
};

export type GeneratedExplanation = {
  questionId: number;
  explanation: string;
};

export type TutorMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type TutorOptions = {
  message: string;
  history: TutorMessage[];
  questions: ExplanationQuestion[];
};

type KnowledgeMapOptions = {
  categoryName: string;
  questions: ExplanationQuestion[];
};

type TopicStudyOptions = {
  categoryName: string;
  questions: ExplanationQuestion[];
  performance: {
    totalQuestions: number;
    accuracy: number;
    dueToday: number;
    reviewedToday: number;
    weakQuestions: Array<{
      questionId: number;
      content: string;
      accuracy: number;
      wrongCount: number;
    }>;
  };
};

export type TutorReply = {
  answer: string;
  keyPoints: string[];
  suggestedQuestions: string[];
  references: Array<{
    questionId: number;
    content: string;
  }>;
};

export type KnowledgeMapNode = {
  id: string;
  label: string;
  type: 'concept' | 'subtopic' | 'mistake' | 'question';
  summary: string;
  details: string;
  questionIds: number[];
};

export type KnowledgeMapEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'prerequisite' | 'contains' | 'confuses' | 'tests';
};

export type KnowledgeMapResult = {
  title: string;
  overview: string;
  studyPath: string[];
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
};

export type TopicStudyResult = {
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

const tutorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'keyPoints', 'suggestedQuestions', 'references'],
  properties: {
    answer: { type: 'string' },
    keyPoints: {
      type: 'array',
      items: { type: 'string' },
    },
    suggestedQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
    references: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['questionId', 'content'],
        properties: {
          questionId: { type: 'integer' },
          content: { type: 'string' },
        },
      },
    },
  },
};

const knowledgeMapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'overview', 'studyPath', 'nodes', 'edges'],
  properties: {
    title: { type: 'string' },
    overview: { type: 'string' },
    studyPath: {
      type: 'array',
      items: { type: 'string' },
    },
    nodes: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'type', 'summary', 'details', 'questionIds'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          type: {
            type: 'string',
            enum: ['concept', 'subtopic', 'mistake', 'question'],
          },
          summary: { type: 'string' },
          details: { type: 'string' },
          questionIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'source', 'target', 'label', 'type'],
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          label: { type: 'string' },
          type: {
            type: 'string',
            enum: ['prerequisite', 'contains', 'confuses', 'tests'],
          },
        },
      },
    },
  },
};

const topicStudySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'subtitle',
    'overview',
    'objectives',
    'coreSummary',
    'chapters',
    'pitfalls',
    'representativeQuestions',
    'studyPlan',
    'closingAdvice',
  ],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    overview: { type: 'string' },
    objectives: {
      type: 'array',
      items: { type: 'string' },
    },
    coreSummary: {
      type: 'array',
      items: { type: 'string' },
    },
    chapters: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'summary', 'explanation', 'keyPoints', 'questionIds'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          explanation: { type: 'string' },
          keyPoints: {
            type: 'array',
            items: { type: 'string' },
          },
          questionIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
    },
    pitfalls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'explanation', 'questionIds'],
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          questionIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
    },
    representativeQuestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['questionId', 'reason'],
        properties: {
          questionId: { type: 'integer' },
          reason: { type: 'string' },
        },
      },
    },
    studyPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'title', 'action'],
        properties: {
          step: { type: 'integer' },
          title: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
    closingAdvice: { type: 'string' },
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
  maxTokens = 3000,
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
      enable_thinking: false,
      temperature: 0.2,
      max_tokens: maxTokens,
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

export async function generateTutorReply({
  message,
  history,
  questions,
}: TutorOptions): Promise<TutorReply> {
  const context = questions.map(question => ({
    questionId: question.id,
    content: question.content,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || '',
  }));
  const validQuestionIds = new Set(questions.map(question => question.id));
  const systemMessage = {
    role: 'system' as const,
    content: [
      '你是面向通信行业学习者的 AI 导师。',
      '优先依据用户个人题库中的题目、答案和解析进行讲解，再补充必要的通信专业拓展知识。',
      '必须明确区分“题库依据”和“拓展说明”，不能把拓展内容伪装成题库原文。',
      '回答要准确、清晰、适合学习，可使用分段和编号，但不要输出 Markdown 表格。',
      'references 只能引用给定题库上下文中真实存在的 questionId；没有相关依据时返回空数组。',
      '给出 2 至 5 个 keyPoints，以及 2 至 3 个便于继续学习的 suggestedQuestions。',
      `返回 JSON，结构必须符合：${JSON.stringify(tutorSchema)}`,
    ].join('\n'),
  };
  const userMessage = {
    role: 'user' as const,
    content: [
      `用户当前问题：${message}`,
      '',
      `个人题库上下文：${context.length > 0 ? JSON.stringify(context) : '当前没有可用题目，请以拓展学习模式回答。'}`,
    ].join('\n'),
  };
  const messages = [
    systemMessage,
    ...history.map(item => ({ role: item.role, content: item.content })),
    userMessage,
  ];

  let outputText: string;
  const compatibleConfig = getCompatibleAIConfig();
  if (compatibleConfig) {
    outputText = await requestCompatibleJson(compatibleConfig, messages);
  } else {
    configureProxyIfNeeded();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('缺少 AI_API_KEY 或 OPENAI_API_KEY，请先配置大模型接口。');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: messages,
        text: {
          format: {
            type: 'json_schema',
            name: 'tutor_reply',
            schema: tutorSchema,
            strict: true,
          },
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || `AI API request failed: HTTP ${response.status}`);
    }
    outputText = extractResponseText(payload);
  }

  const parsed = JSON.parse(extractJsonText(outputText)) as TutorReply;
  return {
    answer: String(parsed.answer || '').trim(),
    keyPoints: (parsed.keyPoints || []).map(String).filter(Boolean).slice(0, 5),
    suggestedQuestions: (parsed.suggestedQuestions || []).map(String).filter(Boolean).slice(0, 3),
    references: (parsed.references || [])
      .filter(reference => validQuestionIds.has(Number(reference.questionId)))
      .map(reference => ({
        questionId: Number(reference.questionId),
        content: String(reference.content || '').trim(),
      }))
      .slice(0, 5),
  };
}

export async function generateKnowledgeMap({
  categoryName,
  questions,
}: KnowledgeMapOptions): Promise<KnowledgeMapResult> {
  const context = questions.map(question => ({
    questionId: question.id,
    content: question.content,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || '',
  }));
  const validQuestionIds = new Set(questions.map(question => question.id));
  const systemMessage = {
    role: 'system' as const,
    content: [
      '你是通信专业学习架构师，负责把题库整理成“由点及线、由线及面”的知识脉络图。',
      '必须从题目、答案和解析中抽取核心概念、子知识点、易错点和关联题目。',
      '节点数量控制在 8 到 24 个之间；不要把每一道题都做成节点，只选择代表性题目。',
      '概念节点要覆盖面，子知识点节点要体现线，易错点节点要帮助复习纠偏。',
      'edges 必须只连接 nodes 中存在的 id。',
      'questionIds 只能使用给定题库中的 questionId。',
      'studyPath 给出 4 到 8 个按学习顺序排列的节点 label。',
      `返回 JSON，结构必须符合：${JSON.stringify(knowledgeMapSchema)}`,
    ].join('\n'),
  };
  const userMessage = {
    role: 'user' as const,
    content: [
      `题库范围：${categoryName}`,
      `题目数量：${questions.length}`,
      '请生成适合复习软件展示的知识脉络图。',
      JSON.stringify(context),
    ].join('\n\n'),
  };

  let outputText: string;
  const compatibleConfig = getCompatibleAIConfig();
  if (compatibleConfig) {
    outputText = await requestCompatibleJson(compatibleConfig, [systemMessage, userMessage]);
  } else {
    configureProxyIfNeeded();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('缺少 AI_API_KEY 或 OPENAI_API_KEY，请先配置大模型接口。');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [systemMessage, userMessage],
        text: {
          format: {
            type: 'json_schema',
            name: 'knowledge_map',
            schema: knowledgeMapSchema,
            strict: true,
          },
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || `AI API request failed: HTTP ${response.status}`);
    }
    outputText = extractResponseText(payload);
  }

  const parsed = JSON.parse(extractJsonText(outputText)) as KnowledgeMapResult;
  const nodes = (parsed.nodes || [])
    .filter(node => node.id && node.label)
    .map(node => ({
      ...node,
      questionIds: (node.questionIds || [])
        .map(Number)
        .filter(questionId => validQuestionIds.has(questionId))
        .slice(0, 8),
    }))
    .slice(0, 28);
  const validNodeIds = new Set(nodes.map(node => node.id));
  const edges = (parsed.edges || [])
    .filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${index + 1}`,
    }))
    .slice(0, 40);

  return {
    title: String(parsed.title || `${categoryName}知识脉络`).trim(),
    overview: String(parsed.overview || '').trim(),
    studyPath: (parsed.studyPath || []).map(String).filter(Boolean).slice(0, 8),
    nodes,
    edges,
  };
}

export async function generateTopicStudy({
  categoryName,
  questions,
  performance,
}: TopicStudyOptions): Promise<TopicStudyResult> {
  const validQuestionIds = new Set(questions.map(question => question.id));
  const context = questions.map(question => ({
    questionId: question.id,
    content: question.content,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || '',
  }));
  const systemMessage = {
    role: 'system' as const,
    content: [
      '你是通信专业课程设计师，要把个人题库整理成一份完整、可复习、可授课的专题学习页。',
      '内容必须优先依据给定题目、答案和解析，并结合用户掌握度调整重点。',
      '专题应体现“由点及线、由线及面”：从知识点到关系，再形成完整章节体系。',
      'chapters 控制在 4 到 7 章，每章 explanation 为 120 到 260 字，keyPoints 为 3 到 5 条。',
      'pitfalls 聚焦易混淆、易答错、规范边界等问题。',
      'representativeQuestions 只能引用给定题库中的 questionId。',
      'studyPlan 提供 4 到 7 个可执行复习步骤。',
      '语言准确、清晰、适合通信行业学习者，不编造具体标准条款或数值。',
      `返回 JSON，结构必须符合：${JSON.stringify(topicStudySchema)}`,
    ].join('\n'),
  };
  const userMessage = {
    role: 'user' as const,
    content: [
      `专题范围：${categoryName}`,
      `个人掌握情况：${JSON.stringify(performance)}`,
      `题库内容：${JSON.stringify(context)}`,
    ].join('\n\n'),
  };

  let outputText: string;
  const compatibleConfig = getCompatibleAIConfig();
  if (compatibleConfig) {
    outputText = await requestCompatibleJson(
      compatibleConfig,
      [systemMessage, userMessage],
      5000,
    );
  } else {
    configureProxyIfNeeded();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('缺少 AI_API_KEY 或 OPENAI_API_KEY，请先配置大模型接口。');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [systemMessage, userMessage],
        text: {
          format: {
            type: 'json_schema',
            name: 'topic_study',
            schema: topicStudySchema,
            strict: true,
          },
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || `AI API request failed: HTTP ${response.status}`);
    }
    outputText = extractResponseText(payload);
  }

  const parsed = JSON.parse(extractJsonText(outputText)) as TopicStudyResult;
  const normalizeQuestionIds = (ids: number[]) =>
    (ids || []).map(Number).filter(id => validQuestionIds.has(id)).slice(0, 8);

  return {
    title: String(parsed.title || `${categoryName}专题学习`).trim(),
    subtitle: String(parsed.subtitle || '').trim(),
    overview: String(parsed.overview || '').trim(),
    objectives: (parsed.objectives || []).map(String).filter(Boolean).slice(0, 6),
    coreSummary: (parsed.coreSummary || []).map(String).filter(Boolean).slice(0, 8),
    chapters: (parsed.chapters || []).map((chapter, index) => ({
      id: chapter.id || `chapter-${index + 1}`,
      title: String(chapter.title || `第${index + 1}章`).trim(),
      summary: String(chapter.summary || '').trim(),
      explanation: String(chapter.explanation || '').trim(),
      keyPoints: (chapter.keyPoints || []).map(String).filter(Boolean).slice(0, 5),
      questionIds: normalizeQuestionIds(chapter.questionIds),
    })).slice(0, 7),
    pitfalls: (parsed.pitfalls || []).map(item => ({
      title: String(item.title || '').trim(),
      explanation: String(item.explanation || '').trim(),
      questionIds: normalizeQuestionIds(item.questionIds),
    })).filter(item => item.title).slice(0, 8),
    representativeQuestions: (parsed.representativeQuestions || [])
      .filter(item => validQuestionIds.has(Number(item.questionId)))
      .map(item => ({
        questionId: Number(item.questionId),
        reason: String(item.reason || '').trim(),
      }))
      .slice(0, 10),
    studyPlan: (parsed.studyPlan || []).map((item, index) => ({
      step: index + 1,
      title: String(item.title || `步骤${index + 1}`).trim(),
      action: String(item.action || '').trim(),
    })).slice(0, 7),
    closingAdvice: String(parsed.closingAdvice || '').trim(),
  };
}
