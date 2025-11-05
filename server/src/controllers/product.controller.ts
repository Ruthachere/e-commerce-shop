import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { cache, invalidateCache } from "../middlewares/cache.middleware";
import { logger } from "../utils/logger";

import { deleteImage } from "../utils/fileHelper";

const allProductsKey = () => "products_all";

export const getProducts = [
  cache(allProductsKey, 300),
  async (_req: Request, res: Response) => {
    const start = Date.now();
    try {
      const products = await prisma.product.findMany({
        include: { category: true, variants: { include: { inventory: true } } },
      });

      const duration = Date.now() - start;
      logger.info("Fetched all products", {
        filters: _req.query,
        duration: `${duration}ms`,
      });
      res.json(products);
    } catch (error) {
      console.error(error);
      logger.error("Error fetching products", {
        error: error instanceof Error ? error.stack : String(error),
      });
      res.status(500).json({ message: "Failed to fetch products" });
    }
  },
];

// GET /products/:id — fetch a single product
export const getProductById = [
  cache((req) => `product_${req.params.id}`, 300),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ message: "Invalid product ID" });

    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: { category: true, variants: { include: { inventory: true } } },
      });

      if (!product) {
        logger.warn("Product not found", { productId: id });
        return res.status(404).json({ message: "Product not found" });
      }
      logger.info("Fetched product by ID", { productId: id });
      res.json(product);
    } catch (error) {
      console.error(error);
      logger.error("Error fetching product by ID", {
        error: error instanceof Error ? error.stack : String(error),
        productId: id,
      });
      res.status(500).json({ message: "Failed to fetch product" });
    }
  },
];

export const createProduct = async (req: Request, res: Response) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILE:", req.file);

  try {
    const { name, description, price, categoryId } = req.body;
    const file = req.file;
    const role = req.headers["x-user-role"] || "unknown";

    if (!file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    const imageUrl = `/uploads/${file.filename}`; //file name

    const exists = await prisma.product.findFirst({ where: { name } });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Product with this name already exists" });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),

        imageurl: imageUrl,
        category: {
          connect: {
            id: parseInt(categoryId),
          },
        },
      },
    });

    const io = req.app.get("io");
    io.emit("productCreated", newProduct);

    logger.info("New product created", {
      creatorRole: role,
      productId: newProduct.id,
      name,
      category: categoryId,
    });
    await invalidateCache("products_all");
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    logger.error("Error creating product", {
      error: error instanceof Error ? error.stack : String(error),
      body: req.body,
    });
    res.status(500).json({ message: "Failed to create product" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const file = req.file;
  const { name, price, categoryId, categoryName, description, removeImage } =
    req.body;

  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: { include: { inventory: true } } },
    });

    if (!existingProduct) {
      logger.warn("Attempted to update non-existing product", {
        productId: id,
      });
      return res.status(404).json({ message: "Product not found" });
    }

    // Check for duplicate name
    if (name && name !== existingProduct.name) {
      const duplicate = await prisma.product.findFirst({
        where: { name, NOT: { id } },
      });
      if (duplicate)
        return res
          .status(400)
          .json({ message: "Another product with this name already exists" });
    }

    // Handle category selection/creation
    let finalCategoryId = existingProduct.categoryId;

    if (categoryName) {
      // Check if category exists, create if it doesn't
      let category = await prisma.category.findFirst({
        where: {
          name: {
            equals: categoryName,
            mode: "insensitive",
          },
        },
      });

      if (!category) {
        // Create new category
        category = await prisma.category.create({
          data: { name: categoryName },
        });
      }
      finalCategoryId = category.id;
    } else if (categoryId) {
      // Use existing category ID
      const categoryExists = await prisma.category.findUnique({
        where: { id: Number(categoryId) },
      });

      if (!categoryExists) {
        return res
          .status(400)
          .json({ message: "Selected category does not exist" });
      }
      finalCategoryId = Number(categoryId);
    }

    // Determine if there's no change
    const noChange =
      (name ?? existingProduct.name) === existingProduct.name &&
      (price ? Number(price) : existingProduct.price) ===
        existingProduct.price &&
      (description ?? existingProduct.description) ===
        existingProduct.description &&
      finalCategoryId === existingProduct.categoryId &&
      !file &&
      !removeImage;

    if (noChange) {
      return res.status(200).json({ message: "No changes made" });
    }

    // Build update data dynamically
    const updatedData: any = {};
    if (name) updatedData.name = name;
    if (price !== undefined) updatedData.price = Number(price);
    if (description !== undefined) updatedData.description = description;

    // Only update categoryId if it changed
    if (finalCategoryId !== existingProduct.categoryId) {
      updatedData.categoryId = finalCategoryId;
    }

    // Handle image update
    if (file) {
      if (existingProduct.imageurl) deleteImage(existingProduct.imageurl);
      updatedData.imageurl = file.filename;
    } else if (removeImage === "true") {
      if (existingProduct.imageurl) deleteImage(existingProduct.imageurl);
      updatedData.imageurl = null;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updatedData,
      include: {
        category: true, // Include category in response
      },
    });

    logger.info("Product updated", {
      productId: id,
      previous: existingProduct,
      product: updatedProduct,
    });

    const io = req.app.get("io");
    io.emit("productUpdated", updatedProduct);

    await invalidateCache(["products_all", `product_${id}`]);
    res.json(updatedProduct);
  } catch (error: any) {
    console.error(error);

    // Handle missing image files gracefully
    if (error.code === "ENOENT") {
      console.warn("Missing image file, but updating product anyway...");
      return res
        .status(200)
        .json({ message: "Product updated (missing old image file)" });
    }

    logger.error("Error updating product", {
      error: error instanceof Error ? error.stack : String(error),
      productId: id,
    });

    res.status(500).json({ message: "Failed to update product" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const role = req.headers["x-user-role"] || "unknown";

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      logger.warn("Attempted to delete non-existing product", {
        productId: id,
      });
      return res.status(404).json({ message: "Product not found" });
    }

    const deletedProduct = await prisma.product.delete({ where: { id } });

    const io = req.app.get("io");
    io.emit("productDeleted", deletedProduct.id); // ✅ Only emit ID

    logger.info("Product deleted", {
      productId: id,
      deletedBy: role,
    });

    res.json({ deletedProductId: deletedProduct.id });
  } catch (error) {
    console.error(error);
    logger.error("Error deleting product", {
      error: error instanceof Error ? error.stack : String(error),
      productId: id,
    });
    res.status(500).json({ message: "Failed to delete product" });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const {
      search,
      price,
      categoryId,
      sortBy = "updatedAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query as Record<string, string>;

    const filters: any = {};

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      filters.categoryId = parseInt(categoryId);
    }

    if (price) {
      filters.price = parseFloat(price);
    }
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const products = await prisma.product.findMany({
      where: filters,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });
    const total = await prisma.product.count({ where: filters });
    res.json({
      data: products,
      meta: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("❌ getProducts Error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};
// /api/products/without-variants.ts

export const getProductsWithoutVariants = async (
  req: Request,
  res: Response
) => {
  try {
    const productsWithoutVariants = await prisma.product.findMany({
      where: {
        variants: {
          none: {}, //  no variants
        },
      },
    });

    res.status(200).json(productsWithoutVariants);
  } catch (error) {
    console.error("Failed to fetch products without variants:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
