/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Tool, ToolExecutionOptions } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  AuthorizationPending,
  AuthorizationRequestExpiredError,
} from "@auth0/ai";
import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { CIBAuthorizationError } from "../src/CIBA";
import { CIBAAuthorizer } from "../src/CIBA/CIBAAuthorizer";

describe("CIBAAuthorizer", () => {
  let authorizer: CIBAAuthorizer;
  let mockTool: Tool;
  let protectedTool: Tool;
  const authorizerParameters = {
    userID: (params: { userID: string }) => params.userID,
    bindingMessage: "Confirm the purchase",
    scope: "openid stock:trade",
    audience: "http://localhost:8081",
    getAuthorizationResponse: vi.fn(),
    storeAuthorizationResponse: vi.fn(),
  };

  beforeEach(() => {
    authorizer = new CIBAAuthorizer(
      {
        clientId: "client-id",
        clientSecret: "client",
        domain: "test",
      },
      authorizerParameters
    );

    mockTool = {
      description: "A mock tool for testing",
      parameters: z.object({
        userID: z.string(),
        input: z.string(),
      }),
      execute: vi.fn().mockResolvedValue({ result: "success" }),
    };

    protectedTool = authorizer.authorizer()(mockTool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("on authorization pending error", () => {
    let error: CIBAuthorizationError;
    beforeEach(async () => {
      authorizerParameters.getAuthorizationResponse.mockResolvedValue({
        status: "pending",
      });

      vi.spyOn(
        CIBAAuthorizerBase.prototype,
        //@ts-ignore
        "getCredentials"
      ).mockImplementation(() => {
        throw new AuthorizationPending("Authorization pending");
      });

      try {
        await protectedTool!.execute!(
          { userID: "user1", input: "input" },
          {} as ToolExecutionOptions
        );
      } catch (err) {
        error = err as CIBAuthorizationError;
      }
    });

    it("should throw a final error", () => {
      expect(error).toBeInstanceOf(CIBAuthorizationError);
      expect(error.isFinal).toBe(false);
    });

    it("should not call the tool execute method", () => {
      expect(mockTool.execute).not.toHaveBeenCalled();
    });
  });

  describe("on authorization request expired error", () => {
    let error: CIBAuthorizationError;
    beforeEach(async () => {
      authorizerParameters.getAuthorizationResponse.mockResolvedValue({
        status: "pending",
      });

      vi.spyOn(
        CIBAAuthorizerBase.prototype,
        //@ts-ignore
        "getCredentials"
      ).mockImplementation(() => {
        throw new AuthorizationRequestExpiredError("Authorization pending");
      });

      try {
        await protectedTool!.execute!(
          { userID: "user1", input: "input" },
          {} as ToolExecutionOptions
        );
      } catch (err) {
        error = err as CIBAuthorizationError;
      }
    });

    it("should throw a non final error", () => {
      expect(error).toBeInstanceOf(CIBAuthorizationError);
      expect(error.isFinal).toBe(true);
    });

    it("should not call the tool execute method", () => {
      expect(mockTool.execute).not.toHaveBeenCalled();
    });
  });

  describe("on completed authorization request", () => {
    let error: CIBAuthorizationError;
    beforeEach(async () => {
      authorizerParameters.getAuthorizationResponse.mockResolvedValue({
        status: "pending",
      });

      vi.spyOn(
        CIBAAuthorizerBase.prototype,
        //@ts-ignore
        "getCredentials"
        //@ts-ignore
      ).mockImplementation(() => {
        return {
          accessToken: {
            type: "bearer",
            value: "foobr",
          },
        };
      });

      try {
        await protectedTool!.execute!(
          { userID: "user1", input: "input" },
          {} as ToolExecutionOptions
        );
      } catch (err) {
        error = err as CIBAuthorizationError;
      }
    });

    it("should not throw an error", () => {
      expect(error).toBeUndefined();
    });

    it("should call the tool execute method", () => {
      expect(mockTool.execute).toHaveBeenCalledOnce();
    });
  });
});
