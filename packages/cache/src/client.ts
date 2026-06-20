import Redis from "ioredis";

export type RedisClient = Redis;

export function createRedisClient(url = "redis://localhost:6379"): Redis {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });
}

export function createRedisSubscriber(url = "redis://localhost:6379"): Redis {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}
