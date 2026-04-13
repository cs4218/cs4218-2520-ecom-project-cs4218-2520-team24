import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import cors from "cors";
import client from "prom-client";

// configure env
dotenv.config();

//database config
connectDB();

const app = express();
app.disable("x-powered-by");

// Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "nodejs_" });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status_code"],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Metrics middleware — skip /metrics itself to avoid self-inflation
const routeMetrics = (req, res, next) => {
  if (req.path === "/metrics") return next();

  const end = httpRequestDurationSeconds.startTimer();

  res.on("finish", () => {
    const path = req.route ? req.baseUrl + req.route.path : req.path;
    const labels = { method: req.method, path, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });

  next();
};

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(routeMetrics);

// Prometheus /metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);

// rest api

app.get('/', (req,res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

if (process.env.NODE_ENV !== "test" || process.env.PLAYWRIGHT === "true") {
    app.listen(PORT, () => {
        console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
    });
}

export default app;