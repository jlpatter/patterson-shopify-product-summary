export const SHOP = process.env.SHOP;
export const TOKEN = process.env.ACCESS_TOKEN;
export const SHOPIFY_API_VERSION = "2026-01";
export const REDIS_CACHE_ALL_PRODUCTS_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const REDIS_CACHE_LOCK_TTL_MS = 4 * 60 * 1000; // 4 minutes, just to be a little shorter than REDIS_CACHE_ALL_PRODUCTS_INTERVAL

export const ALL_PRODUCTS_REDIS_KEY = "allProducts";
export const ALL_PRODUCTS_ZSET_REDIS_KEY = ALL_PRODUCTS_REDIS_KEY + ":zset";
export const ENDPOINT_STATS_REDIS_KEY = "endpointStats";
export const SHOPIFY_STATS_REDIS_KEY = "shopifyStats";
export const LOCK_REDIS_KEY = ALL_PRODUCTS_REDIS_KEY + ":lock";
