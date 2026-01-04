import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

const start = Date.now();

const checkLowStock = (inventory: any) => {
  if (inventory.quantity < inventory.minStockLevel) {
    console.warn(
      `Low stock alert: Variant ${inventory.variantId} (${inventory.variant.product.name}) has only ${inventory.quantity} items left!`
    );
  }
};
/**
 * GET /inventory
 * Get all inventory records with variant and product info
 */
export const getAllInventory = async (_req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { variant: { include: { product: true } } },
    });
    const duration = Date.now() - start;
    logger.info("Fetched all inventory records", {
      durationMs: duration,
      total: inventory.length,
    });
    return res.status(200).json(inventory);
  } catch (err: any) {
    console.error(err);
    logger.error("Failed to fetch inventory", {
      error: err.stack,
    });
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /inventory/:id
 * Get inventory by inventory ID
 */
export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ error: "Invalid inventory ID" });

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { variant: { include: { product: true } } },
    });

    if (!inventory)
      return res.status(404).json({ error: "Inventory not found" });

    checkLowStock(inventory);

    return res.status(200).json(inventory);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /inventory
 * Create inventory for a variant
 */
export const createInventory = async (req: Request, res: Response) => {
  try {
    const { variantId, quantity, minStockLevel } = req.body;

    if (!variantId || quantity === undefined) {
      return res
        .status(400)
        .json({ error: "variantId and quantity are required" });
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res
        .status(400)
        .json({ error: "Quantity must be a non-negative integer" });
    }

    const existing = await prisma.inventory.findUnique({
      where: { variantId },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Inventory already exists for this variant" });
    }

    const inventory = await prisma.inventory.create({
      data: {
        variantId,
        quantity,
        minStockLevel: minStockLevel ?? 5,
      },
      include: { variant: { include: { product: true } } },
    });

    checkLowStock(inventory);
    logger.info("Created new inventory record", {
      variantId,
      quantity,
      minStockLevel,
    });
    return res.status(201).json(inventory);
  } catch (err: any) {
    console.error(err);
    logger.error("Failed to create inventory", { error: err.stack });
    return res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /inventory/:variantId
 * Upsert inventory by variantId
 */
export const updateInventory = async (req: Request, res: Response) => {
  try {
    const variantId = Number(req.params.variantId);
    const { quantity, minStockLevel } = req.body;

    if (isNaN(variantId) || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: "Invalid variantId or quantity" });
    }

    const inventory = await prisma.inventory.upsert({
      where: { variantId },
      create: { variantId, quantity, minStockLevel: minStockLevel ?? 5 },
      update: { quantity, minStockLevel: minStockLevel ?? 5 },
      include: { variant: { include: { product: true } } },
    });

    if (inventory.quantity < inventory.minStockLevel) {
      console.warn(
        `Low stock alert: Variant ${variantId} has only ${inventory.quantity} items left!`
      );
    }
    checkLowStock(inventory);
    logger.info("Inventory updated", {
      variantId,
      quantity,
      minStockLevel,
      lowStock: quantity < (minStockLevel ?? 5),
    });
    return res.status(200).json(inventory);
  } catch (err: any) {
    console.error(err);
    logger.error("Failed to update inventory", {
      variantId: req.params.variantId,
      error: err.stack,
    });
    return res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /inventory/adjust/:variantId
 * Adjust inventory by a positive or negative value
 */

export const adjustInventory = async (req: Request, res: Response) => {
  const io = req.app.get("io");

  try {
    const variantId = Number(req.params.variantId);
    const { adjustment } = req.body;

    if (isNaN(variantId) || typeof adjustment !== "number") {
      return res.status(400).json({ error: "Invalid variantId or adjustment" });
    }

    // Get current inventory
    const currentInventory = await prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: { include: { product: true } },
      },
    });

    if (!currentInventory) {
      return res.status(404).json({ error: "Inventory not found" });
    }

    if (currentInventory.quantity + adjustment < 0) {
      return res.status(400).json({
        error: "Adjustment would result in negative quantity",
      });
    }

    // Perform update
    const updatedInventory = await prisma.inventory.update({
      where: { variantId },
      data: { quantity: { increment: adjustment } },
      include: { variant: { include: { product: true } } },
    });

    // Emit real-time event
    io.emit("inventoryUpdated", {
      variantId: updatedInventory.variantId,
      productId: updatedInventory.variant.productId,
      quantity: updatedInventory.quantity,
      updatedAt: updatedInventory.updatedAt,
    });

    // Low stock notification
    if (updatedInventory.quantity <= updatedInventory.minStockLevel) {
      io.emit("lowStockWarning", {
        product: updatedInventory.variant.product.name,
        variantId: updatedInventory.variantId,
        remaining: updatedInventory.quantity,
      });
    }

    if (updatedInventory.quantity === 0) {
      io.emit("outOfStock", {
        product: updatedInventory.variant.product.name,
        variantId: updatedInventory.variantId,
      });
    }

    return res.status(200).json(updatedInventory);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * GET /inventory/low-stock
 * Get all inventory records with quantity below minStockLevel
 */
export const getLowStockVariants = async (_req: Request, res: Response) => {
  try {
    const lowStockVariants = await prisma.inventory.findMany({
      where: { quantity: { lt: 5 } }, // default threshold
      include: { variant: { include: { product: true } } },
    });

    return res.status(200).json(lowStockVariants);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const searchInventory = async (req: Request, res: Response) => {
  try {
    const {
      variantId,
      minStock,
      maxStock,
      belowMinLevel,
      sortBy = "updatedAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    const filters: any = {};

    if (variantId) filters.variantId = parseInt(variantId as string);

    if (belowMinLevel === "true") {
      filters.quantity = {
        lt: {
          path: ["minStockLevel"],
          value: 0, // will be overridden by custom filter
        },
      };
    } else {
      if (minStock || maxStock) {
        filters.quantity = {};
        if (minStock) filters.quantity.gte = parseInt(minStock as string);
        if (maxStock) filters.quantity.lte = parseInt(maxStock as string);
      }
    }

    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);

    const inventories = await prisma.inventory.findMany({
      where:
        belowMinLevel === "true"
          ? {
              quantity: {
                lt: 5,
              },
            }
          : filters,
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.inventory.count({
      where:
        belowMinLevel === "true"
          ? {
              quantity: {
                lt: 5,
              },
            }
          : filters,
    });

    res.json({
      data: inventories,
      meta: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(" Get Inventory error:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
};
