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
import {getHashString} from "./utils";

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
    // NOTE: We are not setting an expiration on this because it should remain persistent.
    await redisClient.json.set(SHOPIFY_STATS_REDIS_KEY, "$", shopifyStats);
};

const postGraphQLQuery = async (query: string) => {
    // Use Redis for caching.
    const redisClient = await getRedisClient();
    // TODO: Split this out for each function!
    const cachedShopifyData = await redisClient.get(getHashString(query));

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
        saveShopifyStats(redisClient, duration).catch(err => {
            throw new Error("ERROR: Unable to save Shopify timing stats: " + err);
        });

        // Cache results from Shopify call
        await redisClient.set(getHashString(query), JSON.stringify(shopifyResp.data), {EX: REDIS_TIMEOUT});
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
