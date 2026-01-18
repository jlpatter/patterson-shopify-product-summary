import { NextFunction, Request, Response } from "express";
import { getRedisClient } from "../core/redis_client";
import { EndpointStats } from "../core/types";
import { ENDPOINT_STATS_REDIS_KEY } from "../core/constants";
import { getStats } from "../core/sdk";

export const measureAPIStatsMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const start = Date.now();
    res.once("finish", async () => {
        const duration = Date.now() - start;
        if (req.originalUrl !== "/favicon.ico") {
            // Get endpoint stats from redis cache
            const redisClient = await getRedisClient();
            let endpointStats = (await redisClient.json.get(
                ENDPOINT_STATS_REDIS_KEY
            )) as EndpointStats | null;
            if (!endpointStats) {
                endpointStats = {
                    endpoint_response_times_ms: {
                        average: 0,
                        max: 0,
                        min: 99999,
                    },
                    total_endpoint_calls: 0,
                };
            }

            // Then, update endpoint stats
            endpointStats.endpoint_response_times_ms.min = Math.min(
                duration,
                endpointStats.endpoint_response_times_ms.min
            );
            endpointStats.endpoint_response_times_ms.max = Math.max(
                duration,
                endpointStats.endpoint_response_times_ms.max
            );
            endpointStats.endpoint_response_times_ms.average =
                (endpointStats.endpoint_response_times_ms.average *
                    endpointStats.total_endpoint_calls +
                    duration) /
                (endpointStats.total_endpoint_calls + 1);
            endpointStats.total_endpoint_calls++;

            await redisClient.json.set(
                ENDPOINT_STATS_REDIS_KEY,
                "$",
                endpointStats
            );
        }
    });
    next();
};

export const getStatsController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.send(await getStats());
    next();
};
