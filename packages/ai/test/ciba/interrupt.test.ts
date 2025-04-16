import { describe, expect, it } from "vitest";

import {
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  CIBAInterrupt,
} from "../../src/interrupts/CIBAInterrupts";

describe("CIBA Interrupts", () => {
  it("isInterrupt should properly work", () => {
    const interrupt = new AuthorizationPendingInterrupt("test", {
      id: "123",
      requestedAt: Date.now(),
      expiresIn: Date.now() + 1000,
      interval: 300,
    });
    expect(CIBAInterrupt.isInterrupt(interrupt)).toBe(true);
    expect(AuthorizationPendingInterrupt.isInterrupt(interrupt)).toBe(true);
    expect(AuthorizationPollingInterrupt.isInterrupt(interrupt)).toBe(false);
  });
});
