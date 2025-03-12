import "dotenv/config";

import { endOfMonth, startOfMonth } from "date-fns";

import {
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
  TypeName,
} from "@openfga/sdk";

async function asyncFilter<T>(
  arr: T[],
  predicate: (value: T) => Promise<boolean>
): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_, index) => results[index]);
}

/**
 * Initializes the OpenFgaClient, writes an authorization model, and configures pre-defined tuples.
 *
 * This function performs the following steps:
 *    1. Creates an instance of OpenFgaClient with the necessary configuration.
 *    2. Writes an authorization model with specified schema version and type definitions.
 *    3. Configures pre-defined tuples using the newly created authorization model.
 */
async function main() {
  const fgaClient = new OpenFgaClient({
    apiUrl: process.env.FGA_API_URL || "https://api.us1.fga.dev",
    storeId: process.env.FGA_STORE_ID!,
    credentials: {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER || "auth.fga.dev",
        apiAudience: process.env.FGA_API_AUDIENCE || "https://api.us1.fga.dev/",
        clientId: process.env.FGA_CLIENT_ID!,
        clientSecret: process.env.FGA_CLIENT_SECRET!,
      },
    },
  });

  // 01. WRITE MODEL
  const model = await fgaClient.writeAuthorizationModel({
    schema_version: "1.1",
    type_definitions: [
      { type: "user", relations: {} },
      {
        type: "asset",
        relations: {
          _restricted_employee: { this: {} },
          can_buy: {
            difference: {
              base: { this: {} },
              subtract: { computedUserset: { relation: "restricted" } },
            },
          },
          restricted: {
            computedUserset: { relation: "_restricted_employee" },
          },
        },
        metadata: {
          relations: {
            _restricted_employee: {
              directly_related_user_types: [
                {
                  type: "company",
                  condition: "is_trading_window_closed",
                  relation: "employee",
                },
              ],
            },
            can_buy: {
              directly_related_user_types: [
                { type: "user" },
                { type: "user", wildcard: {} },
              ],
            },
            restricted: { directly_related_user_types: [] },
          },
        },
      },
      {
        type: "company",
        relations: { employee: { this: {} } },
        metadata: {
          relations: {
            employee: { directly_related_user_types: [{ type: "user" }] },
          },
        },
      },
    ],
    conditions: {
      is_trading_window_closed: {
        name: "is_trading_window_closed",
        expression: "current_time > from && current_time < to",
        parameters: {
          current_time: { type_name: TypeName.Timestamp },
          from: { type_name: TypeName.Timestamp },
          to: { type_name: TypeName.Timestamp },
        },
      },
    },
  });

  console.log("NEW MODEL ID: ", model.authorization_model_id);

  // Company Stock Restriction
  const assetsTuples = [
    { user: "user:*", relation: "can_buy", object: "asset:ZEKO" },
    { user: "user:*", relation: "can_buy", object: "asset:ATKO" },
  ];

  // ATKO Employee
  const restrictedEmployeesTuples = [
    { user: "user:john", relation: "employee", object: "company:ATKO" },
  ];

  // ATKO Trading Window Restriction
  const restictedAssetsTuples = [
    {
      user: "company:ATKO#employee",
      relation: "_restricted_employee",
      object: "asset:ATKO",
      condition: {
        name: "is_trading_window_closed",
        context: {
          from: startOfMonth(new Date()).toISOString(),
          to: endOfMonth(new Date()).toISOString(),
        },
      },
    },
  ];

  // 02. CONFIGURE PRE-DEFINED TUPLES
  // exclude existing tuples because FGA will fail when tuple already exists
  const tuplesToWrite = await asyncFilter(
    [...assetsTuples, ...restictedAssetsTuples, ...restrictedEmployeesTuples],
    async (t) =>
      (
        await fgaClient.read(t, {
          consistency: ConsistencyPreference.HigherConsistency,
        })
      ).tuples.length === 0
  );

  if (tuplesToWrite.length) {
    await fgaClient.write(
      {
        writes: tuplesToWrite,
      },
      {
        authorizationModelId: model.authorization_model_id,
      }
    );
  }
}

main().catch(console.error);
