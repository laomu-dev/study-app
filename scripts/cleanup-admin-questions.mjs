import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const USERNAME = 'admin';
const KEYWORD = '传输局';
const headers = ['题目', '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H', '答案', '解析'];

function parseJson(value, fallback) {
  if (Array.isArray(value) || typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function answerLetters(value) {
  const parsed = parseJson(value, []);
  const answers = Array.isArray(parsed) ? parsed : [parsed];
  return answers
    .filter(answer => Number.isInteger(answer) && answer >= 0 && answer < 8)
    .map(answer => String.fromCharCode(65 + answer))
    .join(',');
}

function toCsv(questions) {
  const lines = [headers.map(csvCell).join(',')];
  for (const question of questions) {
    const options = parseJson(question.options, []);
    const row = [
      question.content,
      ...Array.from({ length: 8 }, (_, index) => options[index] || ''),
      answerLetters(question.correct_answer),
      question.explanation || '',
    ];
    lines.push(row.map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function safeFileName(name) {
  return String(name || '未分类')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .trim()
    .slice(0, 80) || '未分类';
}

function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`缺少数据库配置：${missingEnv.join(', ')}`);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
});

const outputRoot = path.resolve('exports', `admin题目清理_${timestamp()}`);
const categoryOutput = path.join(outputRoot, '按题库分类');
await fs.mkdir(categoryOutput, { recursive: true });

try {
  await connection.beginTransaction();

  const [users] = await connection.execute(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [USERNAME],
  );
  if (users.length !== 1) {
    throw new Error('未找到唯一的 admin 账号，已取消操作。');
  }
  const adminId = users[0].id;

  const [deletedQuestions] = await connection.execute(
    `SELECT q.*, c.name AS category_name
     FROM questions q
     INNER JOIN categories c ON c.id = q.category_id
     WHERE q.user_id = ? AND q.content LIKE ?
     ORDER BY c.name, q.id`,
    [adminId, `%${KEYWORD}%`],
  );

  await fs.writeFile(
    path.join(outputRoot, `删除备份_题干包含${KEYWORD}_${deletedQuestions.length}题.csv`),
    toCsv(deletedQuestions),
    'utf8',
  );

  const [deleteResult] = await connection.execute(
    'DELETE FROM questions WHERE user_id = ? AND content LIKE ?',
    [adminId, `%${KEYWORD}%`],
  );

  const [remainingQuestions] = await connection.execute(
    `SELECT q.*, c.name AS category_name
     FROM questions q
     INNER JOIN categories c ON c.id = q.category_id
     WHERE q.user_id = ?
     ORDER BY c.name, q.id`,
    [adminId],
  );

  await fs.writeFile(
    path.join(outputRoot, `admin删除后全部题目_${remainingQuestions.length}题.csv`),
    toCsv(remainingQuestions),
    'utf8',
  );

  const grouped = new Map();
  for (const question of remainingQuestions) {
    const categoryName = question.category_name || '未分类';
    if (!grouped.has(categoryName)) grouped.set(categoryName, []);
    grouped.get(categoryName).push(question);
  }

  for (const [categoryName, questions] of grouped) {
    const fileName = `${safeFileName(categoryName)}_${questions.length}题.csv`;
    await fs.writeFile(path.join(categoryOutput, fileName), toCsv(questions), 'utf8');
  }

  if (deleteResult.affectedRows !== deletedQuestions.length) {
    throw new Error('删除数量与备份数量不一致，已回滚数据库操作。');
  }

  await connection.commit();
  console.log(`已删除：admin 账号题干包含“${KEYWORD}”的题目 ${deleteResult.affectedRows} 道`);
  console.log(`剩余题目：${remainingQuestions.length} 道`);
  console.log(`导出目录：${outputRoot}`);
  console.log(`分类文件：${grouped.size} 个`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
