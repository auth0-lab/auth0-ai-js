import {
  DeviceAuthorizationResponse,
  discovery,
  initiateDeviceAuthorization,
} from "openid-client";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { ContextGetter } from "../src/authorizers/context";
import {
  DeviceAuthorizerBase,
  DeviceAuthorizerParams,
  getDeviceAuthorizerCredentials,
} from "../src/authorizers/device-authorizer";
import { TokenSet } from "../src/credentials";
import { DeviceInterrupts } from "../src/interrupts";

vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  initiateDeviceAuthorization: vi.fn(),
}));

vi.stubGlobal("fetch", vi.fn());

describe("DeviceAuthorizerBase", () => {
  let authorizer: DeviceAuthorizerBase<[string]>;
  const contextGetter: ContextGetter<[string]> = vi.fn();
  const mockParams: DeviceAuthorizerParams<[string]> = {
    scopes: ["read:users"],
    audience: "foobar",
    store: {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    (discovery as Mock).mockReturnValue({
      configuration: "1234",
    });
    (contextGetter as Mock).mockReturnValue({
      threadID: "test-thread-id",
      toolCallID: "test-tool-call-id",
      toolName: "test-tool-name",
    });
    authorizer = new DeviceAuthorizerBase<string[]>(
      {
        domain: "test.auth0.com",
        clientId: "test-client",
      },
      mockParams
    );
  });

  describe("constructor", () => {
    it("should initialize with explicit params", () => {
      const auth = new DeviceAuthorizerBase(
        {
          domain: "custom.auth0.com",
          clientId: "custom-client",
        },
        mockParams
      );
      expect(auth).toBeInstanceOf(DeviceAuthorizerBase);
    });

    it("should fallback to environment variables", () => {
      process.env.AUTH0_DOMAIN = "env.auth0.com";
      process.env.AUTH0_CLIENT_ID = "env-client";
      const auth = new DeviceAuthorizerBase({}, mockParams);
      expect(auth).toBeInstanceOf(DeviceAuthorizerBase);
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
    const startResponse: DeviceAuthorizationResponse = {
      device_code: "test-id",
      user_code: "test-user-code",
      verification_uri: "test-verification-uri",
      verification_uri_complete: "test-verification-uri-complete",
      expires_in: 3600,
      interval: 5,
    };
    const execute = vi.fn();
    let err: Error;
    beforeEach(async () => {
      (initiateDeviceAuthorization as Mock).mockResolvedValue(startResponse);
      (fetch as Mock).mockResolvedValue({
        ok: false,
        headers: new Map([["content-type", ["application/json"]]]),
        json: () =>
          Promise.resolve({
            error: "authorization_pending",
            error_description: "The authorization request is still pending",
          }),
      });
      try {
        await authorizer.protect(contextGetter, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should start the backchannel authorization", async () => {
      expect(initiateDeviceAuthorization).toHaveBeenCalled();
    });

    it("should store the authorization response", async () => {
      expect(mockParams.store.put).toHaveBeenCalledOnce();
      expect((mockParams.store.put as Mock).mock.calls[0]).toEqual([
        [
          //The instance id
          expect.any(String),
          "AuthResponses",
          "Threads",
          "test-thread-id",
          "Tools",
          "test-tool-name",
          "ToolCalls",
          "test-tool-call-id",
        ],
        "authResponse",
        {
          deviceCode: "test-id",
          expiresIn: 3600,
          requestedAt: expect.any(Number),
          interval: 5,
          userCode: "test-user-code",
          verificationUri: "test-verification-uri",
          verificationUriComplete: "test-verification-uri-complete",
        },
        {
          expiresIn: 3600000,
        },
      ]);
    });

    it('should throw "AuthorizationPendingInterrupt" error', async () => {
      expect(err).toBeInstanceOf(
        DeviceInterrupts.AuthorizationPendingInterrupt
      );
    });
  });

  /**
   * During the succesive calls, and before the request is expired
   * and the user taken an action
   *
   * As the request is still pending the protected function will throw an
   * AuthorizationPendingInterrupt error.
   */
  describe("authorization pending", () => {
    const execute = vi.fn();
    let err: Error;

    beforeEach(async () => {
      (mockParams.store.get as Mock).mockImplementation((ns, key) =>
        key === "authResponse"
          ? {
              deviceCode: "test-id",
              expiresIn: 3600,
              interval: 5,
              userCode: "test-user-code",
              verificationUri: "test-verification-uri",
              verificationUriComplete: "test-verification-uri-complete",
            }
          : undefined
      );
      (fetch as Mock).mockResolvedValue({
        ok: false,
        headers: new Map([["content-type", ["application/json"]]]),
        json: () =>
          Promise.resolve({
            error: "authorization_pending",
            error_description: "The authorization request is still pending",
          }),
      });
      try {
        await authorizer.protect(contextGetter, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should not initiate the device authorization flow", async () => {
      expect(initiateDeviceAuthorization).not.toHaveBeenCalled();
    });

    it("should not store the authorization response", async () => {
      expect(mockParams.store.put).not.toHaveBeenCalledOnce();
    });

    it('should throw "AuthorizationPendingInterrupt" error', async () => {
      expect(err).toBeInstanceOf(
        DeviceInterrupts.AuthorizationPendingInterrupt
      );
    });
  });

  /**
   * Once the request is approved the oauth/token call
   * should return the token.
   *
   * The protected function should be executed allowing the tool
   * to access the credentials
   */
  describe("authorization approved", () => {
    const execute = vi.fn();
    let err: Error;
    let credentials: TokenSet | undefined;

    beforeEach(async () => {
      (mockParams.store.get as Mock).mockImplementation((ns, key) =>
        key === "authResponse"
          ? {
              deviceCode: "test-id",
              expiresIn: 3600,
              interval: 5,
              userCode: "test-user-code",
              verificationUri: "test-verification-uri",
              verificationUriComplete: "test-verification-uri-complete",
            }
          : undefined
      );
      (fetch as Mock).mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", ["application/json"]]]),
        json: () =>
          Promise.resolve({
            scope: "read:users",
            access_token: "test-access-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
      });
      try {
        execute.mockImplementation(() => {
          credentials = getDeviceAuthorizerCredentials();
        });
        await authorizer.protect(contextGetter, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should not initiate the device authorization flow", async () => {
      expect(initiateDeviceAuthorization).not.toHaveBeenCalled();
    });

    it("should clear the auth response from the store", async () => {
      expect(mockParams.store.delete).toHaveBeenCalledOnce();
      expect((mockParams.store.delete as Mock).mock.calls[0]).toEqual([
        [
          expect.any(String),
          "AuthResponses",
          "Threads",
          "test-thread-id",
          "Tools",
          "test-tool-name",
          "ToolCalls",
          "test-tool-call-id",
        ],
        "authResponse",
      ]);
    });

    it("should store the credentials in the store", async () => {
      expect(mockParams.store.put).toHaveBeenCalledOnce();
      expect((mockParams.store.put as Mock).mock.calls[0]).toEqual([
        [expect.any(String), "Credentials", "Threads", "test-thread-id"],
        "credential",
        {
          accessToken: "test-access-token",
          expiresIn: 3600,
          idToken: undefined,
          refreshToken: undefined,
          scopes: ["read:users"],
          tokenType: "Bearer",
        },
        {
          expiresIn: 3600000,
        },
      ]);
    });

    it("should not interrupt error", async () => {
      expect(err).toBeUndefined();
    });

    it("should execute the protected function", async () => {
      expect(execute).toHaveBeenCalled();
    });

    it("should pass the credentials to the protected function", async () => {
      expect(credentials).toMatchInlineSnapshot(`
        {
          "accessToken": "test-access-token",
          "expiresIn": 3600,
          "idToken": undefined,
          "refreshToken": undefined,
          "scopes": [
            "read:users",
          ],
          "tokenType": "Bearer",
        }
      `);
    });
  });

  /**
   * Once the request is approved the oauth/token call
   * should return the token.
   *
   * The protected function should be executed allowing the tool
   * to access the credentials.
   *
   * If using a credential store the creds should be stored.
   */
  describe("when credentials already stored in the credentialsStore", () => {
    const execute = vi.fn();
    let err: Error;
    let credentials: TokenSet | undefined;

    beforeEach(async () => {
      (mockParams.store.get as Mock).mockImplementation((ns, key) =>
        key === "credential"
          ? {
              accessToken: {
                type: "Bearer",
                value: "test-access-token",
              },
              expires_in: 3600,
              scope: "read:users",
            }
          : undefined
      );

      try {
        execute.mockImplementation(() => {
          credentials = getDeviceAuthorizerCredentials();
        });
        await authorizer.protect(contextGetter, execute)("test-context");
      } catch (er) {
        err = er as Error;
      }
    });

    it("should not initiate the device authorization flow", async () => {
      expect(initiateDeviceAuthorization).not.toHaveBeenCalled();
    });

    it("should not clear the auth response from the store", async () => {
      expect(mockParams.store.delete).not.toHaveBeenCalledOnce();
    });

    it("should not interrupt error", async () => {
      expect(err).toBeUndefined();
    });

    it("should execute the protected function", async () => {
      expect(execute).toHaveBeenCalled();
    });

    it("should not trigger any put in the store", async () => {
      expect(mockParams.store.put).not.toHaveBeenCalled();
    });

    it("should pass the credentials to the protected function", async () => {
      expect(credentials).toMatchInlineSnapshot(`
        {
          "accessToken": {
            "type": "Bearer",
            "value": "test-access-token",
          },
          "expires_in": 3600,
          "scope": "read:users",
        }
      `);
    });
  });
});
