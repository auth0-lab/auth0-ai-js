import { Redis, RedisOptions } from "ioredis";
import * as crypto from "node:crypto";

import { Store } from "@auth0/ai/stores";

import { omit } from "./util";

type EncryptionOptions = {
  key?: crypto.BinaryLike;
  alg?: "aes-256-cbc" | "aes-192-cbc" | "aes-128-cbc";
};

type RedisStoreOptions =
  | Redis
  | (((RedisOptions & { client: never }) | { client?: Redis }) & {
      encryption?: EncryptionOptions;
    });

/**
 * A secure store for Auth0AI that uses Redis as a backend.
 */
export class RedisStore implements Store {
  private readonly encryptionKey?: crypto.BinaryLike;
  private readonly encryptionAlgorithm:
    | "aes-256-cbc"
    | "aes-192-cbc"
    | "aes-128-cbc" = "aes-256-cbc";

  private readonly redis: Redis;

  constructor(options?: RedisStoreOptions) {
    options = options ?? {};
    if (options instanceof Redis) {
      this.redis = options;
    } else if (
      typeof options.client === "object" &&
      options.client instanceof Redis
    ) {
      this.redis = options.client;
    } else {
      this.redis = new Redis(omit(options, ["client", "encryption"]));
    }

    if (!(options instanceof Redis) && options.encryption) {
      this.encryptionKey = options.encryption.key;
      this.encryptionAlgorithm =
        options.encryption.alg ?? this.encryptionAlgorithm;
    }
  }

  private _buildKey(namespace: string[], key: string): string {
    return `${namespace.join(":")}:${key}`;
  }

  private _encrypt(value: any): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key is not configured");
    }
    const iv = crypto.randomBytes(16); // Generate a random initialization vector
    const key = crypto.createHash("sha256").update(this.encryptionKey).digest(); // Derive a 256-bit key
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(value), "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`; // Store IV with the encrypted value
  }

  private _decrypt(value: string): any {
    if (!this.encryptionKey) {
      throw new Error("Encryption key is not configured");
    }
    const [ivHex, encryptedValue] = value.split(":"); // Extract IV and encrypted value
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.createHash("sha256").update(this.encryptionKey).digest(); // Derive a 256-bit key
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    let decrypted = decipher.update(encryptedValue, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }

  async get(namespace: string[], key: string): Promise<any> {
    const redisKey = this._buildKey(namespace, key);
    const value = await this.redis.get(redisKey);
    if (!value) return null;

    return this.encryptionKey ? this._decrypt(value) : JSON.parse(value);
  }

  async delete(namespace: string[], key: string): Promise<void> {
    const redisKey = this._buildKey(namespace, key);
    await this.redis.del(redisKey);
  }

  async put(
    namespace: string[],
    key: string,
    value: any,
    options?: { expiresIn?: number }
  ): Promise<void> {
    const redisKey = this._buildKey(namespace, key);
    const stringValue = this.encryptionKey
      ? this._encrypt(value)
      : JSON.stringify(value);

    if (options?.expiresIn) {
      const expiresInSecs = options.expiresIn / 1000;
      await this.redis.set(redisKey, stringValue, "EX", expiresInSecs);
    } else {
      await this.redis.set(redisKey, stringValue);
    }
  }
}
