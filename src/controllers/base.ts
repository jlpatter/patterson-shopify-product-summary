import {NextFunction, Request, Response} from "express";

export const measureAPIStatsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.once('finish', () => {
        const duration = Date.now() - start;
        console.log("Time taken to process " + req.originalUrl + " is: " + duration);
    });
    next();
}

export const getAPIStats = async (req: Request, res: Response, next: NextFunction) => {
    res.send("NOT IMPLEMENTED: getProducts GET");
    next();
}
