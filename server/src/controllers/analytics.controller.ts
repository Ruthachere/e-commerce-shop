import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { formatDistanceToNow } from 'date-fns';
// GET /api/analytics/sales
export const getSales = async (req: Request, res: Response) => {
  try {
    const sales = await prisma.order.groupBy({
      by: ["orderDate"],
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: { in: ["Shipped", "Delivered"] },
      },
      orderBy: {
        orderDate: "asc",
      },
    });

    res.json(
      sales.map((s) => ({
        date: s.orderDate,
        revenue: s._sum.totalAmount,
        orders: s._count.id,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales data" });
  }
};

// GET /api/analytics/top-products
export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const productDetails = await Promise.all(
      products.map((p) =>
        prisma.product.findUnique({
          where: { id: p.productId },
          select: { id: true, name: true, imageurl: true },
        })
      )
    );

    const topProducts = products.map((p, i) => ({
      ...productDetails[i],
      totalSold: p._sum.quantity,
    }));

    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};

// GET /api/analytics/overview
export const getOverview = async (req: Request, res: Response) => {
  try {
    const [totalOrders, totalRevenue, totalUsers, avgOrderValue] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
        }),
        prisma.user.count(),
        prisma.order.aggregate({
          _avg: { totalAmount: true },
        }),
      ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount,
      totalUsers,
      avgOrderValue: avgOrderValue._avg.totalAmount,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
};

// GET /api/analytics/sales-by-category
export const getSalesByCategory = async (req: Request, res: Response) => {
  try {
    const sales = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { price: true },
    });

    const categoryMap = new Map<
      number,
      { categoryId: number; revenue: number }
    >();

    for (const s of sales) {
      const product = await prisma.product.findUnique({
        where: { id: s.productId },
        select: { categoryId: true },
      });

      if (product) {
        const existing = categoryMap.get(product.categoryId);
        if (existing) {
          existing.revenue += Number(s._sum.price);
        } else {
          categoryMap.set(product.categoryId, {
            categoryId: product.categoryId,
            revenue: Number(s._sum.price),
          });
        }
      }
    }

    const categories = await prisma.category.findMany();

    const result = categories.map((cat) => ({
      category: cat.name,
      revenue: categoryMap.get(cat.id)?.revenue || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales by category" });
  }
};

// GET /api/analytics/customer-lifetime-value
export const getCustomerLifetimeValue = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.order.groupBy({
      by: ["userId"],
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const result = await Promise.all(
      customers.map(async (customer) => {
        const user = await prisma.user.findUnique({
          where: { id: customer.userId },
          select: { id: true, username: true, email: true },
        });

        return {
          ...user,
          lifetimeValue: customer._sum.totalAmount,
          ordersCount: customer._count.id,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch CLV data" });
  }
};

export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activities = logs.map((log) => {
      let message = "";

      switch (log.action) {
        case "ORDER_CREATED":
          message = `New order #${log.entityId} received`;
          break;
        case "USER_REGISTERED":
          message = `New customer registered`;
          break;
        case "STOCK_LOW":
          message = `Low stock alert: ${log.entity}`;
          break;
        case "ORDER_SHIPPED":
          message = `Order #${log.entityId} shipped`;
          break;
        case "PRODUCT_UPDATED":
          message = `Product "${log.entity}" updated`;
          break;
        default:
          message = `${log.action} on ${log.entity}`;
      }

      return {
        id: log.id,
        message,
        timestamp: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }),
        action: log.action,
      };
    });

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};
