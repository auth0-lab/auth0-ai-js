# agent-ai-sdk

This is an example agent implemented using [LlamaIndex.TS](https://ts.llamaindex.ai/).

The tool calls make requests to HTTP endpoints, and expect to be provided with
an access token that is obtained by `import`ing `'@auth0/ai/tokens'`. If the
access token does not have sufficient context, the `WWW-Authenticate` challenge
header is parsed, and an `AuthorizationError` is thrown.

This agent is "hosted" within an application that allows it to interact with the
user to obtain authorization. Example host applications demonstrate how to
interact in a variety of contexts:

- [daemon](../daemon) - A background agent that interacts out-of-band via CIBA
  polling.
- [express](../../examples/daemon) - A "stateless" background agent that
  interacts out-of-band via CIBA notifications.

Whenever authorization is needed, the user will be prompted. Once authorization
has been granted, the agent will be re-invoked with a newly issued access token,
which should allow the previously denied tool call to succeed.
