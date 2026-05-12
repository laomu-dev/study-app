import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

const userService = new UserService();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check - session:', req.session);
  console.log('Auth check - session userId:', req.session?.userId);

  const userId = req.session?.userId;

  if (!userId) {
    console.log('No userId in session, returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await userService.findById(userId);
    if (!user) {
      console.log('User not found, returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('User authenticated:', user.username);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}
