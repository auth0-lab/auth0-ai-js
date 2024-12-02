# @auth0/ai

`@auth0/ai` is a framework for building secure AI-powered applications.

## Install

> [!WARNING]
> `@auth0/ai` is currently under development and not yet published to npm.

```
$ npm install @auth0/ai
```

## Usage

### User Interaction

Implement a function which is going to execute an action on behalf of a user.
The function obtains the current authentication context by `import`ing
`@auth0/ai/user`, `@auth0/ai/session`, and `@auth0/ai/tokens`.  Whenever an
action is taken that requires authorization, throw an `AuthorizationError`.

```js
import { user } from '@auth0/ai/user';
import { tokens } from '@auth0/ai/tokens';

export async function buyStock({ symbol, qty }) {
  const accessToken = tokens().accessToken;
  let headers = {};
  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken.value;
  }
  
  const response = await fetch('http://api.example.com:8081/orders', {
    method: 'POST',
    headers: headers,
    // ...
  });
  if (response.status == 401) {
    const challenge = parseWWWAuthenticateHeader(response.headers.get('WWW-Authenticate'));
    throw new AuthorizationError('You need authorization to buy stock', 'insufficient_scope', { scope: challenge.data.scope });
  }
  
  return 'OK';
}
```

Wrap the function with `interact` so that it can interact with the user for
authentication and authorization.  Supply an `authorizer` instance that is
suitable for the application's context.

```js
import { interact, Auth0PollingCIBAAuthorizer } from '@auth0/ai';

const authorizer = new Auth0PollingCIBAAuthorizer({
  domain: 'example.auth0.com',
  clientId: process.env['AUTH0_CLIENT_ID'],
  clientSecret: process.env['AUTH0_CLIENT_SECRET']
});

const interactiveBuyStock = interact(buyStock, authorizer);
```

Invoke the interactive function.  Whenever an `AuthorizationError` is thrown,
the user will be prompted.  Once authorization has been granted, the function
will be re-invoked with with newly issued credentials.

```js
const user = {
  id: '248289761001',
  email: 'janedoe@example.com',
  idToken: 'eyJhbGci...'
}

const result = await interactiveBuyStock({ user: user }, { symbol: ZEKO, qty: 10});
```

> [!TIP]
> Interaction works with any function, but it is designed to be used with AI
> frameworks that invoke tools based on natural-language prompts from the user.

Examples of tool-calling agents are available in a variety of popular frameworks:

  - [Genkit](../../examples/agent-genkit)
  - [LlamaIndex](../../examples/agent-llamaindex)

The agents can be made interactive by "hosting" them in variety of application
contexts:

  - [daemon](../../examples/daemon) - A background agent that interacts out-of-band
    via CIBA polling.
  - [express](../../examples/daemon) - A "stateless" background agent that interacts
    out-of-band via CIBA notifications.
