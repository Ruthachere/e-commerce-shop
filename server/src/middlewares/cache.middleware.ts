import { Request, Response, NextFunction } from "express";
import redis from "../utils/redis";

export const cache = (
  KeyGenerator: (req: Request) => string,
  ttlSeconds = 300
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = KeyGenerator(req);
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        redis
          .set(cacheKey, JSON.stringify(body), "EX", ttlSeconds)
          .catch((err) => {
            console.error("Failed to cache response:", err);
          });
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

export const invalidateCache = async (keys: string | string[]) => {
  try {
    await redis.del(...(Array.isArray(keys) ? keys : [keys]));
    console.log(`Cache invalidated for key(s): ${keys}`);
  } catch (err) {
    console.error("Failed to invalidate cache:", err);
  }
};
