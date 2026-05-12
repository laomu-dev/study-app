
import fs from 'fs';
import path from 'path';
import { pool, initDatabase } from '../config/database';

async function runMigrations() {
  await initDatabase();

  const sqlPath = path.join(__dirname, '../../migrations/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const statements = sql.split(';').filter(s => s.trim());

  for (const statement of statements) {
    try {
      await pool.execute(statement);
    } catch (error) {
      console.error('Error executing statement:', error);
    }
  }

  console.log('Database migrations completed');
  process.exit(0);
}

runMigrations().catch(console.error);
