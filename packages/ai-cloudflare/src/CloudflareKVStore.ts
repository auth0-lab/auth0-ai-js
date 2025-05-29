import { Store } from "@auth0/ai/stores";

export interface KVNamespace {
  get(
    key: string,
    options?: { type?: string; cacheTtl?: number }
  ): Promise<any>;
  put(
    key: string,
    value: any,
    options?: { expiration?: number; expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CloudflareKVStoreOptions {
  /**
   * KV namespace binding to use for storage
   */
  kv: KVNamespace;

  /**
   * Session prefix in KV store (default: 'auth0-ai')
   */
  prefix?: string;
}

/**
 * Auth0AI Store implementation using Cloudflare KV Namespaces
 */
export class CloudflareKVStore<T = any> implements Store<T> {
  private kv: KVNamespace;
  private prefix: string;

  /**
   * Creates a new KV Auth0AI store
   */
  constructor(options: CloudflareKVStoreOptions) {
    this.kv = options.kv;
    this.prefix = options.prefix || "auth0-ai";
  }

  private getKey(namespace: string[], key: string): string {
    return `${this.prefix}:${namespace.join(":")}:${key}`;
  }

  get(namespace: string[], key: string): Promise<any> {
    return this.kv.get(this.getKey(namespace, key), { type: "json" });
  }

  delete(namespace: string[], key: string): Promise<void> {
    const fullKey = this.getKey(namespace, key);
    return this.kv.delete(fullKey);
  }

  put(
    namespace: string[],
    key: string,
    value: any,
    options?: { expiresIn?: number }
  ): Promise<void> {
    const fullKey = this.getKey(namespace, key);
    if (options?.expiresIn) {
      const expiration =
        Math.floor(Date.now() / 1000) + options.expiresIn / 1000;
      return this.kv.put(fullKey, JSON.stringify(value), {
        expiration,
      });
    }
    return this.kv.put(fullKey, JSON.stringify(value));
  }
}
