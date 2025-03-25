import fs from "fs/promises";
import path from "path";
import { TempBox } from "tempbox";

import { TempBoxStore } from "./TempBoxStore";

type StoredEntry = {
  value: any;
  expiresAt: number | null;
};

export class PersistentTempBox extends TempBox {
  private filepath: string;
  private _pendingWriteTimeout: NodeJS.Timeout | null = null;
  private _debounceMs: number;

  constructor(filepath: string, debounceMs = 100) {
    const absPath = path.resolve(filepath);
    super({
      onSet: () => this._debouncedPersist(),
      onDelete: () => this._debouncedPersist(),
      onClear: () => this._debouncedPersist(),
      onExpire: () => this._debouncedPersist(),
    });
    this.filepath = absPath;
    this._debounceMs = debounceMs;
    this._load();
  }

  private async _load() {
    try {
      const raw = await fs.readFile(this.filepath, "utf-8");
      const parsed: Record<string, StoredEntry> = JSON.parse(raw);

      for (const [key, { value, expiresAt }] of Object.entries(parsed)) {
        const ttl = expiresAt ? Math.max(0, expiresAt - Date.now()) : undefined;
        if (ttl === undefined || ttl > 0) {
          this.set(key, value, ttl);
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Failed to load persisted store:`, err);
      }
    }
  }

  private _debouncedPersist() {
    if (this._pendingWriteTimeout) {
      clearTimeout(this._pendingWriteTimeout);
    }

    this._pendingWriteTimeout = setTimeout(() => {
      this._persist();
    }, this._debounceMs);
  }

  private async _persist() {
    const entries: Record<string, StoredEntry> = {};
    for (const [key, { value, expiresAt }] of this["data"].entries()) {
      if (!expiresAt || expiresAt > Date.now()) {
        entries[key] = { value, expiresAt };
      }
    }

    try {
      await this._ensureDirectory();
      await fs.writeFile(
        this.filepath,
        JSON.stringify(entries, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error(`Failed to persist store to disk:`, err);
    }
  }

  private async _ensureDirectory() {
    const dir = path.dirname(this.filepath);
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * An unsafe filesystem store for dev/demo purposes.
 */
export class FSStore<T = any> extends TempBoxStore<T> {
  constructor(filepath: string) {
    super(new PersistentTempBox(filepath));
  }
}
