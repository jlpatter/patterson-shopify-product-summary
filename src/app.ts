import express from 'express';
import { productsRouter } from './routes/products';
import bodyParser from 'body-parser';
import cors from 'cors';
import {getAPIStats, measureAPIStatsMiddleware} from "./controllers/base";

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
app.use('/products', productsRouter);
app.get('/api-stats', getAPIStats);

// Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
