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

export const getProductById = async (id: string): Promise<Product> => {
    const redisClient = await getRedisClient();

    await checkAllProducts(redisClient);

    const product = (await redisClient.json.get(
        `gid://shopify/Product/${id}`
    )) as Product | null;

    if (!product) {
        throw new Error("ERROR: Product id not found!");
    }

    return product;
};

export const getStats = async (): Promise<ProductStats> => {
    const redisClient = await getRedisClient();
    const endpointStats = (await redisClient.json.get(
        ENDPOINT_STATS_REDIS_KEY
    )) as EndpointStats | null;
    const shopifyStats = (await redisClient.json.get(
        SHOPIFY_STATS_REDIS_KEY
    )) as ShopifyStats | null;

    if (!endpointStats || !shopifyStats) {
        // TODO: Figure out if this is needed, otherwise make the error message better.
        throw new Error("ERROR: Stats are missing!");
    }

    return {
        ...endpointStats,
        ...shopifyStats,
    };
};
