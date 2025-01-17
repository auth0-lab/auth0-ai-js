# daemon

This example illustrates how to host an agent in an application that runs in the
background, performing tasks without direct user interaction.

The application can host an agent developed with any of a variety of popular AI
frameworks. An example stock trading agent is available using the following
frameworks:

- [Genkit](<(../agent-genkit)>)
- [LlamaIndex](<(../agent-llamaindex)>)

Because this agent runs in the background, it is unable to directly interact with
a human for any tasks which require human consent. Instead, it interacts with
via out-of-band channels using [OpenID Connect Client-Initiated Backchannel
Authentication Flow](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)
(CIBA).

[`@auth0/ai`](../../packages/ai) orchestrates the interaction between the agent
and the human, in this case through an instance of `PollingCIBAAuthorizer`. The
agent itself is unaware of the modality in which it is running, allowing it to
be hosted in multiple different contexts - without changes to the agent
architecture.

## Usage

```sh
$ npx tsx agent.ts -u "auth0|xxxxxxxxxxxxxxxxxxx" "Buy 100 shares of ZEKO"
```

+$ npx tsx agent.ts "Hi stock trader"
+$ npx tsx agent.ts "I'm interested in ZEKO"
+$ npx tsx agent.ts "Buy 100 shares of the company"
+$ npx tsx agent.ts "ZEKO"
