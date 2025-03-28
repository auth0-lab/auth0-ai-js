import { TempBox } from "tempbox";

import { Store } from "../Store";

export class TempBoxStore<T = any> implements Store<T> {
  protected constructor(private readonly store: TempBox) {}

  private getKey(namespace: string[], key: string) {
    return namespace.join("/") + "/" + key;
  }

  async get(namespace: string[], key: string) {
    return this.store.get(this.getKey(namespace, key));
  }

  async delete(namespace: string[], key: string) {
    this.store.delete(this.getKey(namespace, key));
  }

  async put(
    namespace: string[],
    key: string,
    value: T,
    options?: { expiresIn?: number }
  ) {
    this.store.set(this.getKey(namespace, key), value, options?.expiresIn);
  }
}
