// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minute
  max: 100, // limit each IP to 20 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts." },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many accounts created from this IP." },
});
