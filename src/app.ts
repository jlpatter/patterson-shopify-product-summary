import express from 'express';
import { productsRouter } from './routes/products';
import bodyParser from 'body-parser';
import cors from 'cors';
import {getAPIStats} from "./controllers/base";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Routes
app.get('/products', productsRouter);
app.get('/api-stats', getAPIStats);

// Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
