import { AuthenticationClient } from "auth0";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CIBAAuthorizer,
  CibaAuthorizerOptions,
} from "../src/authorizers/ciba-authorizer";
import { AccessDeniedError } from "../src/errors/authorizationerror";

vi.mock("auth0");

describe("CIBAAuthorizer", () => {
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

  it("should create an instance of CIBAAuthorizer", () => {
    const authorizer = CIBAAuthorizer.create();
    expect(authorizer).toBeInstanceOf(Function);
  });

  it("should authorize and return credentials", async () => {
    const options: CibaAuthorizerOptions = {
      userId: "test-user",
      binding_message: "test-message",
      scope: "openid",
    };

    const mockAuthorizeResponse = {
      auth_req_id: "test-auth-req-id",
      interval: 1,
    };

    const mockGrantResponse = {
      access_token: "test-access-token",
      token_type: "bearer",
    };

    mockAuth0.backchannel.authorize.mockResolvedValue(mockAuthorizeResponse);
    mockAuth0.backchannel.backchannelGrant.mockResolvedValue(mockGrantResponse);

    const authorizer = CIBAAuthorizer.create();
    const handler = vi.fn().mockResolvedValue("handler-response");

    const cibaHandler = authorizer(options)(handler);
    const result = await cibaHandler({});

    expect(result).toEqual("handler-response");
    expect(handler).toHaveBeenCalledWith(
      { accessToken: "test-access-token", claims: {} },
      {},
      undefined
    );
  });

  it("should handle access denied error", async () => {
    const options: CibaAuthorizerOptions = {
      userId: "test-user",
      binding_message: "test-message",
      scope: "openid",
    };

    const mockAuthorizeResponse = {
      auth_req_id: "test-auth-req-id",
      interval: 1,
    };

    mockAuth0.backchannel.authorize.mockResolvedValue(mockAuthorizeResponse);
    mockAuth0.backchannel.backchannelGrant.mockRejectedValue({
      error: "access_denied",
      error_description: "Access denied",
    });

    const authorizer = CIBAAuthorizer.create();
    const handler = vi.fn();

    const cibaHandler = authorizer(options)(handler);

    await expect(cibaHandler({})).rejects.toThrow(AccessDeniedError);
  });

  it("should call authorize with function parameters", async () => {
    const options: CibaAuthorizerOptions = {
      userId: async () => "dynamic-user-id",
      binding_message: async () => "dynamic-message",
      scope: "openid",
    };

    const mockAuthorizeResponse = {
      auth_req_id: "test-auth-req-id",
      interval: 1,
    };

    const mockGrantResponse = {
      access_token: "test-access-token",
      token_type: "bearer",
    };

    mockAuth0.backchannel.authorize.mockResolvedValue(mockAuthorizeResponse);
    mockAuth0.backchannel.backchannelGrant.mockResolvedValue(mockGrantResponse);

    const authorizer = CIBAAuthorizer.create();
    const handler = vi.fn().mockResolvedValue("handler-response");
    const input = { foo: "bar" };

    const cibaHandler = authorizer(options)(handler);
    await cibaHandler(input);

    expect(mockAuth0.backchannel.authorize).toHaveBeenCalledWith({
      scope: "openid",
      binding_message: "dynamic-message",
      userId: "dynamic-user-id",
      audience: undefined,
      request_expiry: undefined,
      subjectIssuerContext: undefined,
    });
  });
});
