import express from "express";
import { productsRouter } from "./routes/products";
import bodyParser from "body-parser";
import cors from "cors";
import {
    getStatsController,
    measureAPIStatsMiddleware,
} from "./controllers/base";
import { cacheAllProducts } from "./core/utils";
import { REDIS_CACHE_ALL_PRODUCTS_INTERVAL } from "./core/constants";
import { lockAndRunTask } from "./core/tasks";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(measureAPIStatsMiddleware);

// Routes
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check to make sure the site is healthy. This could be used for automatically standing instances
 *     back up that have failed.
 *     responses:
 *       200:
 *         description: The site is healthy.
 */
app.get("/health", (_req, resp) => {
    resp.sendStatus(200);
});
app.use("/products", productsRouter);
/**
 * @openapi
 * /api-stats:
 *   get:
 *     summary: Get API and product stats
 *     description: Returns statistics for endpoints and Shopify API calls.
 *     responses:
 *       200:
 *         description: ProductStats object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 endpoint_response_times_ms:
 *                   type: object
 *                   properties:
 *                     average:
 *                       type: number
 *                       format: float
 *                       description: Average response time of endpoints in milliseconds
 *                     max:
 *                       type: number
 *                       format: float
 *                       description: Maximum response time of endpoints in milliseconds
 *                     min:
 *                       type: number
 *                       format: float
 *                       description: Minimum response time of endpoints in milliseconds
 *                 total_endpoint_calls:
 *                   type: integer
 *                   description: Total number of endpoint calls
 *                 average_shopify_call_responsetime_ms:
 *                   type: number
 *                   format: float
 *                   description: Average response time of Shopify API calls in milliseconds
 *                 total_shopify_api_calls:
 *                   type: integer
 *                   description: Total number of Shopify API calls
 */
app.get("/api-stats", getStatsController);

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Patterson's Shopify Product Summary",
            version: "1.0.0",
        },
    },
    apis: ["./**/*.js"], // files to scan
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Cache all products initially to avoid first page loads being slow
// The `lockAndRunTask` function is used in case there are multiple instances of Node running.
lockAndRunTask(cacheAllProducts).catch(console.error);
// Continue caching all products occasionally to keep data up to date.
setInterval(() => {
    lockAndRunTask(cacheAllProducts).catch(console.error);
}, REDIS_CACHE_ALL_PRODUCTS_INTERVAL);
