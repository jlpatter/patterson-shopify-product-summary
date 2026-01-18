import {Product, ProductResponse, ProductStats, ShopifyProduct} from "./types";
import axios from "axios";
import {getRedisClient} from "./redis_client";

const SHOP = process.env.SHOP;
const TOKEN = process.env.ACCESS_TOKEN;
const API_VERSION = "2026-01";
const REDIS_TIMEOUT = 300;  // 5 minutes

const postGraphQLQuery = async (query: string) => {
    // Use Redis for caching.
    const redisClient = await getRedisClient();
    const value = await redisClient.get(query);

    if (!value) {
        // TODO: I should set up a worker to handle asynchronously so it doesn't bog down the response time!
        const shopifyResp = await axios.post(
            `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
            { query },
            {
                headers: {
                    "X-Shopify-Access-Token": TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );
        await redisClient.set(query, JSON.stringify(shopifyResp.data), {EX: REDIS_TIMEOUT});
        console.log("Called Shopify API and then cached value.");
        return shopifyResp.data;
    }
    console.log("Using cached value!");
    return JSON.parse(value);
};

export const getProducts = async (_limit?: number, _cursor?: string): Promise<ProductResponse> => {
    // TODO: Implement `limit` and `cursor` here!
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
    const data = await postGraphQLQuery(query);

    // Convert data returned from Shopify to our own ProductResponse
    const products: Product[] = [];
    data.data.products.nodes.forEach((p: ShopifyProduct) => {
        products.push({
            "id": p.id,
            "title": p.title,
            "price": p.priceRangeV2.minVariantPrice.amount,
            "inventory": p.totalInventory,
            "created_at": p.createdAt
        });
    });
    return products;
};

export const getProductById = async (id: string): Promise<Product> => {
    const query = `
        query {
            product(id: "gid://shopify/Product/${id}") {
                id
                    title
                    priceRangeV2 {
                        minVariantPrice {
                            amount
                            currencyCode
                        }
                        maxVariantPrice {
                            amount
                            currencyCode
                        }
                    }
                    totalInventory
                    createdAt
            }
        }
    `;
    const data = await postGraphQLQuery(query);

    const shopifyProduct: ShopifyProduct = data.product;
    return {
        "id": shopifyProduct.id,
        "title": shopifyProduct.title,
        "price": shopifyProduct.priceRangeV2.minVariantPrice.amount,
        "inventory": shopifyProduct.totalInventory,
        "created_at": shopifyProduct.createdAt
    };
};

export const getStats = async (): Promise<ProductStats> => {
    throw new Error("Need to implement!");
};
