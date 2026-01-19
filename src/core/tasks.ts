import { getRedisClient } from "./redis_client";
import { LOCK_REDIS_KEY, REDIS_CACHE_LOCK_TTL_MS } from "./constants";
import { createLock, NodeRedisAdapter, Lock } from "redlock-universal";

let lock: Lock | null;

const getLock = async () => {
    // TODO: May want to pass a key in so this can be used for more than just 1 kind of task.
    if (!lock) {
        lock = createLock({
            adapter: new NodeRedisAdapter(await getRedisClient()),
            key: LOCK_REDIS_KEY,
            ttl: REDIS_CACHE_LOCK_TTL_MS,
            // For our use-case, if the lock is already acquired, then the current process
            // (presumably another node instance) should skip attempting to cache all the products.
            retryAttempts: 0,
            retryDelay: 0,
        });
    }
    return lock;
};

export const lockAndRunTask = async (task: () => Promise<void>) => {
    // See here for Redis docs on lock stuff: https://redis.io/docs/latest/commands/set/#patterns
    // Info on Redis distributed locks: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
    // Info on redlock-universal: https://github.com/alexpota/redlock-universal
    const lock = await getLock();

    let handle;
    try {
        handle = await lock.acquire();
    } catch (_err) {
        console.log(
            "Lock not acquired, another process is taking care of this. Skipping..."
        );
        return;
    }

    try {
        await task();
    } finally {
        await lock.release(handle);
    }
};
