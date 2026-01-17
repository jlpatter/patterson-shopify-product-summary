import {Request, Response, NextFunction} from "express";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProducts GET");
}

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProduct GET");
}
