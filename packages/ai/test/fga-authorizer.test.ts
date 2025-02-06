import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClientCheckRequest,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

import { ToolWithAuthHandler } from "../src/authorizers";
import {
  FGAAuthorizer,
  FGAAuthorizerOptions,
  FGAAuthorizerParams,
} from "../src/authorizers/fga-authorizer";

vi.mock("@openfga/sdk", () => {
  return {
    OpenFgaClient: vi.fn().mockImplementation(() => ({
      check: vi.fn(),
    })),
    ConsistencyPreference: {
      HigherConsistency: "HIGHER_CONSISTENCY",
    },
    CredentialsMethod: {
      ClientCredentials: "client_credentials",
    },
  };
});

describe("FGAAuthorizer", () => {
  const mockCheck = vi.fn();
  const MockedOpenFgaClient = OpenFgaClient as any;

  beforeEach(() => {
    vi.resetAllMocks();

    MockedOpenFgaClient.mockImplementation(() => ({
      check: mockCheck,
    }));

    delete process.env.FGA_API_URL;
    delete process.env.FGA_STORE_ID;
    delete process.env.FGA_API_TOKEN_ISSUER;
    delete process.env.FGA_API_AUDIENCE;
    delete process.env.FGA_CLIENT_ID;
    delete process.env.FGA_CLIENT_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Static create method", () => {
    it("should initialize with default parameters when no params are provided", async () => {
      process.env.FGA_API_URL = "https://env.api.url";
      process.env.FGA_STORE_ID = "env_store_id";
      process.env.FGA_API_TOKEN_ISSUER = "env_token_issuer";
      process.env.FGA_API_AUDIENCE = "env_audience";
      process.env.FGA_CLIENT_ID = "env_client_id";
      process.env.FGA_CLIENT_SECRET = "env_client_secret";

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create();

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };
      const result = await wrappedHandler(input, undefined);

      // Assertions
      expect(OpenFgaClient).toHaveBeenCalledWith({
        apiUrl: "https://env.api.url",
        storeId: "env_store_id",
        credentials: {
          method: CredentialsMethod.ClientCredentials,
          config: {
            apiTokenIssuer: "env_token_issuer",
            apiAudience: "env_audience",
            clientId: "env_client_id",
            clientSecret: "env_client_secret",
          },
        },
      });

      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith({ allowed: true }, input, undefined);
      expect(result).toBe("handler_result");
    });

    it("should initialize with provided parameters", async () => {
      const params: FGAAuthorizerParams = {
        name: "custom_fga",
        apiUrl: "https://custom.api.url",
        storeId: "custom_store_id",
        credentials: {
          method: "custom_method",
          config: {
            apiTokenIssuer: "custom_token_issuer",
            apiAudience: "custom_audience",
            clientId: "custom_client_id",
            clientSecret: "custom_client_secret",
          },
        },
      };

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      const result = await wrappedHandler(input, undefined);

      // Assertions
      expect(OpenFgaClient).toHaveBeenCalledWith({
        apiUrl: "https://custom.api.url",
        storeId: "custom_store_id",
        credentials: {
          method: "custom_method",
          config: {
            apiTokenIssuer: "custom_token_issuer",
            apiAudience: "custom_audience",
            clientId: "custom_client_id",
            clientSecret: "custom_client_secret",
          },
        },
      });

      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith({ allowed: true }, input, undefined);
      expect(result).toBe("handler_result");
    });

    it("should fallback to environment variables when params are missing", async () => {
      process.env.FGA_API_URL = "https://env.api.url";
      process.env.FGA_API_TOKEN_ISSUER = "env_token_issuer";
      process.env.FGA_API_AUDIENCE = "env_audience";
      process.env.FGA_CLIENT_ID = "env_client_id";
      process.env.FGA_CLIENT_SECRET = "env_client_secret";

      const params: FGAAuthorizerParams = {
        name: "partial_fga",
        storeId: "partial_store_id",
      };

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      const result = await wrappedHandler(input, undefined);

      // Assertions
      expect(OpenFgaClient).toHaveBeenCalledWith({
        apiUrl: "https://env.api.url",
        storeId: "partial_store_id",
        credentials: {
          method: CredentialsMethod.ClientCredentials,
          config: {
            apiTokenIssuer: "env_token_issuer",
            apiAudience: "env_audience",
            clientId: "env_client_id",
            clientSecret: "env_client_secret",
          },
        },
      });

      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith({ allowed: true }, input, undefined);
      expect(result).toBe("handler_result");
    });

    it("should handle missing environment variables gracefully", async () => {
      process.env.FGA_STORE_ID = "env_store_id";

      const params: FGAAuthorizerParams = {
        name: "partial_fga",
      };

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      // Depending on the implementation, missing environment variables might throw an error
      // Here, we'll assume that storeId is required and others have defaults or are optional
      // Adjust the expectations based on your actual implementation
      await expect(wrappedHandler(input, undefined)).resolves.toBe(
        "handler_result"
      );

      // Assertions
      expect(OpenFgaClient).toHaveBeenCalledWith({
        apiUrl: "https://api.us1.fga.dev",
        storeId: "env_store_id",
        credentials: {
          method: CredentialsMethod.ClientCredentials,
          config: {
            clientId: undefined,
            clientSecret: undefined,
            apiAudience: "https://api.us1.fga.dev/",
            apiTokenIssuer: "fga.us.auth0.com",
          },
        },
      });

      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith({ allowed: true }, input, undefined);
    });
  });

  describe("Authorization Flow via create method", () => {
    it("should authorize and allow handler execution when allowed is true", async () => {
      const params: FGAAuthorizerParams = {
        name: "test_fga",
        storeId: "test_store_id",
      };

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      const result = await wrappedHandler(input, undefined);

      // Assertions
      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(OpenFgaClient).toHaveBeenCalled();
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith({ allowed: true }, input, undefined);
      expect(result).toBe("handler_result");
    });

    it("should authorize and pass allowed as false when authorization fails", async () => {
      const params: FGAAuthorizerParams = {
        name: "test_fga",
        storeId: "test_store_id",
      };

      mockCheck.mockResolvedValue({ allowed: false });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      const result = await wrappedHandler(input, undefined);

      // Assertions
      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(OpenFgaClient).toHaveBeenCalled();
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith(
        { allowed: false },
        input,
        undefined
      );
      expect(result).toBe("handler_result");
    });

    it("should propagate errors from authorization", async () => {
      const params: FGAAuthorizerParams = {
        name: "test_fga",
        storeId: "test_store_id",
      };

      mockCheck.mockRejectedValue(new Error("FGA check failed"));

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn();

      const wrappedHandler = createAuthorizer(options)(handler);

      const input: any = { userId: "user123", resourceId: "res456" };

      await expect(wrappedHandler(input, undefined)).resolves.toBe(
        "The user is not allowed to perform the action."
      );

      // Assertions
      expect(buildQueryMock).toHaveBeenCalledWith(input);
      expect(OpenFgaClient).toHaveBeenCalled();
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle undefined toolExecutionParams gracefully", async () => {
      const params: FGAAuthorizerParams = {
        name: "test_fga",
        storeId: "test_store_id",
      };

      mockCheck.mockResolvedValue({ allowed: true });

      const createAuthorizer = FGAAuthorizer.create(params);

      const buildQueryMock = vi.fn().mockResolvedValue({
        user: "user",
        relation: "relation",
        object: "object",
      } as ClientCheckRequest);

      const options: FGAAuthorizerOptions = {
        buildQuery: buildQueryMock,
      };

      const handler: ToolWithAuthHandler<{ allowed?: boolean }, string, any> =
        vi.fn().mockResolvedValue("handler_result");

      const wrappedHandler = createAuthorizer(options)(handler);

      const result = await wrappedHandler(undefined as any, undefined);

      // Assertions
      expect(buildQueryMock).toHaveBeenCalledWith(undefined);
      expect(OpenFgaClient).toHaveBeenCalled();
      expect(mockCheck).toHaveBeenCalledWith(
        { user: "user", relation: "relation", object: "object" },
        { consistency: ConsistencyPreference.HigherConsistency }
      );
      expect(handler).toHaveBeenCalledWith(
        { allowed: true },
        undefined,
        undefined
      );
      expect(result).toBe("handler_result");
    });
  });
});
