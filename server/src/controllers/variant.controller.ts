import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

// CREATE Variant
export const createVariant = async (req: Request, res: Response) => {
  try {
    const { inventoryQuantity, ...variantData } = req.body;

    // Basic validation
    if (!variantData.sku || !variantData.productId || !variantData.price) {
      logger.warn("Variant creation failed: missing required fields", {
        body: req.body,
      });
      return res
        .status(400)
        .json({ error: "sku, productId, and price are required." });
    }

    if (
      inventoryQuantity !== undefined &&
      (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0)
    ) {
      logger.warn("Variant creation failed: invalid inventoryQuantity", {
        inventoryQuantity,
      });
      return res
        .status(400)
        .json({ error: "inventoryQuantity must be a non-negative integer." });
    }

    const variant = await prisma.variant.create({
      data: {
        ...variantData,
        inventory:
          inventoryQuantity !== undefined
            ? { create: { quantity: inventoryQuantity } }
            : undefined,
      },
      include: { inventory: true },
    });
    logger.info("Variant created successfully", {
      variantId: variant.id,
      sku: variant.sku,
    });
    return res.status(201).json(variant);
  } catch (err: any) {
    if (err.code === "P2002") {
      logger.warn("Variant creation failed: SKU already exists", {
        sku: req.body.sku,
      });
      return res.status(409).json({ error: "SKU already exists." });
    }
    logger.error("Error creating variant", { error: err.stack });
    return res.status(500).json({ error: err.message });
  }
};

// GET All Variants
export const getVariants = async (req: Request, res: Response) => {
  try {
    const variants = await prisma.variant.findMany({
      include: { product: true, inventory: true },
    });
    logger.info("Fetched all variants", { count: variants.length });
    return res.status(200).json(variants);
  } catch (err: any) {
    logger.error("Error fetching variants", { error: err.stack });
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE Variant
export const updateVariant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const variantId = Number(id);
    const { inventoryQuantity, ...variantData } = req.body;

    if (isNaN(variantId)) {
      logger.warn("Variant update failed: invalid ID", { id });
      return res.status(400).json({ error: "Invalid variant ID." });
    }

    if (
      inventoryQuantity !== undefined &&
      (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0)
    ) {
      logger.warn("Variant update failed: invalid inventoryQuantity", {
        inventoryQuantity,
      });
      return res
        .status(400)
        .json({ error: "inventoryQuantity must be a non-negative integer." });
    }
    const variant = await prisma.variant.update({
      where: { id: variantId },
      data: {
        ...variantData,
        inventory:
          inventoryQuantity !== undefined
            ? {
                upsert: {
                  create: { quantity: inventoryQuantity },
                  update: { quantity: inventoryQuantity },
                },
              }
            : undefined,
      },
      include: { inventory: true },
    });
    logger.info("Variant updated successfully", {
      variantId: variant.id,
      sku: variant.sku,
    });
    return res.status(200).json(variant);
  } catch (err: any) {
    if (err.code === "P2025") {
      logger.warn("Variant update failed: not found");
      return res.status(404).json({ error: "Variant not found." });
    }
    if (err.code === "P2002") {
      logger.warn("Variant update failed: SKU conflict");
      return res.status(409).json({ error: "SKU already exists." });
    }
    logger.error("Error updating variant", { error: err.stack });
    return res.status(500).json({ error: err.message });
  }
};

// DELETE Variant
export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const variantId = Number(id);

    if (isNaN(variantId)) {
      logger.warn("Variant deletion failed: invalid ID", { id });
      return res.status(400).json({ error: "Invalid variant ID." });
    }
    // First delete inventory tied to this variant
    await prisma.inventory.deleteMany({
      where: { variantId },
    });

    await prisma.variant.delete({ where: { id: variantId } });
    logger.info("Variant deleted successfully", { variantId });

    return res.status(200).json({message: "Variant and its inventory deleted successfully." });
  } catch (err: any) {
    if (err.code === "P2025") {
      logger.warn("Variant deletion failed: not found");
      return res.status(404).json({ error: "Variant not found." });
    }
    logger.error("Error deleting variant", { error: err.stack });
    return res.status(500).json({ error: err.message });
  }
};
