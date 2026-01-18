import {EndpointStats, Product, ProductResponse, ProductStats, ShopifyProduct, ShopifyStats} from "./types";
import axios from "axios";
import {getRedisClient} from "./redis_client";
import {
    ENDPOINT_STATS_REDIS_KEY,
    REDIS_TIMEOUT,
    SHOP,
    SHOPIFY_API_VERSION,
    SHOPIFY_STATS_REDIS_KEY,
    TOKEN
} from "./constants";
import {RedisClientType} from "redis";

const saveShopifyStats = async (redisClient: RedisClientType, duration: number) => {
    // Get Shopify stats from redis cache
    let shopifyStats: ShopifyStats;
    const shopifyStatsStr = await redisClient.get(SHOPIFY_STATS_REDIS_KEY);
    if (!shopifyStatsStr) {
        shopifyStats = {
            "average_shopify_call_responsetime_ms": 0,
            "total_shopify_api_calls": 0,
        };
    } else {
        shopifyStats = JSON.parse(shopifyStatsStr);
    }

    // Then, update them
    shopifyStats.average_shopify_call_responsetime_ms = ((shopifyStats.average_shopify_call_responsetime_ms * shopifyStats.total_shopify_api_calls) + duration) / (shopifyStats.total_shopify_api_calls + 1);
    shopifyStats.total_shopify_api_calls++;
    // NOTE: We are not setting an expiration on this because it should remain persistent.
    await redisClient.set(SHOPIFY_STATS_REDIS_KEY, JSON.stringify(shopifyStats));
};

const postGraphQLQuery = async (query: string) => {
    // Use Redis for caching.
    const redisClient = await getRedisClient();
    const cachedShopifyData = await redisClient.get(query);

    if (!cachedShopifyData) {
        // TODO: I should set up a worker to handle asynchronously so it doesn't bog down the response time!
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
        await saveShopifyStats(redisClient, duration);

        // Cache results from Shopify call
        await redisClient.set(query, JSON.stringify(shopifyResp.data), {EX: REDIS_TIMEOUT});
        console.log("Called Shopify API and then cached value.");
        return shopifyResp.data;
    }
    console.log("Using cached value!");
    return JSON.parse(cachedShopifyData);
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
    const redisClient = await getRedisClient();
    const endpointStatsStr = await redisClient.get(ENDPOINT_STATS_REDIS_KEY);
    const shopifyStatsStr = await redisClient.get(SHOPIFY_STATS_REDIS_KEY);

    if (!endpointStatsStr || !shopifyStatsStr) {
        // TODO: Figure out if this is needed, otherwise make the error message better.
        throw new Error("Stats are missing!");
    }

    const endpointStats: EndpointStats = JSON.parse(endpointStatsStr);
    const shopifyStats: ShopifyStats = JSON.parse(shopifyStatsStr);

    return {
        ...endpointStats,
        ...shopifyStats,
    };
};
