import {Product, ProductResponse, ProductStats, ShopifyProduct} from "./types";
import axios from "axios";

const SHOP = process.env.SHOP;
const TOKEN = process.env.ACCESS_TOKEN;
const API_VERSION = "2026-01";

export const getProducts = async (_limit?: number, _cursor?: string): Promise<ProductResponse> => {
    const query = `
        query {
            products(first: 10, sortKey: TITLE) {
                nodes {
                    id
                    title
                    priceRangeV2 {
                        minVariantPrice {
                            amount
                        }
                    }
                    totalInventory
                    createdAt
                }
            }
        }
    `;
    // TODO: Cache this!
    // TODO: Implement `limit` and `cursor` here!
    const resp = await axios.post(
        `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
        { query },
        {
            headers: {
                "X-Shopify-Access-Token": TOKEN,
                "Content-Type": "application/json",
            },
        }
    );

    // Convert data returned from Shopify to our own ProductResponse
    const products: Product[] = [];
    resp.data.data.products.nodes.forEach((p: ShopifyProduct) => {
        products.push({
            "id": p.id,
            "title": p.title,
            "price": p.priceRangeV2.minVariantPrice.amount,
            "inventory": p.totalInventory,
            "created_at": p.createdAt
        });
    })
    return products;
}

export const getProductById = async (_id: string): Promise<Product> => {
    throw new Error("Need to implement!");
}

export const getStats = async (): Promise<ProductStats> => {
    throw new Error("Need to implement!");
}
