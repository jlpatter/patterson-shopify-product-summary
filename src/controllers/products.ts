import {Request, Response, NextFunction} from "express";

export const getProductsController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send("SHOP: " + process.env.SHOP);
}

export const getProductDetailController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProductDetailController GET");
}
