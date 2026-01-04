import { Request, Response } from "express";
import { prisma } from "../utils/prisma";


// GET /orders — fetch all orders
export const getOrderItems = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.orderItem.findMany({
       include: {
              order:true,
           product:true
  },
});
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch order Items" });
  }
};
