import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  asyncLocalStorage,
  FederatedConnectionAuthorizerBase,
} from "../src/authorizers/federated-connections";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("FederatedConnectionAuthorizerBase", () => {
  let authorizer: FederatedConnectionAuthorizerBase<[string]>;
  const mockParams = {
    connection: "test-connection",
    scopes: ["read:calendar"],
    refreshToken: vi.fn().mockResolvedValue("test-refresh-token"),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    authorizer = new FederatedConnectionAuthorizerBase<[string]>(
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
      const auth = new FederatedConnectionAuthorizerBase<[string]>(
        {
          domain: "custom.auth0.com",
          clientId: "custom-client",
          clientSecret: "custom-secret",
        },
        mockParams
      );
      expect(auth).toBeInstanceOf(FederatedConnectionAuthorizerBase<[string]>);
    });
  });

  /**
   * If the refresh token can't be exchanged for an access token,
   * the authorizer should throw an error.
   *
   */
  describe("on exchange failure", () => {
    const execute = vi.fn();
    let err: Error;
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Unauthorized" }),
      });

      try {
        await authorizer.protect(() => {}, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it('should throw "Authorization required" error', async () => {
      expect(err.message).toMatch(
        /Authorization required to access the Federated Connection/gi
      );
    });

    it("should not call the protected execute method", async () => {
      expect(execute).not.toHaveBeenCalled();
    });
  });

  /**
   * When the refresh token is exchanged for an access token with insufficient scopes
   * the authorizer should throw an error.
   */
  describe("on insufficient scopes", () => {
    const execute = vi.fn();
    let err: Error;
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          scope: "read:profile read:foobar",
          access_token: "test",
        }),
      });

      try {
        await authorizer.protect(() => {}, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it('should throw "Authorization required" error', async () => {
      expect(err.message).toMatchInlineSnapshot(
        `"Authorization required to access the Federated Connection: test-connection. Missing scopes: read:calendar"`
      );
    });

    it("should not call the protected execute method", async () => {
      expect(execute).not.toHaveBeenCalled();
    });
  });

  /**
   * When the refresh token is exchanged for an access token with proper scopes
   * the authorizer should not throw an error and call the underlying execute method.
   */
  describe("on succesful exchange", () => {
    const execute = vi.fn();
    let err: Error;
    let accessTokenFromAsyncLocalStore: string | undefined;

    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          scope: "read:profile read:calendar",
          access_token: "test",
        }),
      });
      execute.mockImplementation(() => {
        const store = asyncLocalStorage.getStore();
        accessTokenFromAsyncLocalStore = store?.accessToken;
      });
      try {
        await authorizer.protect(() => {}, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should not throw error", async () => {
      expect(err).toBeUndefined();
    });

    it("should not call the protected execute method", async () => {
      expect(execute).toHaveBeenCalled();
    });

    it("should store the access token in the async local storage", async () => {
      expect(accessTokenFromAsyncLocalStore).toBe("test");
    });

    it("should exchange the token properly", async () => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://test.auth0.com/oauth/token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body).toMatchInlineSnapshot(`
        {
          "client_id": "test-client",
          "client_secret": "test-secret",
          "connection": "test-connection",
          "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
          "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
          "subject_token": "test-refresh-token",
          "subject_token_type": "urn:ietf:params:oauth:token-type:refresh_token",
        }
      `);
    });
  });
});
