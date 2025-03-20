/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CIBAAuthorizationRequest } from "@auth0/ai/CIBA";
import { CIBAInterrupt } from "@auth0/ai/interrupts";

import type { Client, Thread } from "@langchain/langgraph-sdk";

type WatchedThread = {
  // The thread ID to watch.
  id: string;

  assistantID: string;

  // The interruption ID to watch.
  interruptionID: string;

  // The authorization request to watch.
  authRequest: CIBAAuthorizationRequest;

  config: Record<string, any>;

  lastRun?: number;
};

export class GraphResumer {
  private map: Map<string, WatchedThread> = new Map();
  private interval: NodeJS.Timeout | undefined = undefined;
  private langGraph: Client;

  constructor(langGraph: Client) {
    this.langGraph = langGraph;
  }

  private async getAllInterruptedThreads() {
    const interruptedThreads: Thread[] = [];
    let offset = 0;
    while (true) {
      const page = await this.langGraph.threads.search({
        status: "interrupted",
        limit: 100,
        offset,
      });
      if (page.length === 0) break;
      const cibaInterrupted = page.filter((t) => {
        const interrupt = this.getFirstInterrupt(t);
        if (!interrupt) return false;
        return (
          CIBAInterrupt.isInterrupt(interrupt.value) &&
          CIBAInterrupt.hasRequestData(interrupt.value)
        );
      });
      interruptedThreads.push(...cibaInterrupted);
      offset += page.length;
    }
    return interruptedThreads;
  }

  private getFirstInterrupt(thread: Thread) {
    const { interrupts } = thread;
    const interrupt =
      interrupts &&
      Object.values(interrupts).length > 0 &&
      Object.values(interrupts)[0].length > 0
        ? Object.values(interrupts)[0][0]
        : undefined;
    return interrupt;
  }

  private getHashMapID(thread: Thread) {
    const { interrupts } = thread;
    return `${thread.thread_id}:${Object.keys(interrupts)[0]}`;
  }

  async loop() {
    const allThreads = await this.getAllInterruptedThreads();

    //Remove old interrupted threads
    Array.from(this.map.keys())
      .filter((k) => !allThreads.find((t) => this.getHashMapID(t) === k))
      .forEach((k) => this.map.delete(k));

    //Add new interrupted threads
    for (const thread of allThreads) {
      const interrupt = this.getFirstInterrupt(thread);
      if (
        !interrupt ||
        !CIBAInterrupt.isInterrupt(interrupt.value) ||
        !CIBAInterrupt.hasRequestData(interrupt.value)
      ) {
        continue;
      }
      const key = this.getHashMapID(thread);
      let watchedThread = this.map.get(key);
      if (!watchedThread) {
        watchedThread = {
          id: thread.thread_id,
          assistantID: thread.metadata?.graph_id as string,
          // @ts-expect-error
          config: thread.config as Record<string, any>,
          interruptionID: Object.keys(thread.interrupts)[0],
          authRequest: interrupt.value.request,
        };
        this.map.set(key, watchedThread);
        continue;
      }
    }

    const threadsToResume = Array.from(this.map.values()).filter(
      (t) =>
        !t.lastRun || t.lastRun + t.authRequest.interval * 1000 < Date.now()
    );

    await Promise.all(
      threadsToResume.map(async (t) => {
        //Note: It doesn't make sense to poll AUTH0
        // here because we need the graph to fail if the
        // user has rejected the request.
        console.log(`Resuming thread ${t.id}`);
        await this.langGraph.runs.wait(t.id, t.assistantID, {
          input: undefined,
          config: t.config,
        });
        t.lastRun = Date.now();
      })
    );
  }

  public start(): void {
    this.interval = setInterval(() => {
      this.loop();
    }, 5000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
