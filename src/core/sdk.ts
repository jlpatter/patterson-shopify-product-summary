import {Product, ProductStats, ProductResponse} from "./types";

export const getProducts = (_limit?: number, _cursor?: string): Promise<ProductResponse> => {
    throw new Error("Need to implement!");
}

export const getProductById = (_id: string): Promise<Product> => {
    throw new Error("Need to implement!");
}

export const getStats = (): Promise<ProductStats> => {
    throw new Error("Need to implement!");
}
