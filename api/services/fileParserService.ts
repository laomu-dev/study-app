import mammoth from 'mammoth';
import { createRequire } from 'module';
import iconv from 'iconv-lite';
const require = createRequire(import.meta.url);
const PDFParser = require('pdf2json');

export function decodeText(buffer: Buffer): string {
  try {
    let text = buffer.toString('utf8');
    if (text.includes('�')) {
      text = iconv.decode(buffer, 'gbk');
      console.log('检测到 GBK 编码，已转换');
    }
    return text;
  } catch (e) {
    console.log('编码转换失败，使用 UTF-8');
    return buffer.toString('utf8');
  }
}

export type QuestionType = 'single' | 'multiple' | 'judge';

export interface ParsedQuestion {
  content: string;
  options: string[];
  correctAnswer: number | number[];
  isMultiple?: boolean;
  type?: QuestionType;
  explanation?: string;
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
}

export async function extractRawTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  }

  if (ext === 'pdf') {
    return extractPDFRawText(buffer);
  }

  return cleanText(decodeText(buffer));
}

function extractPDFRawText(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataReady', () => {
      try {
        resolve(cleanText(pdfParser.getRawTextContent()));
      } catch (error) {
        resolve('');
      }
    });

    pdfParser.on('pdfParser_dataError', () => {
      resolve('');
    });

    pdfParser.parseBuffer(buffer);
  });
}

function cleanText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n]+/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\u200B/g, '')
    .trim();
}

function answerTextToResult(rawAnswer: string): { answer: number | number[], type: QuestionType } | null {
  const answerText = rawAnswer.trim().replace(/[，,、\s]+/g, '').toUpperCase();
  if (!answerText) return null;

  const judgeMap: Record<string, number> = {
    正确: 1,
    对: 1,
    '√': 1,
    TRUE: 1,
    T: 1,
    错误: 0,
    错: 0,
    '×': 0,
    FALSE: 0,
    F: 0,
  };

  if (answerText in judgeMap) {
    return { answer: judgeMap[answerText], type: 'judge' };
  }

  if (/^[A-H]+$/.test(answerText)) {
    const answers = answerText.split('').map(char => char.charCodeAt(0) - 65);
    return answers.length > 1
      ? { answer: answers, type: 'multiple' }
      : { answer: answers[0], type: 'single' };
  }

  if (/^[1-8]+$/.test(answerText)) {
    const answers = answerText.split('').map(char => parseInt(char, 10) - 1);
    return answers.length > 1
      ? { answer: answers, type: 'multiple' }
      : { answer: answers[0], type: 'single' };
  }

  return null;
}

function findCorrectAnswer(text: string): { answer: number | number[], type: QuestionType } {
  const normalized = cleanText(text);
  // 首先检查判断题答案
  const judgePatterns = [
    /(?:正确答案|参考答案|答案|answer|correct)[:：]?\s*(正确|错误|对|错|√|×|true|false|t|f)/i,
    /\[答案?[:：]?\s*(正确|错误|对|错|√|×|true|false|t|f)\]/i,
    /【答案?[:：]?\s*(正确|错误|对|错|√|×|true|false|t|f)】/i,
  ];
  
  for (const pattern of judgePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const result = answerTextToResult(match[1]);
      if (result) return result;
    }
  }
  
  // 检查选择题答案
  const multiplePatterns = [
    /(?:正确答案|参考答案|答案|answer|correct)[:：]?\s*([A-Ha-h](?:[\s,，、]*[A-Ha-h])*)/i,
    /\[答案?[:：]?\s*([A-Ha-h](?:[\s,，、]*[A-Ha-h])*)\]/i,
    /【答案?[:：]?\s*([A-Ha-h](?:[\s,，、]*[A-Ha-h])*)】/i,
  ];
  
  for (const pattern of multiplePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const result = answerTextToResult(match[1]);
      if (result) return result;
    }
  }
  
  const singlePatterns = [
    /^\s*([A-Ha-h])[\.、)]?\s*$/m,
  ];
  
  for (const pattern of singlePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const result = answerTextToResult(match[1]);
      if (result) return result;
    }
  }
  return { answer: 0, type: 'single' };
}

function extractExplanation(text: string): string | undefined {
  const patterns = [
    /(?:解析|答案解析|explanation|分析)[:：]\s*([\s\S]+?)(?=\n\s*(?:\d+[\.、)]\s*|$))/i,
    /【解析】\s*([\s\S]+?)(?=\n\s*(?:\d+[\.、)]\s*|$))/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().replace(/\n+/g, ' ');
    }
  }
  return undefined;
}

function stripMetaText(text: string): string {
  return text
    .replace(/(?:正确答案|参考答案|答案|answer|correct)[:：]?\s*(?:[A-Ha-h](?:[\s,，、]*[A-Ha-h])*|正确|错误|对|错|√|×|true|false|t|f)\s*/gi, '')
    .replace(/(?:解析|答案解析|explanation|分析)[:：][\s\S]*$/i, '')
    .trim();
}

function isAnswerOrExplanationLine(line: string): boolean {
  return /^(?:正确答案|参考答案|答案|answer|correct|解析|答案解析|explanation|分析)[:：]/i.test(line.trim());
}

function parseTextFormat(content: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  content = cleanText(content);
  const blocks = content.split(/\n\s*\n|\n(?=\d+[\.、)]\s*)/);
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;
    
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) continue;
    
    const question: ParsedQuestion = {
      content: '',
      options: [],
      correctAnswer: 0,
      isMultiple: false,
      explanation: undefined,
    };
    
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const optionMatch = line.match(/^([A-Ha-h])[\.、)]\s*(.+)/);
      
      if (j === 0 && !optionMatch) {
        question.content = stripMetaText(line.replace(/^\d+[\.、)]\s*/, ''));
      } else if (optionMatch) {
        question.options.push(stripMetaText(optionMatch[2]));
      } else if (question.options.length > 0 && !isAnswerOrExplanationLine(line)) {
        const lastIdx = question.options.length - 1;
        question.options[lastIdx] += ' ' + line;
      }
    }
    
    question.explanation = extractExplanation(block);
    const answerResult = findCorrectAnswer(block);
    question.correctAnswer = answerResult.answer;
    question.type = answerResult.type;
    question.isMultiple = Array.isArray(question.correctAnswer);
    
    if (question.content && question.options.length >= 2) {
      questions.push(question);
    } else {
      errors.push(`题目 ${i + 1} 格式不正确，已跳过`);
    }
  }
  
  return { success: questions.length > 0, questions, errors };
}

function parseSimpleNumberedFormat(content: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  content = cleanText(content);
  
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  // 用于累积当前题目的所有行（包含题目、选项、答案）
  let currentQuestionLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检查是否是新的题目开始（数字开头，并且不是选项）
    const questionMatch = line.match(/^(\d+)[\.、)]\s*(.+)/);
    const isOptionLine = line.match(/^[A-Ha-h][\.、)]/);
    
    if (questionMatch && !isOptionLine) {
      // 遇到新题目，先处理之前累积的题目
      if (currentQuestionLines.length > 0) {
        const parsedQuestion = parseQuestionFromLines(currentQuestionLines);
        if (parsedQuestion) {
          questions.push(parsedQuestion);
        }
      }
      // 开始新题目的累积
      currentQuestionLines = [line];
    } else {
      // 继续累积当前题目的行
      currentQuestionLines.push(line);
    }
  }
  
  // 处理最后一个题目
  if (currentQuestionLines.length > 0) {
    const parsedQuestion = parseQuestionFromLines(currentQuestionLines);
    if (parsedQuestion) {
      questions.push(parsedQuestion);
    }
  }
  
  return { success: questions.length > 0, questions, errors };
}

function parseQuestionFromLines(lines: string[]): ParsedQuestion | null {
  if (lines.length === 0) return null;
  
  const question: ParsedQuestion = {
    content: '',
    options: [],
    correctAnswer: 0,
    isMultiple: false,
    type: 'single',
    explanation: ''
  };
  
  // 处理第一行（题目行）
  const firstLine = lines[0];
  const questionMatch = firstLine.match(/^(\d+)[\.、)]\s*(.+)/);
  if (!questionMatch) return null;
  
  let questionContent = questionMatch[2].trim();
  
  // 检查题目行是否包含答案
  const answerInQuestion = questionContent.match(/答案[：:]\s*([A-D]+|正确|错误|对|错|√|×)/i);
  if (answerInQuestion) {
    const ansIdx = questionContent.indexOf('答案');
    questionContent = questionContent.substring(0, ansIdx).trim();
  }
  
  question.content = stripMetaText(questionContent);
  
  // 从所有行中查找答案
  const fullText = lines.join('\n');
  const answerResult = findCorrectAnswer(fullText);
  question.correctAnswer = answerResult.answer;
  question.type = answerResult.type;
  question.isMultiple = Array.isArray(question.correctAnswer);
  
  // 判断题的处理
  if (question.type === 'judge') {
    // 判断题固定选项
    question.options = ['错误', '正确']; // 0=错误，1=正确
  } else {
    // 选择题的处理 - 从所有行中提取选项
    const optionPattern = /([A-Ha-h])[\.、)]\s*([\s\S]*?)(?=\s+[A-Ha-h][\.、)]|\n[A-Ha-h][\.、)]|\n(?:正确答案|参考答案|答案|解析|answer|correct|explanation)[:：]|$)/gi;
    let match;
    
    while ((match = optionPattern.exec(fullText)) !== null) {
      let optContent = stripMetaText(match[2]);
      // 移除选项中的答案部分
      const ansInOpt = optContent.match(/答案[：:]\s*([A-D]+|正确|错误|对|错|√|×)/i);
      if (ansInOpt) {
        optContent = optContent.substring(0, ansInOpt.index).trim();
      }
      // 也移除行尾的答案
      if (optContent.includes('答案')) {
        optContent = optContent.substring(0, optContent.indexOf('答案')).trim();
      }
      if (optContent) {
        question.options.push(optContent);
      }
    }
    
    // 如果上面的方法没找到足够的选项，尝试逐行处理
    if (question.options.length < 2) {
      for (const line of lines) {
        const optionMatch = line.match(/^([A-Ha-h])[\.、)]\s*(.+)/);
        if (optionMatch) {
          let optContent = stripMetaText(optionMatch[2]);
          // 移除选项中的答案部分
          const ansInOpt = optContent.match(/答案[：:]\s*([A-D]+|正确|错误|对|错|√|×)/i);
          if (ansInOpt) {
            optContent = optContent.substring(0, ansInOpt.index).trim();
          }
          if (optContent) {
            question.options.push(optContent);
          }
        }
      }
    }
  }
  
  question.explanation = extractExplanation(fullText) || '';
  
  // 验证题目是否有效
  if (!question.content) {
    return null;
  }
  
  // 判断题不需要选项（我们已经设置了默认选项）
  if (question.type === 'judge') {
    return question;
  }
  
  // 选择题需要至少2个选项
  if (question.options.length < 2) {
    return null;
  }
  
  return question;
}

function parseCSVFormat(content: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  const lines = cleanText(content).split('\n').map(l => l.trim()).filter(l => l);
  const rows = lines.map(parseCSVLine);
  const header = rows[0]?.map(cell => cell.trim().toLowerCase()) || [];
  const hasHeader = header.some(cell => ['题目', '题干', 'content', 'question'].includes(cell));
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < rows.length; i++) {
    const parts = rows[i].map(p => p.trim());
    
    if (parts.length < 6) {
      errors.push(`行 ${i + 1}: 列数不足，需要至少6列(题目,A,B,C,D,答案)`);
      continue;
    }
    
    const answerCellIndex = hasHeader
      ? header.findIndex(cell => ['答案', '正确答案', 'answer', 'correctanswer', 'correct_answer'].includes(cell))
      : 5;
    const explanationCellIndex = hasHeader
      ? header.findIndex(cell => ['解析', '说明', 'explanation'].includes(cell))
      : 6;
    const answerIndex = answerCellIndex >= 0 ? answerCellIndex : 5;
    const contentText = parts[0];
    const options = parts.slice(1, answerIndex).filter(o => o);
    const answerStr = parts[answerIndex];
    const explanation = explanationCellIndex >= 0 ? parts[explanationCellIndex] : parts[6];
    
    const answerResult = answerTextToResult(answerStr);
    if (!contentText) {
      errors.push(`行 ${i + 1}: 题目内容为空`);
      continue;
    }
    if (options.length < 2) {
      errors.push(`行 ${i + 1}: 至少需要2个选项`);
      continue;
    }
    if (!answerResult) {
      errors.push(`行 ${i + 1}: 答案格式不正确，请填写 A/B/C/D 或多选 AB`);
      continue;
    }
    
    questions.push({
      content: contentText,
      options,
      correctAnswer: answerResult.answer,
      isMultiple: answerResult.type === 'multiple',
      type: answerResult.type,
      explanation: explanation || undefined
    });
  }
  
  return { success: questions.length > 0, questions, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '，') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map(cell => cell.replace(/^["']|["']$/g, ''));
}

export async function parseWordFile(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    if (result.messages.length > 0) {
      console.log('Mammoth warnings:', result.messages);
    }
    
    if (text.includes(',') && text.match(/[A-Da-d][\.、)]\s*\w+,/) && text.split('\n').length < text.length / 50) {
      return parseCSVFormat(text);
    }
    
    if (text.match(/\d+[\.、)]\s*[\u4e00-\u9fa5]/)) {
      return parseSimpleNumberedFormat(text);
    }
    
    return parseTextFormat(text);
  } catch (error) {
    console.error('Word parsing error:', error);
    return { success: false, questions: [], errors: ['Word文件解析失败'] };
  }
}

export function parseTextFile(content: string, filename: string): ParseResult {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'csv') {
    return parseCSVFormat(content);
  }
  
  if (content.includes(',') && content.match(/[A-Da-d][\.、)]\s*\w+,/) && content.split('\n').length < content.length / 50) {
    return parseCSVFormat(content);
  }
  
  if (content.match(/\d+[\.、)]\s*[\u4e00-\u9fa5]/) || content.match(/^[A-Da-d][\.、)]\s*/m)) {
    return parseSimpleNumberedFormat(content);
  }
  
  return parseTextFormat(content);
}

export function parseJSONFile(content: string): ParseResult {
  try {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      const questions: ParsedQuestion[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        if (typeof item === 'string') {
          questions.push({
            content: item,
            options: [],
            correctAnswer: 0
          });
        } else if (item.content && Array.isArray(item.options)) {
          const answerResult = Array.isArray(item.correctAnswer) || typeof item.correctAnswer === 'number'
            ? {
                answer: item.correctAnswer,
                type: Array.isArray(item.correctAnswer) ? 'multiple' as QuestionType : 'single' as QuestionType,
              }
            : answerTextToResult(String(item.answer ?? item.correctAnswer ?? 'A'));

          if (!answerResult) {
            errors.push(`第 ${i + 1} 项答案格式不正确`);
            continue;
          }

          questions.push({
            content: item.content,
            options: item.options,
            correctAnswer: answerResult.answer,
            isMultiple: answerResult.type === 'multiple',
            type: answerResult.type,
            explanation: item.explanation || item.解析 || undefined
          });
        } else {
          errors.push(`第 ${i + 1} 项格式不正确`);
        }
      }
      
      return { success: questions.length > 0, questions, errors };
    }
    
    return { success: false, questions: [], errors: ['JSON格式不正确，需要数组'] };
  } catch (error) {
    return { success: false, questions: [], errors: ['JSON解析失败'] };
  }
}

export async function parsePDFFile(buffer: Buffer): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    console.log('开始解析 PDF 文件');
    
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const allText = pdfParser.getRawTextContent();
        console.log('PDF 文本长度:', allText.length);
        console.log('PDF 文本预览:', allText.substring(0, 500));
        
        if (allText.includes(',') && allText.match(/[A-Da-d][\.、)]\s*\w+,/) && allText.split('\n').length < allText.length / 50) {
          resolve(parseCSVFormat(allText));
        } else if (allText.match(/\d+[\.、)]\s*[\u4e00-\u9fa5]/)) {
          resolve(parseSimpleNumberedFormat(allText));
        } else {
          resolve(parseTextFormat(allText));
        }
      } catch (error) {
        console.error('PDF parsing error:', error);
        resolve({ success: false, questions: [], errors: [`PDF文件解析失败: ${error}`] });
      }
    });
    
    pdfParser.on('pdfParser_dataError', (error: any) => {
      console.error('PDF parsing error:', error);
      resolve({ success: false, questions: [], errors: [`PDF文件解析失败: ${error}`] });
    });
    
    pdfParser.parseBuffer(buffer);
  });
}
