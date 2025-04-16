export const connection = {
  host: process.env.REDISHOST ?? '127.0.0.1',
  port: process.env.REDISPORT ? parseInt(process.env.REDISPORT, 10) : 6379
};
