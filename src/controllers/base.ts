import {NextFunction, Request, Response} from "express";
import {getRedisClient} from "../core/redis_client";
import {EndpointStats} from "../core/types";
import {ENDPOINT_STATS_REDIS_KEY} from "../core/constants";
import {getStats} from "../core/sdk";

export const measureAPIStatsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.once("finish", async () => {
        const duration = Date.now() - start;
        if (req.originalUrl !== "/favicon.ico") {
            // Get endpoint stats from redis cache
            const redisClient = await getRedisClient();
            let endpointStats: EndpointStats;
            const endpointStatsStr = await redisClient.get(ENDPOINT_STATS_REDIS_KEY);
            if (!endpointStatsStr) {
                endpointStats = {
                    "endpoint_response_times_ms": {
                        "average": 0,
                        "max": 0,
                        "min": 99999,
                    },
                    "total_endpoint_calls": 0,
                };
            } else {
                endpointStats = JSON.parse(endpointStatsStr);
            }

            // Then, update endpoint stats
            endpointStats.endpoint_response_times_ms.min = Math.min(duration, endpointStats.endpoint_response_times_ms.min);
            endpointStats.endpoint_response_times_ms.max = Math.max(duration, endpointStats.endpoint_response_times_ms.max);
            endpointStats.endpoint_response_times_ms.average = ((endpointStats.endpoint_response_times_ms.average * endpointStats.total_endpoint_calls) + duration) / (endpointStats.total_endpoint_calls + 1);
            endpointStats.total_endpoint_calls++;

            // NOTE: We are not setting an expiration on this because it should remain persistent.
            await redisClient.set(ENDPOINT_STATS_REDIS_KEY, JSON.stringify(endpointStats));
        }
    });
    next();
};

export const getStatsController = async (req: Request, res: Response, next: NextFunction) => {
    res.send(await getStats());
    next();
};
