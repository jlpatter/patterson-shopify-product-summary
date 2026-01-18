import { ProductZScore, ShopifyProduct, ShopifyStats } from "./types";
import {
    ALL_PRODUCTS_ZSET_REDIS_KEY,
    SHOP,
    SHOPIFY_API_VERSION,
    SHOPIFY_STATS_REDIS_KEY,
    TOKEN,
} from "./constants";
import { RedisClientType } from "redis";
import axios from "axios";
import { getRedisClient } from "./redis_client";

const saveShopifyStats = async (
    redisClient: RedisClientType,
    duration: number
) => {
    // Get Shopify stats from redis cache
    let shopifyStats: ShopifyStats | null = (await redisClient.json.get(
        SHOPIFY_STATS_REDIS_KEY
    )) as ShopifyStats | null;
    if (!shopifyStats) {
        shopifyStats = {
            average_shopify_call_responsetime_ms: 0,
            total_shopify_api_calls: 0,
        };
    }

    // Then, update them
    shopifyStats.average_shopify_call_responsetime_ms =
        (shopifyStats.average_shopify_call_responsetime_ms *
            shopifyStats.total_shopify_api_calls +
            duration) /
        (shopifyStats.total_shopify_api_calls + 1);
    shopifyStats.total_shopify_api_calls++;
    await redisClient.json.set(SHOPIFY_STATS_REDIS_KEY, "$", shopifyStats);
};

const postGraphQLQuery = async (
    redisClient: RedisClientType,
    query: string
) => {
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
    saveShopifyStats(redisClient, duration).catch((err) => {
        throw new Error("ERROR: Unable to save Shopify timing stats: " + err);
    });

    return shopifyResp.data;
};

export const cacheAllProducts = async () => {
    const redisClient = await getRedisClient();
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

    // Re-build the set from scratch. This allows rankings to be updated properly.
    await redisClient.del([ALL_PRODUCTS_ZSET_REDIS_KEY]);

    const productsZSet: ProductZScore[] = [];
    const pipeline = redisClient.multi();
    data.data.products.nodes.forEach((p: ShopifyProduct, index: number) => {
        pipeline.json.set(p.id, "$", {
            id: p.id,
            title: p.title,
            price: p.priceRangeV2.minVariantPrice.amount,
            inventory: p.totalInventory,
            created_at: p.createdAt,
        });
        productsZSet.push({
            value: p.id,
            score: index + 1,
        });
    });

    pipeline.zAdd(ALL_PRODUCTS_ZSET_REDIS_KEY, productsZSet);
    await pipeline.exec();
};
