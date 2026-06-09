import PptxGenJS from 'pptxgenjs';

const PptxGenJSConstructor = (
  (PptxGenJS as unknown as { default?: typeof PptxGenJS }).default || PptxGenJS
);

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

const COLORS = {
  navy: '173B65',
  blue: '2563EB',
  paleBlue: 'EAF2FF',
  green: '0F766E',
  paleGreen: 'E8F7F3',
  amber: 'B45309',
  paleAmber: 'FFF6E5',
  ink: '172033',
  gray: '64748B',
  light: 'F8FAFC',
  border: 'D9E2EC',
  white: 'FFFFFF',
};

const FONT = 'Microsoft YaHei';

function bulletText(items: string[]): string {
  return items.map(item => `• ${item}`).join('\n');
}

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 80);
}

function addHeader(slide: any, title: string, eyebrow?: string) {
  if (eyebrow) {
    slide.addText(eyebrow, {
      x: 0.7, y: 0.35, w: 4.8, h: 0.25,
      fontFace: FONT, fontSize: 10, bold: true, color: COLORS.blue,
      margin: 0, breakLine: false,
    });
  }
  slide.addText(title, {
    x: 0.7, y: 0.68, w: 11.8, h: 0.55,
    fontFace: FONT, fontSize: 26, bold: true, color: COLORS.ink,
    margin: 0,
  });
  slide.addShape('line', {
    x: 0.7, y: 1.35, w: 11.9, h: 0,
    line: { color: COLORS.border, width: 1 },
  });
}

export async function buildTopicStudyPpt(data: TopicStudyData) {
  const pptx = new PptxGenJSConstructor();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '传输通信知识学习助手';
  pptx.company = '传输通信知识学习助手';
  pptx.subject = data.subtitle;
  pptx.title = data.title;
  pptx.theme = {
    headFontFace: FONT,
    bodyFontFace: FONT,
  };

  pptx.defineSlideMaster({
    title: 'TOPIC_MASTER',
    background: { color: COLORS.light },
    objects: [
      {
        rect: {
          x: 0, y: 0, w: 13.333, h: 0.13,
          fill: { color: COLORS.blue },
          line: { color: COLORS.blue },
        },
      },
      {
        text: {
          text: '传输通信知识学习助手',
          options: {
            x: 0.7, y: 7.12, w: 4.2, h: 0.2,
            fontFace: FONT, fontSize: 8, color: COLORS.gray, margin: 0,
          },
        },
      },
    ],
    slideNumber: {
      x: 12.2, y: 7.1, w: 0.4, h: 0.2,
      fontFace: FONT, fontSize: 8, color: COLORS.gray, align: 'right',
    },
  });

  const cover = pptx.addSlide();
  cover.background = { color: COLORS.navy };
  cover.addShape('rect', {
    x: 0.65, y: 0.7, w: 0.12, h: 5.7,
    fill: { color: '5EA1FF' },
    line: { color: '5EA1FF' },
  });
  cover.addText('专题学习', {
    x: 1.05, y: 1.05, w: 3, h: 0.35,
    fontFace: FONT, fontSize: 14, bold: true, color: '8FC0FF', margin: 0,
  });
  cover.addText(data.title, {
    x: 1.05, y: 1.55, w: 10.9, h: 1.3,
    fontFace: FONT, fontSize: 32, bold: true, color: COLORS.white,
    margin: 0, valign: 'middle', breakLine: false,
  });
  cover.addText(data.subtitle || data.overview, {
    x: 1.05, y: 3.05, w: 10.3, h: 1.1,
    fontFace: FONT, fontSize: 17, color: 'D8E8FF',
    margin: 0, breakLine: false, valign: 'top',
  });
  cover.addText(`题库 ${data.performance.totalQuestions} 题  |  当前正确率 ${data.performance.accuracy}%`, {
    x: 1.05, y: 5.55, w: 8, h: 0.35,
    fontFace: FONT, fontSize: 12, color: 'AAC9F2', margin: 0,
  });

  const agenda = pptx.addSlide('TOPIC_MASTER');
  addHeader(agenda, '学习目标与专题结构', '01  OVERVIEW');
  agenda.addText(data.overview, {
    x: 0.75, y: 1.65, w: 5.8, h: 1.4,
    fontFace: FONT, fontSize: 16, color: COLORS.ink,
    margin: 0.12, breakLine: false, valign: 'top',
  });
  agenda.addShape('roundRect', {
    x: 6.9, y: 1.65, w: 5.55, h: 4.85,
    rectRadius: 0.05,
    fill: { color: COLORS.paleBlue },
    line: { color: 'B9D4FF', width: 1 },
  });
  agenda.addText('完成本专题后，你将能够', {
    x: 7.25, y: 2.0, w: 4.8, h: 0.35,
    fontFace: FONT, fontSize: 17, bold: true, color: COLORS.navy, margin: 0,
  });
  agenda.addText(bulletText(data.objectives), {
    x: 7.25, y: 2.55, w: 4.75, h: 3.45,
    fontFace: FONT, fontSize: 14, color: COLORS.ink,
    margin: 0, breakLine: false,
    paraSpaceAfter: 10,
  });

  const summary = pptx.addSlide('TOPIC_MASTER');
  addHeader(summary, '核心知识全景', '02  KNOWLEDGE LANDSCAPE');
  const summaryItems = data.coreSummary.slice(0, 8);
  summaryItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.75 + col * 6.05;
    const y = 1.7 + row * 1.28;
    summary.addShape('roundRect', {
      x, y, w: 5.65, h: 0.98,
      rectRadius: 0.04,
      fill: { color: index % 3 === 0 ? COLORS.paleBlue : index % 3 === 1 ? COLORS.paleGreen : COLORS.paleAmber },
      line: { color: COLORS.border, width: 1 },
    });
    summary.addText(String(index + 1).padStart(2, '0'), {
      x: x + 0.22, y: y + 0.22, w: 0.5, h: 0.25,
      fontFace: FONT, fontSize: 12, bold: true, color: COLORS.blue, margin: 0,
    });
    summary.addText(item, {
      x: x + 0.8, y: y + 0.16, w: 4.55, h: 0.58,
      fontFace: FONT, fontSize: 13, color: COLORS.ink, margin: 0,
      valign: 'middle', breakLine: false,
    });
  });

  data.chapters.forEach((chapter, index) => {
    const slide = pptx.addSlide('TOPIC_MASTER');
    addHeader(slide, chapter.title, `0${index + 3}  CHAPTER`);
    slide.addText(chapter.summary, {
      x: 0.75, y: 1.6, w: 11.85, h: 0.72,
      fontFace: FONT, fontSize: 17, bold: true, color: COLORS.navy,
      margin: 0.1, breakLine: false,
    });
    slide.addText(chapter.explanation, {
      x: 0.75, y: 2.5, w: 7.4, h: 3.65,
      fontFace: FONT, fontSize: 15, color: COLORS.ink,
      margin: 0.08, breakLine: false, valign: 'top',
    });
    slide.addShape('roundRect', {
      x: 8.45, y: 2.5, w: 4.0, h: 3.65,
      rectRadius: 0.04,
      fill: { color: COLORS.paleBlue },
      line: { color: 'B9D4FF', width: 1 },
    });
    slide.addText('本章要点', {
      x: 8.8, y: 2.82, w: 2, h: 0.3,
      fontFace: FONT, fontSize: 16, bold: true, color: COLORS.navy, margin: 0,
    });
    slide.addText(bulletText(chapter.keyPoints), {
      x: 8.8, y: 3.3, w: 3.25, h: 2.35,
      fontFace: FONT, fontSize: 13, color: COLORS.ink,
      margin: 0, breakLine: false, paraSpaceAfter: 8,
    });
    if (chapter.questionIds.length > 0) {
      slide.addText(`关联题目：${chapter.questionIds.map(id => `#${id}`).join('  ')}`, {
        x: 0.75, y: 6.45, w: 8, h: 0.3,
        fontFace: FONT, fontSize: 10, color: COLORS.gray, margin: 0,
      });
    }
  });

  if (data.pitfalls.length > 0) {
    const pitfalls = pptx.addSlide('TOPIC_MASTER');
    addHeader(pitfalls, '重点与易错点', 'REVIEW FOCUS');
    data.pitfalls.slice(0, 5).forEach((item, index) => {
      const y = 1.62 + index * 1.04;
      pitfalls.addText(`${index + 1}. ${item.title}`, {
        x: 0.8, y, w: 3.5, h: 0.3,
        fontFace: FONT, fontSize: 14, bold: true, color: COLORS.amber, margin: 0,
      });
      pitfalls.addText(item.explanation, {
        x: 4.1, y: y - 0.02, w: 8.1, h: 0.62,
        fontFace: FONT, fontSize: 12.5, color: COLORS.ink, margin: 0,
        breakLine: false, valign: 'top',
      });
    });
  }

  const plan = pptx.addSlide('TOPIC_MASTER');
  addHeader(plan, '复习行动计划', 'ACTION PLAN');
  data.studyPlan.slice(0, 6).forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.75 + col * 6.05;
    const y = 1.68 + row * 1.65;
    plan.addShape('roundRect', {
      x, y, w: 5.65, h: 1.28,
      rectRadius: 0.04,
      fill: { color: COLORS.white },
      line: { color: COLORS.border, width: 1 },
    });
    plan.addText(String(item.step), {
      x: x + 0.22, y: y + 0.25, w: 0.5, h: 0.45,
      fontFace: FONT, fontSize: 22, bold: true, color: COLORS.blue, margin: 0,
    });
    plan.addText(item.title, {
      x: x + 0.85, y: y + 0.18, w: 4.45, h: 0.3,
      fontFace: FONT, fontSize: 14, bold: true, color: COLORS.ink, margin: 0,
    });
    plan.addText(item.action, {
      x: x + 0.85, y: y + 0.58, w: 4.45, h: 0.45,
      fontFace: FONT, fontSize: 11.5, color: COLORS.gray, margin: 0,
      breakLine: false,
    });
  });

  const closing = pptx.addSlide();
  closing.background = { color: COLORS.navy };
  closing.addText('学习建议', {
    x: 0.9, y: 1.1, w: 3.5, h: 0.5,
    fontFace: FONT, fontSize: 18, bold: true, color: '8FC0FF', margin: 0,
  });
  closing.addText(data.closingAdvice, {
    x: 0.9, y: 1.85, w: 10.9, h: 2.1,
    fontFace: FONT, fontSize: 24, bold: true, color: COLORS.white,
    margin: 0, breakLine: false, valign: 'middle',
  });
  closing.addText('回到系统继续：知识脉络 → AI 导师 → 题目练习 → 错题复习', {
    x: 0.9, y: 5.55, w: 10.5, h: 0.4,
    fontFace: FONT, fontSize: 13, color: 'B9D4FF', margin: 0,
  });

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return {
    buffer: Buffer.from(output as Uint8Array),
    fileName: `${safeFileName(data.title)}.pptx`,
  };
}
