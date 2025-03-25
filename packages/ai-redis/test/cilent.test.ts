import { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisStore } from "../src/index";

vi.mock("ioredis");

describe("RedisStore (encryption disabled)", () => {
  let mockRedis: Redis;
  let redisStore: RedisStore;

  beforeEach(() => {
    mockRedis = new Redis() as unknown as Redis;
    vi.clearAllMocks();
    redisStore = new RedisStore(mockRedis);
  });

  it("should store a value without encryption", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };

    const setSpy = vi.spyOn(mockRedis, "set").mockResolvedValue("OK");

    await redisStore.put(namespace, key, value);

    expect(setSpy).toHaveBeenCalledWith("test:key1", JSON.stringify(value));
  });

  it("should retrieve a value without decryption", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };

    vi.spyOn(mockRedis, "get").mockResolvedValue(JSON.stringify(value));

    const result = await redisStore.get(namespace, key);

    expect(result).toEqual(value);
  });

  it("should return null if the key does not exist", async () => {
    const namespace = ["test"];
    const key = "nonexistent";

    vi.spyOn(mockRedis, "get").mockResolvedValue(null);

    const result = await redisStore.get(namespace, key);

    expect(result).toBeNull();
  });

  it("should delete a key", async () => {
    const namespace = ["test"];
    const key = "key1";

    const delSpy = vi.spyOn(mockRedis, "del").mockResolvedValue(1);

    await redisStore.delete(namespace, key);

    expect(delSpy).toHaveBeenCalledWith("test:key1");
  });

  it("should store a value with an expiration time", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };
    const expiresIn = 60000;

    const setSpy = vi.spyOn(mockRedis, "set").mockResolvedValue("OK");

    await redisStore.put(namespace, key, value, { expiresIn });

    expect(setSpy).toHaveBeenCalledWith(
      "test:key1",
      JSON.stringify(value),
      "EX",
      expiresIn / 1000
    );
  });
});
