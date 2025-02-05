import * as jose from "jose";
import open from "open";
import {
  discovery,
  initiateDeviceAuthorization,
  pollDeviceAuthorizationGrant,
} from "openid-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToolWithAuthHandler } from "../src/authorizers";
import {
  DeviceAuthorizer,
  DeviceAuthorizerOptions,
} from "../src/authorizers/device-authorizer";

const mockPrompt = vi.fn();

vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  initiateDeviceAuthorization: vi.fn(),
  pollDeviceAuthorizationGrant: vi.fn(),
}));

vi.mock("enquirer", () => ({
  default: class {
    prompt = mockPrompt;
  },
}));

vi.mock("open", () => ({
  default: vi.fn(),
}));

vi.mock("jose", () => ({
  decodeJwt: vi.fn(),
}));

describe("DeviceAuthorizer", () => {
  const mockDomain = "example.auth0.com";
  const mockClientId = "test-client-id";

  const mockOptions: DeviceAuthorizerOptions = {
    scope: "openid profile email",
    audience: "https://api.example.com",
  };

  const mockDiscoveryConfig = {};

  const mockHandle = {
    verification_uri_complete: "https://example.com/verify?user_code=ABC123",
    user_code: "ABC123",
    expires_in: 1800,
  };

  const mockTokens = {
    token_type: "bearer",
    access_token: "access-token-123",
    id_token: "id-token-456",
  };

  const mockClaims = { sub: "user123", name: "Test User" };

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.AUTH0_DOMAIN = mockDomain;
    process.env.AUTH0_CLIENT_ID = mockClientId;

    vi.resetAllMocks();

    (discovery as any).mockResolvedValue(mockDiscoveryConfig);

    (initiateDeviceAuthorization as any).mockResolvedValue(mockHandle);

    (pollDeviceAuthorizationGrant as any).mockResolvedValue(mockTokens);

    mockPrompt.mockResolvedValue({ confirmation: "" });

    (open as any).mockResolvedValue(undefined);

    (jose.decodeJwt as any).mockReturnValue(mockClaims);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create an instance with default environment variables", () => {
    // Act
    const authorizer = DeviceAuthorizer.create();

    // Assert
    expect(authorizer).toBeInstanceOf(Function);
  });

  it("should authorize successfully and return credentials", async () => {
    // Arrange
    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi
      .fn()
      .mockResolvedValue("handler-output");

    // Act
    const deviceFlow = authorizer(mockOptions);
    const result = await deviceFlow(mockHandler)({}, undefined);

    // Assert
    expect(discovery).toHaveBeenCalledWith(
      new URL(`https://${mockDomain}`),
      mockClientId
    );

    expect(initiateDeviceAuthorization).toHaveBeenCalledWith(
      mockDiscoveryConfig,
      {
        scope: mockOptions.scope,
        audience: mockOptions.audience,
      }
    );

    expect(mockPrompt).toHaveBeenCalledWith({
      type: "input",
      name: "confirmation",
      message: expect.stringContaining(mockHandle.user_code),
    });

    expect(open).toHaveBeenCalledWith(mockHandle.verification_uri_complete);

    expect(pollDeviceAuthorizationGrant).toHaveBeenCalledWith(
      mockDiscoveryConfig,
      mockHandle
    );

    expect(jose.decodeJwt).toHaveBeenCalledWith(mockTokens.id_token);

    expect(mockHandler).toHaveBeenCalledWith(
      {
        accessToken: mockTokens.access_token,
        claims: mockClaims,
      },
      {},
      undefined
    );

    expect(result).toBe("handler-output");
  });

  it("should handle access_denied error gracefully", async () => {
    // Arrange
    (pollDeviceAuthorizationGrant as any).mockRejectedValue({
      error: "access_denied",
      error_description: "User denied access",
    });

    console.error = vi.fn();

    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi.fn();

    // Act
    const deviceFlow = authorizer(mockOptions);

    // Assert
    await expect(deviceFlow(mockHandler)({}, undefined)).rejects.toThrow(
      "Failed to obtain tokens"
    );

    expect(console.error).toHaveBeenCalledWith("\n\nCancelled interaction");
  });

  it("should handle expired_token error gracefully", async () => {
    // Arrange
    (pollDeviceAuthorizationGrant as any).mockRejectedValue({
      error: "expired_token",
      error_description: "The device flow has expired",
    });

    console.error = vi.fn();

    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi.fn();

    // Act
    const deviceFlow = authorizer(mockOptions);

    // Assert
    await expect(deviceFlow(mockHandler)({}, undefined)).rejects.toThrow(
      "Failed to obtain tokens"
    );

    expect(console.error).toHaveBeenCalledWith("\n\nDevice flow expired");
  });

  it("should handle unknown errors gracefully", async () => {
    // Arrange
    (pollDeviceAuthorizationGrant as any).mockRejectedValue({
      error: "server_error",
      error_description: "An unknown server error occurred",
    });

    console.error = vi.fn();

    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi.fn();

    // Act
    const deviceFlow = authorizer(mockOptions);

    // Assert
    await expect(deviceFlow(mockHandler)({}, undefined)).rejects.toThrow(
      "Failed to obtain tokens"
    );

    expect(console.error).toHaveBeenCalledWith(
      "Error: server_error; Description: An unknown server error occurred"
    );
  });

  it("should throw an error if tokens are not obtained", async () => {
    // Arrange
    (pollDeviceAuthorizationGrant as any).mockResolvedValue(null);

    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi.fn();

    // Act
    const deviceFlow = authorizer(mockOptions);

    // Assert
    await expect(deviceFlow(mockHandler)({}, undefined)).rejects.toThrow(
      "Failed to obtain tokens"
    );
  });

  it("should handle missing id_token gracefully", async () => {
    // Arrange
    const tokensWithoutIdToken = {
      token_type: "bearer",
      access_token: "access-token-123",
      // id_token is missing
    };
    (pollDeviceAuthorizationGrant as any).mockResolvedValue(
      tokensWithoutIdToken
    );

    const authorizer = DeviceAuthorizer.create();

    const mockHandler: ToolWithAuthHandler<any, any, any> = vi
      .fn()
      .mockResolvedValue("handler-output");

    // Act
    const deviceFlow = authorizer(mockOptions);
    const result = await deviceFlow(mockHandler)({}, undefined);

    // Assert
    expect(mockHandler).toHaveBeenCalledWith(
      {
        accessToken: tokensWithoutIdToken.access_token,
        claims: {}, // Since id_token is missing
      },
      {},
      undefined
    );

    // Verify the final result
    expect(result).toBe("handler-output");
  });

  it("should allow overriding clientId and domain via parameters", () => {
    // Arrange
    const customDomain = "custom.auth0.com";
    const customClientId = "custom-client-id";

    // Act
    const authorizer = DeviceAuthorizer.create({
      domain: customDomain,
      clientId: customClientId,
    });

    // Assert
    expect(authorizer).toBeInstanceOf(Function);
  });
});
