import express from "express";
import {
    getProductDetailController,
    getProductsController,
} from "../controllers/products";

export const productsRouter = express.Router();

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Get a paginated list of products using cursor-based pagination
 *     description: Returns a list of products and a cursor for fetching the next page.
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum number of products to return
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: Cursor indicating where to start the page. Omit for the first page.
 *     responses:
 *       200:
 *         description: A list of products with cursor-based pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page_info:
 *                   type: object
 *                   properties:
 *                     next_page:
 *                       type: number
 *                       description: The cursor value to use for the next page
 *                     has_next_page:
 *                       type: boolean
 *                       description: Whether there is another page
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                         format: float
 *                       inventory:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
productsRouter.get("/", getProductsController);


/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     description: Returns the product object for the specified ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the product
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 price:
 *                   type: number
 *                   format: float
 *                 inventory:
 *                   type: integer
 *                 created_at:
 *                   type: string
 *                   format: date-time
 */
productsRouter.get("/:id", getProductDetailController);
