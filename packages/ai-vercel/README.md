# Auth0 AI for the [AI SDK](https://sdk.vercel.ai/)

`@auth0/ai-vercel` is an SDK for building secure AI-powered applications using [Auth0](https://www.auth0.ai/), [Okta FGA](https://docs.fga.dev/) and [AI SDK](https://sdk.vercel.ai/).

## Install

> [!WARNING] > `@auth0/ai-vercel` is currently under development and not yet published to npm.

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
  clientSecret: "YOUR_AUTH_CLIENT_SECRET"
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
import { FederatedConnectionError, getFederatedConnectionAccessToken } from "@auth0/ai-vercel";

export const checkUsersCalendar = withCalendarFreeBusyAccess(
  tool({
    description: "Check user availability on a given date time on their calendar",
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
        throw new Error(`Invalid response from Google Calendar API: ${response.status} - ${await response.text()}`);
      }

      const busyResp = await response.json();
      return { available: busyResp.calendars.primary.busy.length === 0 };
    },
  })
);
```

## Interruptions

This library includes infrastructure code within the AI SDK to handle a concept called **Interruptions**.

In an LLM workflow, a tool call may fail because it requires additional input from the user—a process commonly known as **Human in the Loop**. We refer to this special type of error as an Interruption.

When a tool throws an error that extends the Interruption class, the AI SDK automatically serializes the error and returns it to the client.

The client can then process the interruption, obtain the necessary input, and resume execution within the tool chain.

Read [Setup Interruptions](./SETUP_INTERRUPTIONS.md) for more information.

## License

`@auth0/ai-vercel` is [Apache-2.0 Licensed](./LICENSE).
```
