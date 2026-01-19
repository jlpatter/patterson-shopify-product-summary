import {
    EndpointStats,
    Product,
    ProductResponse,
    ProductStats,
    ShopifyStats,
} from "./types";
import { getRedisClient } from "./redis_client";
import {
    ENDPOINT_STATS_REDIS_KEY,
    SHOPIFY_STATS_REDIS_KEY,
    ALL_PRODUCTS_ZSET_REDIS_KEY,
} from "./constants";
import { cacheAllProducts } from "./utils";
import { RedisClientType } from "redis";

const checkAllProducts = async (redisClient: RedisClientType) => {
    if (!(await redisClient.exists(ALL_PRODUCTS_ZSET_REDIS_KEY))) {
        // NOTE: This is a fail-safe just in case initial caching in `app.ts` fails!
        console.warn(
            "WARNING: Lazy-load caching just occurred, initial caching must have failed!"
        );
        await cacheAllProducts();
    }
};

/**
 * Gets all the available products.
 * @param limit limits the number of products returned in response.
 * @param cursor starting location for pagination.
 */
export const getProducts = async (
    limit?: number,
    cursor?: string
): Promise<ProductResponse> => {
    const redisClient = await getRedisClient();

    await checkAllProducts(redisClient);

    const finalCursor = cursor ? Number(cursor) : 1;
    const finalLimit = limit ? limit : 100;
    // For stuff about zRanges, see here: https://redis.io/docs/latest/commands/zrangebyscore/
    const productIdsWithScores = await redisClient.zRangeByScoreWithScores(
        ALL_PRODUCTS_ZSET_REDIS_KEY,
        `(${finalCursor}`,
        "+inf",
        { LIMIT: { offset: 0, count: finalLimit } }
    );

    if (productIdsWithScores.length === 0) {
        return {
            page_info: {
                next_page: 1,
                has_next_page: true,
            },
            products: [],
        };
    }

    const nextPage =
        productIdsWithScores[productIdsWithScores.length - 1].score;
    const hasNextPage =
        (
            await redisClient.zRangeWithScores(
                ALL_PRODUCTS_ZSET_REDIS_KEY,
                0,
                0,
                { REV: true }
            )
        )[0].score > nextPage;

    // Get cached products on this page
    const pipeline = redisClient.multi();
    productIdsWithScores.forEach((productIdsWithScore) =>
        pipeline.json.get(productIdsWithScore.value)
    );
    const products: Product[] = (await pipeline.exec()) as unknown as Product[];

    return {
        page_info: {
            next_page: nextPage,
            has_next_page: hasNextPage,
        },
        products: products,
    };
};

/**
 * Get a specific product's details.
 * @param id The id of the product to get. E.g. `1234567890`
 */
export const getProductById = async (id: string): Promise<Product> => {
    const redisClient = await getRedisClient();

    await checkAllProducts(redisClient);

    const product = (await redisClient.json.get(
        `gid://shopify/Product/${id}`
    )) as Product | null;

    if (!product) {
        // TODO: This should probably throw a 404 instead.
        throw new Error("ERROR: Product id not found!");
    }

    return product;
};

/**
 * Get some stats about this API/SDK. Includes timing and number of calls.
 */
export const getStats = async (): Promise<ProductStats> => {
    const redisClient = await getRedisClient();
    let endpointStats = (await redisClient.json.get(
        ENDPOINT_STATS_REDIS_KEY
    )) as EndpointStats | null;
    let shopifyStats = (await redisClient.json.get(
        SHOPIFY_STATS_REDIS_KEY
    )) as ShopifyStats | null;

    if (!endpointStats) {
        endpointStats = {
            endpoint_response_times_ms: {
                average: NaN,
                max: NaN,
                min: NaN,
            },
            total_endpoint_calls: 0,
        };
    }

    if (!shopifyStats) {
        shopifyStats = {
            average_shopify_call_responsetime_ms: NaN,
            total_shopify_api_calls: 0,
        };
    }

    return {
        ...endpointStats,
        ...shopifyStats,
    };
};
