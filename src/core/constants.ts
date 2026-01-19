export const SHOP = process.env.SHOP;
export const TOKEN = process.env.ACCESS_TOKEN;
export const SHOPIFY_API_VERSION = "2026-01";
export const REDIS_CACHE_ALL_PRODUCTS_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const REDIS_CACHE_LOCK_TTL_MS = REDIS_CACHE_ALL_PRODUCTS_INTERVAL; // This is the same as REDIS_CACHE_ALL_PRODUCTS_INTERVAL to avoid multiple node instances being able to acquire the lock early.

export const ALL_PRODUCTS_REDIS_KEY = "allProducts";
export const ALL_PRODUCTS_ZSET_REDIS_KEY = ALL_PRODUCTS_REDIS_KEY + ":zset";
export const ENDPOINT_STATS_REDIS_KEY = "endpointStats";
export const SHOPIFY_STATS_REDIS_KEY = "shopifyStats";
export const LOCK_REDIS_KEY = ALL_PRODUCTS_REDIS_KEY + ":lock";
