import mammoth from 'mammoth'; // Restart server
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

function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\u200B/g, '')
    .trim();
}

function findCorrectAnswer(text: string): { answer: number | number[], type: QuestionType } {
  // 首先检查判断题答案
  const judgePatterns = [
    /(?:答案?|answer|correct)[:：]?\s*(正确|错误|对|错|√|×|true|false)/i,
    /\[答案?[:：]?\s*(正确|错误|对|错|√|×|true|false)\]/i,
    /【答案?[:：]?\s*(正确|错误|对|错|√|×|true|false)】/i,
  ];
  
  for (const pattern of judgePatterns) {
    const match = text.match(pattern);
    if (match) {
      const answerText = match[1].toLowerCase();
      // 判断题：0=错误/×，1=正确/√
      const isTrue = ['正确', '对', '√', 'true'].includes(answerText);
      return { answer: isTrue ? 1 : 0, type: 'judge' };
    }
  }
  
  // 检查选择题答案
  const multiplePatterns = [
    /(?:答案?|answer|correct)[:：]?\s*([A-Da-d]+)/i,
    /\[答案?[:：]?\s*([A-Da-d]+)\]/i,
    /【答案?[:：]?\s*([A-Da-d]+)】/i,
  ];
  
  for (const pattern of multiplePatterns) {
    const match = text.match(pattern);
    if (match) {
      const answerStr = match[1].toUpperCase();
      if (answerStr.length > 1) {
        const answers = [];
        for (const char of answerStr) {
          answers.push(char.charCodeAt(0) - 65);
        }
        return { answer: answers, type: 'multiple' };
      } else if (answerStr.length === 1) {
        return { answer: answerStr.charCodeAt(0) - 65, type: 'single' };
      }
    }
  }
  
  const singlePatterns = [
    /^\s*([A-Da-d])[\.、)]\s*$/m,
  ];
  
  for (const pattern of singlePatterns) {
    const match = text.match(pattern);
    if (match) {
      return { answer: match[1].toUpperCase().charCodeAt(0) - 65, type: 'single' };
    }
  }
  return { answer: 0, type: 'single' };
}

function extractExplanation(text: string): string | undefined {
  const patterns = [
    /(?:解析?|explanation|分析?)[:：]\s*(.+)/i,
    /【解析?】\s*(.+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
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
      const optionMatch = line.match(/^[A-Da-d][\.、)]\s*(.+)/);
      
      if (j === 0 && !optionMatch) {
        question.content = line.replace(/^\d+[\.、)]\s*/, '');
      } else if (optionMatch) {
        question.options.push(optionMatch[1]);
      } else if (question.options.length > 0) {
        const lastIdx = question.options.length - 1;
        question.options[lastIdx] += ' ' + line;
      }
    }
    
    question.explanation = extractExplanation(block);
    question.correctAnswer = findCorrectAnswer(block);
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
  
  console.log('开始解析编号格式文本，原始长度:', content.length);
  content = cleanText(content);
  
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  console.log('处理后行数:', lines.length);
  console.log('前10行:', lines.slice(0, 10));
  
  // 用于累积当前题目的所有行（包含题目、选项、答案）
  let currentQuestionLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`第${i+1}行:`, line);
    
    // 检查是否是新的题目开始（数字开头，并且不是选项）
    const questionMatch = line.match(/^(\d+)[\.、)]\s*(.+)/);
    const isOptionLine = line.match(/^[A-D][\.、)]/);
    
    if (questionMatch && !isOptionLine) {
      // 遇到新题目，先处理之前累积的题目
      if (currentQuestionLines.length > 0) {
        const parsedQuestion = parseQuestionFromLines(currentQuestionLines);
        if (parsedQuestion) {
          questions.push(parsedQuestion);
          console.log(`成功添加第 ${questions.length} 题`);
        } else {
          console.log(`第 ${questions.length + 1} 题解析失败，跳过`);
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
      console.log(`成功添加第 ${questions.length} 题`);
    }
  }
  
  console.log('解析完成，共找到题目:', questions.length);
  console.log('所有题目:', questions.map((q, idx) => ({
    index: idx + 1,
    content: q.content.substring(0, 30) + '...',
    optionsCount: q.options.length,
    isMultiple: q.isMultiple
  })));
  
  return { success: questions.length > 0, questions, errors };
}

function parseQuestionFromLines(lines: string[]): ParsedQuestion | null {
  if (lines.length === 0) return null;
  
  console.log('正在从以下行解析题目:', lines);
  
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
  
  question.content = questionContent;
  
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
    const optionPattern = /([A-D])[\.、)]\s*((?:(?!\s*[A-D][\.、)]).)*)/g;
    let match;
    
    while ((match = optionPattern.exec(fullText)) !== null) {
      let optContent = match[2].trim();
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
        const optionMatch = line.match(/^[A-D][\.、)]\s*(.+)/);
        if (optionMatch) {
          let optContent = optionMatch[1].trim();
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
  
  console.log('解析结果:', {
    content: question.content,
    type: question.type,
    options: question.options,
    correctAnswer: question.correctAnswer,
    isMultiple: question.isMultiple
  });
  
  // 验证题目是否有效
  if (!question.content) {
    console.log('题目无效（无内容），跳过');
    return null;
  }
  
  // 判断题不需要选项（我们已经设置了默认选项）
  if (question.type === 'judge') {
    return question;
  }
  
  // 选择题需要至少2个选项
  if (question.options.length < 2) {
    console.log('题目无效（选项不足），跳过');
    return null;
  }
  
  return question;
}

function parseCSVFormat(content: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    if (parts.length < 6) {
      errors.push(`行 ${i + 1}: 列数不足，需要至少6列(题目,A,B,C,D,答案)`);
      continue;
    }
    
    const options = parts.slice(1, 5).filter(o => o);
    const answerStr = parts[5].toUpperCase();
    
    let correctAnswer: number | number[] = 0;
    let isMultiple = false;
    
    if (answerStr.length > 1) {
      const answers = [];
      for (const char of answerStr) {
        const idx = char.charCodeAt(0) - 65;
        if (idx >= 0 && idx < 4) {
          answers.push(idx);
        }
      }
      if (answers.length > 0) {
        correctAnswer = answers;
        isMultiple = true;
      }
    } else {
      const answerMap: { [key: string]: number } = { 
        'A': 0, 'B': 1, 'C': 2, 'D': 3,
        'a': 0, 'b': 1, 'c': 2, 'd': 3,
        '0': 0, '1': 1, '2': 2, '3': 3
      };
      const answer = answerMap[answerStr];
      if (answer === undefined) {
        errors.push(`行 ${i + 1}: 答案格式不正确`);
        continue;
      }
      correctAnswer = answer;
    }
    
    questions.push({
      content: parts[0],
      options,
      correctAnswer,
      isMultiple,
      explanation: parts[6] || undefined
    });
  }
  
  return { success: questions.length > 0, questions, errors };
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
        } else if (item.content && item.options) {
          questions.push({
            content: item.content,
            options: item.options,
            correctAnswer: item.correctAnswer ?? 0,
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
