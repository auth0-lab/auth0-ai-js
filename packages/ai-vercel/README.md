# Auth0 AI for the [AI SDK](https://sdk.vercel.ai/)

`@auth0/ai-vercel` is an SDK for building secure AI-powered applications using [Auth0](https://www.auth0.ai/), [Okta FGA](https://docs.fga.dev/) and [AI SDK](https://sdk.vercel.ai/).

## Install

> [!WARNING]
> `@auth0/ai-vercel` is currently under development and it is not intended to be used in production, and therefore has no official support.

```
$ npm install @auth0/ai-vercel
```

## Usage

Initialize the SDK with your Auth0 credentials:

```javascript
import { Auth0AI } from "@auth0/ai-vercel";

const auth0AI = new Auth0AI({
  domain: "YOUR_AUTH0_DOMAIN",
  clientId: "YOUR_AUTH_CLIENT_ID",
  clientSecret: "YOUR_AUTH_CLIENT_SECRET",
});

// Alternatively you can use the `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`
// environment variables.
```

## Federated Connections

The federated connections feature of Auth0 can be used to progresively request scopes in a secure way.
The `Auth0AI` class provides a method to request scopes for a given connection.

First initialize the Federated Connection Authorizer as follows:

```javascript
import { auth0 } from "./auth0";

export const withCalendarFreeBusyAccess = auth0AI.withFederatedConnection({
  // A function to retrieve the refresh token of the context.
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken!;
    return refreshToken;
  },
  // The connection name.
  connection: 'google-oauth2',
  // The scopes to request.
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});
```

Then use the `withCalendarFreeBusyAccess` to wrap the tool and use `getFederatedConnectionAccessToken` from the SDK to get the access token.

```javascript
import {
  FederatedConnectionError,
  getFederatedConnectionAccessToken,
} from "@auth0/ai-vercel";

export const checkUsersCalendar = withCalendarFreeBusyAccess(
  tool({
    description:
      "Check user availability on a given date time on their calendar",
    parameters: z.object({
      date: z.coerce.date(),
    }),
    execute: async ({ date }) => {
      const accessToken = getFederatedConnectionAccessToken();
      const url = "https://www.googleapis.com/calendar/v3/freeBusy";
      const body = JSON.stringify({
        timeMin: date,
        timeMax: addHours(date, 1),
        timeZone: "UTC",
        items: [{ id: "primary" }],
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new FederatedConnectionError(
            `Authorization required to access the Federated Connection`
          );
        }
        throw new Error(
          `Invalid response from Google Calendar API: ${
            response.status
          } - ${await response.text()}`
        );
      }

      const busyResp = await response.json();
      return { available: busyResp.calendars.primary.busy.length === 0 };
    },
  })
);
```

## CIBA: Client Initiated Backchannel Authentication

```javascript
import { auth0 } from "./auth0";

export const buyStockAuthorizer = auth0AI.withCIBA({
  //Same parameters passed to the tool execute function
  userID: (params: { userID: string }, ctx) => params.userID,

  //The message the user will see on the notification
  bindingMessage: "Confirm the purchase",

  //The scopes and audience to request
  scope: "openid stock:trade",
  audience: "http://localhost:8081",

  //Store the authorization response
  storeAuthorizationResponse: async (
    response: AuthorizeResponse,
    { tradeID }: { tradeID: string }
  ) => {
    // eg
    // await db.set(`auth_response:${tradeID}`, JSON.stringify(response));
  },

  //Retrieve the authorization response
  getAuthorizationResponse: async ({ tradeID }: { tradeID: string }) => {
    //eg
    // return db.get(`auth_response:${tradeID}`);
  },
});
```

Then wrap the tool as follows:

```js
export const purchaseStock = buyStockAuthorizer({
  description: "Execute an stock purchase given stock ticker and quantity",
  parameters: z.object({
    tradeID: z
      .string()
      .uuid()
      .describe("The unique identifier for the trade provided by the user"),
    userID: z
      .string()
      .describe("The user ID of the user who created the conditional trade"),
    ticker: z.string().describe("The stock ticker to trade"),
    qty: z
      .number()
      .int()
      .positive()
      .describe("The quantity of shares to trade"),
  }),
  execute: async ({
    userID,
    ticker,
    qty,
  }: {
    userID: string,
    ticker: string,
    qty: number,
  }): Promise<string> => {
    const credentials = getCIBACredentials();
    //use credentials.accessToken to call the stock API.
    return `Just bought ${qty} shares of ${ticker} for ${userID}`;
  },
});
```

## FGA

```javascript
import { FGA_AI } from "@auth0/ai-vercel";

const auth0AI = new FGA_AI({
  apiScheme,
  apiHost
  storeId,
  credentials: {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer,
      clientId,
      clientSecret,
    },
  },
});
// Alternatively you can use env variables: `FGA_API_SCHEME`, `FGA_API_HOST`, `FGA_STORE_ID`, `FGA_API_TOKEN_ISSUER`, `FGA_CLIENT_ID` and `FGA_CLIENT_SECRET`
```

Then initialize the tool wrapper:

```js
const authorizedTool = fgaAI.withFGA(
  {
    buildQuery: async ({ userID, doc }) => ({
      user: userID,
      object: doc,
      relation: "read",
    }),
  },
  myAITool
);

// Or create a wrapper to apply to tools later
const authorizer = fgaAI.withFGA({
  buildQuery: async ({ userID, doc }) => ({
    user: userID,
    object: doc,
    relation: "read",
  }),
});

const authorizedTool = authorizer(myAITool);
```

Note: the parameter gives to the `buildQuery` function are the same provided to the tool's `execute` function.

## Interruptions

This library includes infrastructure code within the AI SDK to handle a concept called **Interruptions**.

In an LLM workflow, a tool call may fail because it requires additional input from the user—a process commonly known as **Human in the Loop**. We refer to this special type of error as an Interruption.

When a tool throws an error that extends the Interruption class, the AI SDK automatically serializes the error and returns it to the client.

The client can then process the interruption, obtain the necessary input, and resume execution within the tool chain.

Read [Setup Interruptions](./SETUP_INTERRUPTIONS.md) for more information.

## Feedback

### Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/auth0-lab/auth0-ai-python/issues).

### Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/responsible-disclosure-policy) details the procedure for disclosing security issues.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png"   width="150">
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_dark_mode.png" width="150">
    <img alt="Auth0 Logo" src="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png" width="150">
  </picture>
</p>
<p align="center">Auth0 is an easy to implement, adaptable authentication and authorization platform. To learn more checkout <a href="https://auth0.com/why-auth0">Why Auth0?</a></p>
<p align="center">
This project is licensed under the Apache 2.0 license. See the <a href="/LICENSE"> LICENSE</a> file for more info.</p>

