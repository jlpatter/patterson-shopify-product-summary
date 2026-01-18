import {EndpointStats, Product, ProductResponse, ProductStats, ShopifyProduct, ShopifyStats} from "./types";
import axios from "axios";
import {getRedisClient} from "./redis_client";
import {
    ENDPOINT_STATS_REDIS_KEY, ALL_PRODUCTS_REDIS_KEY,
    SHOP,
    SHOPIFY_API_VERSION,
    SHOPIFY_STATS_REDIS_KEY,
    TOKEN
} from "./constants";
import {RedisClientType} from "redis";

const saveShopifyStats = async (redisClient: RedisClientType, duration: number) => {
    // Get Shopify stats from redis cache
    let shopifyStats: ShopifyStats | null = await redisClient.json.get(SHOPIFY_STATS_REDIS_KEY) as ShopifyStats | null;
    if (!shopifyStats) {
        shopifyStats = {
            "average_shopify_call_responsetime_ms": 0,
            "total_shopify_api_calls": 0,
        };
    }

    // Then, update them
    shopifyStats.average_shopify_call_responsetime_ms = ((shopifyStats.average_shopify_call_responsetime_ms * shopifyStats.total_shopify_api_calls) + duration) / (shopifyStats.total_shopify_api_calls + 1);
    shopifyStats.total_shopify_api_calls++;
    await redisClient.json.set(SHOPIFY_STATS_REDIS_KEY, "$", shopifyStats);
};

const postGraphQLQuery = async (redisClient: RedisClientType, query: string) => {
    const start = Date.now();
    const shopifyResp = await axios.post(
        `https://${SHOP}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        { query },
        {
            headers: {
                "X-Shopify-Access-Token": TOKEN,
                "Content-Type": "application/json",
            },
        }
    );
    const duration = Date.now() - start;
    // Save Shopify Stats
    saveShopifyStats(redisClient, duration).catch(err => {
        throw new Error("ERROR: Unable to save Shopify timing stats: " + err);
    });

    return shopifyResp.data;
};

const getAllProductsAndCache = async (redisClient: RedisClientType) => {
    // TODO: I'm using 100 here since there are less than 100 products, but ideally we should bulk GET
    //  all the products. See here: https://shopify.dev/docs/api/usage/bulk-operations/imports
    const query = `
        query {
            products(first: 100, sortKey: TITLE) {
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
    const data = await postGraphQLQuery(redisClient, query);

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

    await redisClient.json.set(ALL_PRODUCTS_REDIS_KEY, "$", products);

    return products;
}

export const getProducts = async (limit?: number, _cursor?: string): Promise<ProductResponse> => {
    // TODO: Implement `cursor` here!
    const redisClient = await getRedisClient();

    const pathStr = limit ? "$[" + limit + ":]" : "$";
    let products = await redisClient.json.get(ALL_PRODUCTS_REDIS_KEY, { path: pathStr }) as Product[] | null;
    if (!products) {
        const allProducts = await getAllProductsAndCache(redisClient);
        products = limit ? allProducts.slice(0, limit) : allProducts;
    }

    return products;
};

export const getProductById = async (id: string): Promise<Product> => {
    // TODO: Use the all products cache to get by id!
    const redisClient = await getRedisClient();

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
    // TODO: Cache this!
    const data = await postGraphQLQuery(redisClient, query);

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
    const redisClient = await getRedisClient();
    const endpointStats = await redisClient.json.get(ENDPOINT_STATS_REDIS_KEY) as EndpointStats | null;
    const shopifyStats = await redisClient.json.get(SHOPIFY_STATS_REDIS_KEY) as ShopifyStats | null;

    if (!endpointStats || !shopifyStats) {
        // TODO: Figure out if this is needed, otherwise make the error message better.
        throw new Error("Stats are missing!");
    }

    return {
        ...endpointStats,
        ...shopifyStats,
    };
};
