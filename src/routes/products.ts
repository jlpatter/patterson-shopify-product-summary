import express from 'express';
import {getProduct, getProducts} from "../controllers/products";

export const productsRouter = express.Router();

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProduct);
