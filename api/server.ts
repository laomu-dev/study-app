/**
 * local server entry file, for local development
 */
import app from './app.js';
import { initDatabase } from './config/database.js';

/**
 * initialize database with tables and seed data
 */
async function initializeDatabase() {
  try {
    await initDatabase();
    console.log('Database initialized with sample data');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
