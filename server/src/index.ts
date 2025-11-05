import express, { Request, Response, NextFunction } from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import * as YAML from "yamljs";
import swaggerUi from "swagger-ui-express";

// Routes
import productRoutes from "./routes/product.routes";
import userRoutes from "./routes/user.routes";
import orderRoutes from "./routes/order.routes";
import authRoutes from "./routes/auth.routes";
import inventoryRoutes from "./routes/inventory.routes";
import orderItemsRoutes from "./routes/orderItems.route";
import paymentRoutes from "./routes/payment.routes";
import webhookRoutes from "./routes/webhook.routes";
import variantRoutes from "./routes/variant.routes";
import categoryRoutes from "./routes/category.routes";
import analyticsRoutes from "./routes/analytics.routes";
import reportRoutes from "./routes/report.routes";

// Middlewares
import { apiRateLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import "./queues/reportScheduler";
import "./workers/report.worker";

import "./workers/orderWorkers";
import "./workers/userWorker";
import "./workers/paymentWorker";


import http from "http";
import { Server } from "socket.io";

// Initialize Express app
const app = express();
const PORT = 5000;
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // your React or Next.js frontend URL
    methods: ["GET", "POST"],
  },
});

// ✅ Handle connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
//
// ─── SECURITY MIDDLEWARES ──────────────────────────────────────────────
//

app.set("io", io); // ✅ Makes io available via req.app.get("io")

// Sets various HTTP headers for security
app.use(helmet());

// Enables CORS with specific config (adjust origin as needed)
app.use(
  cors({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length", "Content-Type"],
  })
);
// allows all origins

// Limit repeated requests to public APIs
app.use(apiRateLimiter);

app.use(requestLogger);
app.use(errorHandler);

// Logs IPs hitting the rate limiter (status 429)
app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode === 429) {
      console.log(`⚠️ Rate limit hit: ${req.ip} - ${req.method} ${req.path}`);
    }
  });
  next();
});

//
// ─── CORE MIDDLEWARES ──────────────────────────────────────────────────
//

app.use("/api/webhooks", webhookRoutes);
// app.use("/api/payments", webhookRoutes);

// Parses incoming JSON requests
app.use(express.json());

//
// ─── API DOCUMENTATION ─────────────────────────────────────────────────
//

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, "openapi.yaml"));

// Serve Swagger UI at /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      // Set proper CORS headers for images
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    },
  })
);

// Alternative: More explicit static file serving
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

//
// ─── ROUTES ────────────────────────────────────────────────────────────
//

app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orderItems", orderItemsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);

//
// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────
//

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(" Error:", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: "Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// reportQueue.add(
//   "generateSalesReport",
//   {},
//   { repeat: { pattern: "0 8 * * *" } } // 8:00 AM every day
// );
//
// ─── START SERVER ──────────────────────────────────────────────────────
//

server.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
