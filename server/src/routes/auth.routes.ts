import { Router } from "express";
import { register, login, refreshToken} from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  loginRateLimiter,
  registerRateLimiter,
} from "../middlewares/rateLimiter";
import { loginDTO, registerDTO } from "../dto/auth.dto";


const router = Router();

router.post(
  "/register",
  registerRateLimiter,
  registerDTO,
  validateRequest,
  register
);
router.post("/login", loginRateLimiter, loginDTO, validateRequest, login);
router.post("/refresh", refreshToken);

export default router;
