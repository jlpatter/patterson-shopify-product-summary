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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(measureAPIStatsMiddleware);

// Routes
// Add a healthcheck endpoint for automatically standing instances back up that have failed.
app.get("/health", (_req, resp) => {
    resp.sendStatus(200);
});
app.use("/products", productsRouter);
app.get("/api-stats", getStatsController);

// Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Cache all products initially to avoid first page loads being slow
// The `lockAndRunTask` function is used in case there are multiple instances of Node running.
lockAndRunTask(cacheAllProducts).catch(console.error);
// Continue caching all products occasionally to keep data up to date.
setInterval(() => {
    // TODO: Is there a way to keep multiple instances from running this more often if they're spaced out enough?
    //  E.g. if node_1 runs it at minute '1', but then node_2 runs it at minute '3', it'll run more often. Need to fix.
    lockAndRunTask(cacheAllProducts).catch(console.error);
}, REDIS_CACHE_ALL_PRODUCTS_INTERVAL);
