import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export const getRedisClient = async () => {
    if (!redisClient) {
        redisClient = createClient({
            socket: {
                host: process.env.REDIS_HOST || "localhost",
                port: Number(process.env.REDIS_PORT) || 6379,
            },
        });
        redisClient.on("error", (error) => {
            console.error(error);
        });
        redisClient.on("connect", () => {
            console.log("Connected to Redis");
        });
        await redisClient.connect();
    }
    return redisClient;
};
