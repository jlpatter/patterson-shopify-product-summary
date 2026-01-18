import { randomUUID } from "crypto";
import { getRedisClient } from "./redis_client";
import { LOCK_REDIS_KEY, REDIS_CACHE_LOCK_TTL_MS } from "./constants";

const acquireLock = async (): Promise<string | null> => {
    const redisClient = await getRedisClient();
    const lockId = randomUUID();

    const result = await redisClient.set(LOCK_REDIS_KEY, lockId, {
        NX: true,
        PX: REDIS_CACHE_LOCK_TTL_MS,
    });

    return result === "OK" ? lockId : null;
};

const releaseLock = async (lockId: string) => {
    const redisClient = await getRedisClient();
    // NOTE: I copied-pasted this from ChatGPT cause it thought Lua would be more atomic.
    // Will have to research it more later.
    const lua = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

    await redisClient.eval(lua, {
        keys: [LOCK_REDIS_KEY],
        arguments: [lockId],
    });
};

export const lockAndRunTask = async (task: () => Promise<void>) => {
    const lockId = await acquireLock();

    if (!lockId) {
        console.log("Another instance is running the task");
        return;
    }

    try {
        await task();
    } catch (err) {
        console.error("Task failed", err);
    } finally {
        await releaseLock(lockId);
    }
};
