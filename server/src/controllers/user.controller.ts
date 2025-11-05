import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    const role = _req.headers["x-user-role"]; // Simulated role from request header
    logger.info("Fetching all users", {
      query: _req.query,
      requesterRole: role,
    });

    res.json(users);
  } catch (error) {
    logger.error("Error fetching users", {
      error: error instanceof Error ? error.stack : String(error),
    });

    console.error(error);
    res.status(500).json({ message: "Failed to fetch Users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return res.status(404).json({ message: "User Not found" });
    logger.info("Fetching user by ID", { userId: id });
    res.json(user);
  } catch (error) {
    console.error(error);
    logger.error("Error fetching user by ID", {
      error: error instanceof Error ? error.stack : String(error),
    });
    res.status(500).json({ message: "Failed to fetch User" });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updates = req.body;
  const { username, email, firstName, lastName, phoneNumber } = req.body;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if username or email is already taken by someone else
    if (username) {
      const duplicateUsername = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          NOT: { id },
        },
      });

      if (duplicateUsername) {
        return res
          .status(400)
          .json({ message: "Another user with this username already exists" });
      }
    }

    if (email) {
      const duplicateEmail = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id },
        },
      });

      if (duplicateEmail) {
        return res
          .status(400)
          .json({ message: "Another user with this email already exists" });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username,
        email,
        firstName,
        lastName,
        phoneNumber: phoneNumber,
      },
    });
    logger.info("Updating user profile", { userId: id, updates });
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    logger.error("Error updating user", {
      userId: req.params.id,
      error: error instanceof Error ? error.stack : String(error),
    });
    res.status(500).json({ message: "Failed to update user" });
  }
};

// DELETE /users/:id — delete user
export const deleteUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const role = req.headers["x-user-role"]; // Simulated requester role
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await prisma.user.delete({ where: { id } });

    logger.info("Attempting to delete user", {
      userId: id,
      requesterRole: role,
    });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    logger.error("Error deleting user", {
      error: error instanceof Error ? error.stack : String(error),
      userId: req.params.id,
    });
    res.status(500).json({ message: "Failed to delete user" });
  }
};
