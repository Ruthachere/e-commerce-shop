import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { cache, invalidateCache } from "../middlewares/cache.middleware";
import { logger } from "../utils/logger";

const allCategoriesKey = () => "categories_all";

// CREATE Category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      logger.warn("Create category failed: name is missing or empty");
      return res.status(400).json({ error: "Category name is required." });
    }

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: { 
          equals: name.trim(), 
          mode: 'insensitive' 
        } 
      },
    });

    if (existingCategory) {
      return res.status(409).json({ error: "Category already exists." });
    }

    const newCategory = await prisma.category.create({
      data: { 
        name: name.trim() 
      },
    });

    const io = req.app.get("io");
    io.emit("categoryCreated", newCategory);
    
    await invalidateCache(allCategoriesKey());
    
    logger.info("Category created", { id: newCategory.id, name: newCategory.name });
    return res.status(201).json(newCategory);
  } catch (err: any) {
    logger.error("Error creating category", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET All Categories
export const getCategories = [
  cache(allCategoriesKey, 300),
  async (req: Request, res: Response) => {
    try {
      const categories = await prisma.category.findMany({
        include: { 
          products: {
            select: {
              id: true,
              name: true,
              price: true
            }
          } 
        },
        orderBy: { name: 'asc' }
      });
      logger.info("Fetched all categories", { count: categories.length });
      return res.status(200).json(categories);
    } catch (err: any) {
      logger.error("Error fetching categories", { error: err.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

// GET a single category
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const categoryId = Number(id);
  
  if (isNaN(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: "Invalid category ID." });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { 
        products: {
          select: {
            id: true,
            name: true,
            price: true
          }
        } 
      },
    });
    
    if (!category) {
      logger.warn("Category not found", { id: categoryId });
      return res.status(404).json({ error: "Category not found." });
    }

    logger.info("Fetched category by ID", { id: categoryId });
    return res.json(category);
  } catch (err: any) {
    logger.error("Error fetching category by ID", {
      id: categoryId,
      error: err.message,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// UPDATE Category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);
    const { name } = req.body;

    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: "Invalid category ID." });
    }

    if (!name || name.trim().length === 0) {
      logger.warn("Update category failed: name is missing", { id });
      return res.status(400).json({ error: "Category name is required." });
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found." });
    }

    // Check for duplicate name
    const duplicateCategory = await prisma.category.findFirst({
      where: { 
        name: { 
          equals: name.trim(), 
          mode: 'insensitive' 
        },
        id: { not: categoryId }
      },
    });

    if (duplicateCategory) {
      return res.status(409).json({ error: "Category name already exists." });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: { 
        name: name.trim(),
        // updatedAt: new Date() 
      },
    });

    const io = req.app.get("io");
    io.emit("categoryUpdated", updatedCategory);

    await invalidateCache([allCategoriesKey(), `category_${id}`]);

    logger.info("Category updated", { 
      id: categoryId, 
      oldName: existingCategory.name, 
      newName: updatedCategory.name 
    });
    
    return res.status(200).json(updatedCategory);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Category not found." });
    }
    logger.error("Error updating category", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE Category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (isNaN(categoryId) || categoryId <= 0) {
      logger.warn("Delete failed: Invalid category ID", { id });
      return res.status(400).json({ error: "Invalid category ID." });
    }

    // Check if category exists and has products
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { 
        products: {
          select: { id: true }
        } 
      },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found." });
    }

    if (existingCategory.products.length > 0) {
      return res.status(409).json({ 
        error: "Cannot delete category with associated products. Please remove products first." 
      });
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    await invalidateCache([allCategoriesKey(), `category_${id}`]);

    const io = req.app.get("io");
    io.emit("categoryDeleted", categoryId);

    logger.info("Category deleted", { id: categoryId });

    return res.status(200).json({ 
      message: "Category deleted successfully",
      id: categoryId 
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Category not found." });
    }
    logger.error("Error deleting category", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};