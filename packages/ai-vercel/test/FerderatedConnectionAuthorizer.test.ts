/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Tool, ToolExecutionOptions } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";

import {
  FederatedConnectionAuthorizer,
  getAccessTokenForConnection,
} from "../src/FederatedConnections";

describe("FederatedConnectionAuthorizer", () => {
  const mockTool = {
    description: "A mock tool for testing",
    parameters: z.object({
      userID: z.string(),
      input: z.string(),
    }),
    execute: vi.fn().mockResolvedValue({ result: "success" }),
  };
  const authorizerParameters = {
    connection: "test-connection",
    scopes: ["test-scope"],
    refreshToken: vi.fn(),
  };
  let authorizer: FederatedConnectionAuthorizer;
  let protectedTool: Tool;

  beforeEach(() => {
    authorizer = new FederatedConnectionAuthorizer(
      {
        clientId: "client-id",
        clientSecret: "client",
        domain: "test",
      },
      authorizerParameters
    );

    protectedTool = authorizer.authorizer()(mockTool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("on FederatedConnectionInterrupt error", () => {
    let error: FederatedConnectionInterrupt;
    beforeEach(async () => {
      vi.spyOn(
        FederatedConnectionAuthorizerBase.prototype,
        //@ts-ignore
        "getAccessToken"
      ).mockImplementation(() => {
        throw new FederatedConnectionInterrupt(
          "Authorization required",
          "test",
          ["test"],
          ["test"]
        );
      });

      try {
        await protectedTool!.execute!(
          { userID: "user1", input: "input" },
          {} as ToolExecutionOptions
        );
      } catch (err) {
        error = err as FederatedConnectionInterrupt;
      }
    });

    it("should throw a federated connection error", () => {
      expect(error).toBeInstanceOf(FederatedConnectionInterrupt);
    });

    it("should not call the tool execute", () => {
      expect(mockTool.execute).not.toHaveBeenCalled();
    });
  });

  describe("on authorization success", () => {
    let error: FederatedConnectionInterrupt;
    let accessToken: string | undefined;

    beforeEach(async () => {
      vi.spyOn(
        FederatedConnectionAuthorizerBase.prototype,
        //@ts-ignore
        "getAccessToken"
        //@ts-ignore
      ).mockImplementation(() => {
        return {
          access_token: "access_token",
          scope: "test-scope",
        };
      });

      try {
        mockTool.execute.mockImplementation(() => {
          accessToken = getAccessTokenForConnection();
          return { result: "success" };
        });
        await protectedTool!.execute!(
          { userID: "user1", input: "input" },
          {} as ToolExecutionOptions
        );
      } catch (err) {
        error = err as FederatedConnectionInterrupt;
      }
    });

    it("should not throw any error", () => {
      expect(error).toBeUndefined();
    });

    it("should call the tool execute", () => {
      expect(mockTool.execute).toHaveBeenCalled();
    });

    it("should be able to retrieve the token from within the tool", () => {
      expect(accessToken).toBe("access_token");
    });
  });
});
