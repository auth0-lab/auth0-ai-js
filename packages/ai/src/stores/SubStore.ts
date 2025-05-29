import { Store } from "./Store";

type StoreOrFactory<T> = Store<T> | (() => Store<T>);

/**
 * Parameters for configuring a SubStore.
 * @template T The type of values to be stored in the SubStore.
 * @property {string[]} [baseNamespace] - An optional base namespace for the SubStore, used to organize keys in a hierarchical structure.
 * @property {(value: T) => number | undefined} [getTTL] - An optional function that returns the expiry time for a value in milliseconds since epoch, or undefined if the value doesn't expire.
 */
type SubStoreParams<T> = {
  baseNamespace?: string[];
  getTTL?: (value: T) => number | undefined;
};

/**
 * A store implementation that delegates operations to a parent store with optional namespace prefixing.
 *
 * @template T - The type of values stored in this SubStore
 * @implements {Store<T>}
 */
export class SubStore<T = any> implements Store<T> {
  constructor(
    private readonly parent: StoreOrFactory<any>,
    private readonly options: SubStoreParams<T> = {}
  ) {
    if (typeof parent === "undefined") {
      throw new Error("Parent store is required");
    }
  }

  private getFullNamespace(namespace: string[]) {
    if (this.options.baseNamespace) {
      return [...this.options.baseNamespace, ...namespace];
    }
    return namespace;
  }

  private getParentStore() {
    return typeof this.parent === "function" ? this.parent() : this.parent;
  }

  get(namespace: string[], key: string) {
    return this.getParentStore().get(this.getFullNamespace(namespace), key);
  }

  delete(namespace: string[], key: string) {
    return this.getParentStore().delete(this.getFullNamespace(namespace), key);
  }

  put(
    namespace: string[],
    key: string,
    value: T,
    options?: { expiresIn?: number }
  ): Promise<void> {
    const expiresIn = options?.expiresIn
      ? options.expiresIn
      : this.options.getTTL
        ? this.options.getTTL(value)
        : undefined;

    const fullNS = this.getFullNamespace(namespace);

    return this.getParentStore().put(fullNS, key, value, {
      expiresIn,
    });
  }

  createSubStore<TNew>(options: string | string[] | SubStoreParams<TNew> = {}) {
    if (typeof options === "string") {
      options = { baseNamespace: [options] };
    } else if (Array.isArray(options)) {
      options = { baseNamespace: options };
    }
    return new SubStore<TNew>(this, options);
  }
}
