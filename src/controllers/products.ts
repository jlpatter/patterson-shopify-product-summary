import {Request, Response, NextFunction} from "express";

export const getProductsController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProducts GET");
}

export const getProductDetailController = async (req: Request, res: Response, _next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProduct GET");
}
