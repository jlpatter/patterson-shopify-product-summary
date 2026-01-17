import express from 'express';
import {getProductDetailController, getProductsController} from "../controllers/products";

export const productsRouter = express.Router();

productsRouter.get('/', getProductsController);
productsRouter.get('/:id', getProductDetailController);
