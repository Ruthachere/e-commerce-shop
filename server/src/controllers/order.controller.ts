import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { Status } from "../types/order.types";
import { logger } from "../utils/logger";
import { orderQueue } from "../queues/order.queue";

const validTransitions: Record<Status, Status[]> = {
  Pending: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

// GET /orders — fetch all orders
export const getOrders = async (_req: Request, res: Response) => {
  const start = Date.now();
  const role = _req.headers["x-user-role"] || "unknown";
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: true,
        payment: true,
      },
    });

    logger.info("Fetched all orders", {
      filters: _req.query,
      requesterRole: role,
      duration: `${Date.now() - start}ms`,
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    logger.error("Error fetching orders", {
      error: error instanceof Error ? error.stack : String(error),
    });
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET /orders/:id — fetch a specific order by ID
export const getOrderById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        payment: true,
      },
    });
    if (!order) {
      logger.warn("Order not found", { orderId: id });
      return res.status(404).json({ message: "Order not found" });
    }
    logger.info("Fetched order by ID", { orderId: id });
    res.json(order);
  } catch (error) {
    console.error(error);
    logger.error("Error fetching order by ID", {
      error: error instanceof Error ? error.stack : String(error),
      orderId: id,
    });
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

// POST /orders — create a new order
export const createOrder = async (req: Request, res: Response) => {
  const {
    id,
    userId,
    orderId,
    shippingCity,
    shippingState,
    shippingCountry,
    shippingMethod,
    orderItems,
    subtotal,
    discount,
    tax,
    shipping,
    total,
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      //  1. Check stock
      for (const item of orderItems) {
        const stock = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });

        if (!stock || stock.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for variant ${item.variantId}. Available: ${
              stock?.quantity || 0
            }`
          );
        }
      }

      //  2. Deduct stock
      for (const item of orderItems) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Create order with items
      const order = await tx.order.create({
        data: {
          userId,
          orderDate: new Date(),
          discount,
          tax,
          shipping,
          total,
          totalAmount: total,
          status: "Pending",
          shippingCity,
          shippingState,
          shippingCountry,
          shippingMethod,
          orderItems: {
            create: orderItems.map((item: any) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              productId: item.productId,
            })),
          },
        },
        include: { orderItems: true },
      });

      return order;
    });
    logger.info("New Order placed", {
      orderId: orderItems.id,
      userId: orderItems.userId,
      total,
      itemsCount: orderItems.length,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      throw new Error("User email not found");
    }

    await orderQueue.add("sendConfirmationEmail", {
      userEmail: user.email,
      orderId: result.id,
    });

    res.status(201).json({
      message: "Order created. Confirmation email will be sent shortly.",
      order: result,
    });
  } catch (error: any) {
    console.error(error);
    logger.error("Error placing order", {
      error: error.stack || String(error),
      payload: req.body,
    });
    res
      .status(500)
      .json({ message: error.message || "Failed to create order" });
  }
};

// PUT /orders/:id — update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const newStatus: Status = req.body.status;
  const role = req.headers["x-user-role"] || "unknown";

  if (!["Pending", "Shipped", "Delivered", "Cancelled"].includes(newStatus)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      logger.warn("Order not found for status update", { orderId: id });
      return res.status(404).json({ message: "Order not found" });
    }

    const allowed = validTransitions[existingOrder.status as Status];

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        message: `Invalid status transition from ${existingOrder.status} → ${newStatus}`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    logger.info("Order status updated", {
      orderId: id,
      from: existingOrder.status,
      to: newStatus,
      adminRole: role,
    });

    // ✅ Emit real-time update to clients
    const io = req.app.get("io");
    io.emit("orderUpdated", updatedOrder);
    
    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    logger.error("Error updating order status", {
      error: error instanceof Error ? error.stack : String(error),
      orderId: id,
      attemptedStatus: newStatus,
    });
    res.status(500).json({ message: "Failed to update order status" });
  }
};

// DELETE /orders/:id — permanently delete an order and its dependencies
export const cancelOrder = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const role = req.headers["x-user-role"] || "unknown";
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        payment: true,
      },
    });

    if (!existingOrder) {
      logger.warn("Attempt to delete non-existent order", { orderId: id });
      return res.status(404).json({ message: "Order not found" });
    }
    if (["Shipped", "Delivered"].includes(existingOrder.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel a shipped or delivered order" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.payment.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    logger.info("Order cancelled", {
      orderId: id,
      deletedBy: role,
    });

    res.json({ message: "Order and related records deleted successfully" });
  } catch (error) {
    console.error(error);
    logger.error("Error cancelling order", {
      error: error instanceof Error ? error.stack : String(error),
      orderId: id,
    });
    res.status(500).json({ message: "Failed to delete order" });
  }
};

export const searchOrders = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      status,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    const filters: any = {};

    if (userId) {
      filters.userId = parseInt(userId as string);
    }

    if (status) {
      filters.status = status;
    }

    // Handle date range filtering
    if (startDate || endDate) {
      filters.orderDate = {};
      if (startDate) filters.orderDate.gte = new Date(startDate as string);
      if (endDate) filters.orderDate.lte = new Date(endDate as string);
    }

    // Search in city/state/country (case-insensitive)
    if (search) {
      filters.OR = [
        { shippingCity: { contains: search as string, mode: "insensitive" } },
        { shippingState: { contains: search as string, mode: "insensitive" } },
        {
          shippingCountry: { contains: search as string, mode: "insensitive" },
        },
      ];
    }

    // Pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);

    const orders = await prisma.order.findMany({
      where: filters,
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.order.count({ where: filters });

    res.status(200).json({
      data: orders,
      meta: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
