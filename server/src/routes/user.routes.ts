import express from "express";

import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
} from "../controllers/user.controller";
import { updateUserProfileDto } from "../dto/user.dto";
import { validateRequest } from "../middlewares/validation.middleware";
import { audit } from "../middlewares/audit.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";


export const router = express.Router();
router.get("/", getAllUsers);
router.get("/:id", authenticate, getUserById);


router.put("/:id", updateUserProfileDto, validateRequest, updateUserProfile);
router.delete(
  "/:id",
  // authenticate(["Admin"]),
  audit("DELETE_USER", "User"),
  deleteUser
);

export default router;
