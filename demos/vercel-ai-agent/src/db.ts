import Redis from "ioredis";

export const db = new Redis({
  host: process.env.REDISHOST!,
  port: parseInt(process.env.REDISPORT!, 10),
  db: parseInt(process.env.REDISDB ?? "1", 10),
});
