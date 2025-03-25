import { TempBox } from "tempbox";

import { TempBoxStore } from "./TempBoxStore";

/**
 * An in-memory store for dev/demo purposes.
 */
export class MemoryStore<T = any> extends TempBoxStore<T> {
  constructor() {
    super(new TempBox());
  }
}
