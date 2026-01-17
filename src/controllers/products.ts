import {Request, Response, NextFunction} from "express";
import {getProducts} from "../core/sdk";

export const getProductsController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send(await getProducts());
}

export const getProductDetailController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProductDetailController GET");
}
