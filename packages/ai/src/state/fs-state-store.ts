import { readFile, writeFile } from "node:fs/promises";

export class FSStateStore {
  path;

  constructor(path) {
    this.path = path;
  }

  async get(stateId) {
    const data = await readFile(`${stateId}.json`, { encoding: "utf8" });
    return JSON.parse(data);
  }

  async save(stateId, stateData) {
    return writeFile(`${stateId}.json`, JSON.stringify(stateData), {
      encoding: "utf8",
    });
  }
}
