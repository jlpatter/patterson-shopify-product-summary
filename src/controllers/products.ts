import {Request, Response, NextFunction} from "express";
import {getProductById, getProducts} from "../core/sdk";

export const getProductsController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send(await getProducts());
}

export const getProductDetailController = async (req: Request, res: Response, _next: NextFunction) => {
    const id = req.params.id;
    if (typeof id !== "string") {
        res.status(400).send("400 Bad Request: Please only specify one `id` on the product endpoint.");
        return;
    }
    // NOTE: `id` needs to be in the form `1234567890`, not `gid://shopify/Product/1234567890`
    res.send(await getProductById(id));
}
