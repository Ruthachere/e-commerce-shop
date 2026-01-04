// src/middlewares/authenticate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

interface DecodedToken {
  userId: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export function authenticate(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

      // Attach user info to req
      (req as any).user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      };

      // Role check if needed
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  };
}
