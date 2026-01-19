import { getRedisClient } from "./redis_client";
import { LOCK_REDIS_KEY, REDIS_CACHE_LOCK_TTL_MS } from "./constants";
import { createLock, NodeRedisAdapter } from "redlock-universal";

const getLock = async (windowKey: number) => {
    // TODO: May want to allow passing in more generic keys so this can be used for more than just 1 kind of task.
    return createLock({
        adapter: new NodeRedisAdapter(await getRedisClient()),
        key: LOCK_REDIS_KEY + `:${windowKey}`,
        ttl: REDIS_CACHE_LOCK_TTL_MS,
        // For our use-case, if the lock is already acquired, then the current process
        // (presumably another node instance) should skip attempting to cache all the products.
        retryAttempts: 0,
        retryDelay: 0,
    });
};

export const lockAndRunTask = async (task: () => Promise<void>) => {
    // See here for Redis docs on lock stuff: https://redis.io/docs/latest/commands/set/#patterns
    // Info on Redis distributed locks: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
    // Info on redlock-universal: https://github.com/alexpota/redlock-universal

    // This windowStart variable is to set a window on the singular execution needed so other node instances
    // don't run within the same window of time.
    const windowStart =
        Math.floor(Date.now() / REDIS_CACHE_LOCK_TTL_MS) *
        REDIS_CACHE_LOCK_TTL_MS;
    const lock = await getLock(windowStart);

    try {
        await lock.acquire();
    } catch (_err) {
        console.log(
            "Lock not acquired, another process is taking care of this. Skipping..."
        );
        return;
    }

    try {
        await task();
    } finally {
        // Normally we'd release the lock in a `finally` statement, however, since we only want 1 instance
        // of node to cache all the products, we'll keep the lock set until its expiration. It will try
        // again at the next interval in app.ts.
        // await lock.release(handle);
    }
};
