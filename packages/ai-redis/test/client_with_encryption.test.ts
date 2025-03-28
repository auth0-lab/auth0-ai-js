import { Redis } from "ioredis";
import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisStore } from "../src/index";

vi.mock("ioredis");
describe("RedisStore (encryption enabled)", () => {
  let mockRedis: Redis;
  let redisStore: RedisStore;
  const encryptionKey = "my-secret-key";

  beforeEach(() => {
    mockRedis = new Redis() as unknown as Redis;
    vi.clearAllMocks();
    redisStore = new RedisStore({
      client: mockRedis,
      encryption: { key: encryptionKey },
    });
  });

  it("should store a value with encryption", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };

    const setSpy = vi.spyOn(mockRedis, "set").mockResolvedValue("OK");

    await redisStore.put(namespace, key, value);

    expect(setSpy).toHaveBeenCalledWith(
      expect.stringContaining("test:key1"),
      expect.stringMatching(/^[a-f0-9]+:[a-f0-9]+$/) // Matches IV and encrypted value
    );
  });

  it("should retrieve a value with decryption", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };

    const encryptedValue = (() => {
      const iv = crypto.randomBytes(16).toString("hex");
      const keyBuffer = crypto
        .createHash("sha256")
        .update(encryptionKey)
        .digest();
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        keyBuffer,
        Buffer.from(iv, "hex")
      );
      let encrypted = cipher.update(JSON.stringify(value), "utf8", "hex");
      encrypted += cipher.final("hex");
      return `${iv}:${encrypted}`;
    })();

    vi.spyOn(mockRedis, "get").mockResolvedValue(encryptedValue);

    const result = await redisStore.get(namespace, key);

    expect(result).toEqual(value);
  });

  it("should throw an error if decryption fails", async () => {
    const namespace = ["test"];
    const key = "key1";

    vi.spyOn(mockRedis, "get").mockResolvedValue("invalid:encryptedValue");

    await expect(redisStore.get(namespace, key)).rejects.toThrow();
  });

  it("should store a value with encryption and expiration time", async () => {
    const namespace = ["test"];
    const key = "key1";
    const value = { foo: "bar" };
    const expiresIn = 60000;

    const setSpy = vi.spyOn(mockRedis, "set").mockResolvedValue("OK");

    await redisStore.put(namespace, key, value, { expiresIn });

    expect(setSpy).toHaveBeenCalledWith(
      expect.stringContaining("test:key1"),
      expect.stringMatching(/^[a-f0-9]+:[a-f0-9]+$/),
      "EX",
      expiresIn / 1000
    );
  });
});
