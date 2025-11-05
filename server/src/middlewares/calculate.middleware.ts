// middleware/calculatePricing.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

async function calculatePricing(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { orderItems, promoCode, shippingMethod, shippingRegion } = req.body;

  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let shipping = 0;

  try {
    for (const item of orderItems) {
      let price: number;
      let productId: number;

      if (item.variantId) {
        // ✅ Use variant price
        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId },
          select: { price: true, productId: true },
        });

        if (!variant) {
          return res
            .status(404)
            .json({ error: `Variant ${item.variantId} not found.` });
        }

        price =
          typeof variant.price === "object" && "toNumber" in variant.price
            ? variant.price.toNumber()
            : Number(variant.price);

        productId = variant.productId;
      } else {
        // ✅ Use base product price
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { price: true, id: true },
        });

        if (!product) {
          return res
            .status(404)
            .json({ error: `Product ${item.productId} not found.` });
        }

        price =
          typeof product.price === "object" && "toNumber" in product.price
            ? product.price.toNumber()
            : Number(product.price);

        productId = product.id;
      }

      // Attach price & productId for controller use
      item.price = price;
      item.productId = productId;

      subtotal += price * item.quantity;
    }

    // ✅ Apply promo discount
    if (promoCode === "WELCOME10") {
      discount = subtotal * 0.1;
    }

    // ✅ Tax (15% VAT on discounted subtotal)
    tax = 0.15 * (subtotal - discount);

    // ✅ Shipping logic
    shipping = shippingMethod === "express" ? 20 : 10;
    if (shippingRegion === "remote") shipping += 5;

    // ✅ Final total
    const total = subtotal - discount + tax + shipping;

    // Attach computed values for controller
    req.body.subtotal = subtotal;
    req.body.discount = discount;
    req.body.tax = tax;
    req.body.shipping = shipping;
    req.body.total = total;

    next();
  } catch (error) {
    console.error("❌ Pricing middleware error:", error);
    res.status(500).json({ error: "Failed to calculate pricing" });
  }
}

export default calculatePricing;
