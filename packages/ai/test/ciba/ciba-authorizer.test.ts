import { AuthenticationClient } from "auth0";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  asyncLocalStorage,
  CIBAAuthorizerBase,
} from "../../src/authorizers/ciba";
import { AuthorizationPendingInterrupt } from "../../src/interrupts";

vi.mock("auth0");

describe("CIBAAuthorizerBase", () => {
  let authorizer: CIBAAuthorizerBase<[string]>;
  const mockParams = {
    userID: "user123",
    bindingMessage: "test-binding",
    scopes: ["read:users"],
    getAuthorizationResponse: vi.fn(),
    storeAuthorizationResponse: vi.fn(),
  };

  const mockAuth0 = {
    backchannel: {
      authorize: vi.fn(),
      backchannelGrant: vi.fn(),
    },
  };

  beforeEach(() => {
    (AuthenticationClient as any).mockImplementation(() => mockAuth0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    authorizer = new CIBAAuthorizerBase(
      {
        domain: "test.auth0.com",
        clientId: "test-client",
        clientSecret: "test-secret",
      },
      mockParams
    );
  });

  describe("constructor", () => {
    it("should initialize with explicit params", () => {
      const auth = new CIBAAuthorizerBase(
        {
          domain: "custom.auth0.com",
          clientId: "custom-client",
          clientSecret: "custom-secret",
        },
        mockParams
      );
      expect(auth).toBeInstanceOf(CIBAAuthorizerBase);
    });

    it("should fallback to environment variables", () => {
      process.env.AUTH0_DOMAIN = "env.auth0.com";
      process.env.AUTH0_CLIENT_ID = "env-client";
      process.env.AUTH0_CLIENT_SECRET = "env-secret";

      const auth = new CIBAAuthorizerBase({}, mockParams);
      expect(auth).toBeInstanceOf(CIBAAuthorizerBase);
    });
  });

  /**
   * During the first execute call the getAuthorizationResponse should return undefined
   * and the backchannel.authorize should be called.
   *
   * As the request is still pending the protected function will throw an
   * AuthorizationPendingInterrupt error.
   */
  describe("first call", () => {
    const startResponse = {
      auth_req_id: "test-id",
      expires_in: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;

    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(undefined);
      mockAuth0.backchannel.authorize.mockResolvedValue(startResponse);
      mockAuth0.backchannel.backchannelGrant.mockImplementation(() => {
        throw { error: "authorization_pending" };
      });
      try {
        await authorizer.protect(() => {}, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should start the backchannel authorization", async () => {
      expect(mockAuth0.backchannel.authorize).toHaveBeenCalled();
    });

    it("should store the authorization response", async () => {
      expect(mockParams.storeAuthorizationResponse).toHaveBeenCalledWith(
        {
          id: startResponse.auth_req_id,
          requestedAt: expect.any(Number),
          expiresIn: startResponse.expires_in,
          interval: startResponse.interval,
        },
        "test-context"
      );
    });

    it('should throw "AuthorizationPendingInterrupt" error', async () => {
      expect(err).toBeInstanceOf(AuthorizationPendingInterrupt);
    });
  });

  /**
   * During the first execute call the getAuthorizationResponse should return undefined
   * and the backchannel.authorize should be called.
   *
   * As the request is still pending the protected function will throw an
   * AuthorizationPendingInterrupt error.
   */
  describe("first call", () => {
    const authorizeResponse = {
      auth_req_id: "test-id",
      expires_in: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;

    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(undefined);
      mockAuth0.backchannel.authorize.mockResolvedValue(authorizeResponse);
      mockAuth0.backchannel.backchannelGrant.mockImplementation(() => {
        throw { error: "authorization_pending" };
      });
      try {
        await authorizer.protect(() => {}, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should start the backchannel authorization", async () => {
      expect(mockAuth0.backchannel.authorize).toHaveBeenCalled();
    });

    it("should store the authorization response", async () => {
      expect(mockParams.storeAuthorizationResponse).toHaveBeenCalledWith(
        {
          id: authorizeResponse.auth_req_id,
          requestedAt: expect.any(Number),
          expiresIn: authorizeResponse.expires_in,
          interval: authorizeResponse.interval,
        },
        "test-context"
      );
    });

    it('should throw "AuthorizationPendingInterrupt" error', async () => {
      expect(err).toBeInstanceOf(AuthorizationPendingInterrupt);
    });

    it("should not execute the protected function", async () => {
      expect(execute).not.toHaveBeenCalled();
    });
  });

  /**
   * During sucesive calls, and before the request is expired and the user taken an action
   * the getAuthorizationResponse should return the stored response and the backchannelGrant
   * should be called throwing an authorization_pending error.
   *
   * As the request is still pending the protected function will throw an
   * AuthorizationPendingInterrupt error.
   */
  describe("pending request", () => {
    const storedAuthorizationResponse = {
      requestedAt: Date.now(),
      authReqId: "test-id",
      expiresIn: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;

    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(
        storedAuthorizationResponse
      );
      mockAuth0.backchannel.backchannelGrant.mockImplementation(() => {
        throw { error: "authorization_pending" };
      });
      try {
        await authorizer.protect((c) => c, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should not call the store function", async () => {
      expect(mockParams.storeAuthorizationResponse).not.toHaveBeenCalled();
    });

    it("should not start the backchannel authorization again", async () => {
      expect(mockAuth0.backchannel.authorize).not.toHaveBeenCalled();
    });

    it("should not execute the protected function", async () => {
      expect(execute).not.toHaveBeenCalled();
    });

    it("should get the request with the provided context", async () => {
      expect(mockParams.getAuthorizationResponse).toHaveBeenCalledWith(
        "test-context"
      );
    });

    it('should throw "AuthorizationPendingInterrupt" error', async () => {
      expect(err).toBeInstanceOf(AuthorizationPendingInterrupt);
    });
  });

  /**
   * Once the request is approved the getAuthorizationResponse should return the stored response
   * and the backchannelGrant should return the access token.
   *
   * The protected function should be executed.
   */
  describe("approved request", () => {
    const storedAuthorizationResponse = {
      requestedAt: Date.now(),
      authReqId: "test-id",
      expiresIn: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;
    let accessTokenFromAsyncLocalStore: string | undefined;

    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(
        storedAuthorizationResponse
      );
      mockAuth0.backchannel.backchannelGrant.mockResolvedValue({
        token_type: "bearer",
        access_token: "test-token",
      });
      execute.mockImplementation(() => {
        const store = asyncLocalStorage.getStore();
        accessTokenFromAsyncLocalStore = store?.credentials?.accessToken.value;
      });
      try {
        await authorizer.protect((c) => c, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should call the store function to delete the value", async () => {
      expect(mockParams.storeAuthorizationResponse).toHaveBeenCalledWith(
        undefined,
        "test-context"
      );
    });

    it('should store the "access_token" in the asyncLocalStorage', async () => {
      expect(accessTokenFromAsyncLocalStore).toEqual("test-token");
    });

    it("should not start the backchannel authorization again", async () => {
      expect(mockAuth0.backchannel.authorize).not.toHaveBeenCalled();
    });

    it("should execute the protected function", async () => {
      expect(execute).toHaveBeenCalledWith("test-context");
    });

    it("should get the request with the provided context", async () => {
      expect(mockParams.getAuthorizationResponse).toHaveBeenCalledWith(
        "test-context"
      );
    });

    it("should not throw any error", async () => {
      expect(err).toBeUndefined();
    });
  });

  /**
   * If the user rejects the request the getAuthorizationResponse should return the stored response
   * and the backchannelGrant should throw an access_denied error.
   *
   * The protected function should not be executed.
   */
  describe("rejected request", () => {
    const storedAuthorizationResponse = {
      requestedAt: Date.now(),
      authReqId: "test-id",
      expiresIn: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;
    let result: any;
    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(
        storedAuthorizationResponse
      );
      mockAuth0.backchannel.backchannelGrant.mockImplementation(() => {
        throw {
          error: "access_denied",
          error_description: "the user rejected the authorization request",
        };
      });
      try {
        result = await authorizer.protect((c) => c, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should call the store function to delete the value", async () => {
      expect(mockParams.storeAuthorizationResponse).toHaveBeenCalledWith(
        undefined,
        "test-context"
      );
    });

    it("should return the error", () => {
      expect(result.name).toEqual("AUTH0_AI_INTERRUPT");
      expect(result.code).toEqual("CIBA_ACCESS_DENIED");
      expect(result.message).toEqual(
        "the user rejected the authorization request"
      );
    });

    it("should not start the backchannel authorization again", async () => {
      expect(mockAuth0.backchannel.authorize).not.toHaveBeenCalled();
    });

    it("should not execute the protected function", async () => {
      expect(execute).not.toHaveBeenCalled();
    });

    it("should get the request with the provided context", async () => {
      expect(mockParams.getAuthorizationResponse).toHaveBeenCalledWith(
        "test-context"
      );
    });

    it("should not interrupt the graph", async () => {
      expect(err).toBeUndefined();
    });
  });

  /**
   * If the request expires  the protected function
   * should throw an AuthorizationRequestExpiredInterrupt.
   */
  describe("expired request", () => {
    const storedAuthorizationResponse = {
      requestedAt: Date.now() / 1000 - 3605,
      authReqId: "test-id",
      expiresIn: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;
    let result: any;
    beforeEach(async () => {
      mockParams.getAuthorizationResponse.mockResolvedValue(
        storedAuthorizationResponse
      );
      try {
        result = await authorizer.protect((c) => c, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should call the store function to delete the value", async () => {
      expect(mockParams.storeAuthorizationResponse).toHaveBeenCalledWith(
        undefined,
        "test-context"
      );
    });

    it("should return the error", () => {
      expect(result.name).toEqual("AUTH0_AI_INTERRUPT");
      expect(result.code).toEqual("CIBA_AUTHORIZATION_REQUEST_EXPIRED");
      expect(result.message).toEqual("The authorization request has expired.");
    });

    it("should not call the backchannel grant", async () => {
      expect(mockAuth0.backchannel.backchannelGrant).not.toHaveBeenCalled();
    });

    it("should not start the backchannel authorization again", async () => {
      expect(mockAuth0.backchannel.authorize).not.toHaveBeenCalled();
    });

    it("should not execute the protected function", async () => {
      expect(execute).not.toHaveBeenCalled();
    });

    it("should get the request with the provided context", async () => {
      expect(mockParams.getAuthorizationResponse).toHaveBeenCalledWith(
        "test-context"
      );
    });

    it('should throw "AccessDeniedInterrupt" error', async () => {
      expect(err).toBeUndefined();
    });
  });
});
