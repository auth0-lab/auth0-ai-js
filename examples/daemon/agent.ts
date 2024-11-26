import 'dotenv/config'
import { defineCommand, runMain } from 'citty';
import { interact, Auth0PollingCIBAAuthorizer } from '@auth0/ai';

// `@auth0/ai` can add human-in-the-loop orchestration to agents written in any
// framework.  Uncomment the example agent written in your preferred framework
// to host it as a background agent using CIBA to obtain authorization.
import { prompt } from '../agent-genkit';
// -- OR --
//import { prompt } from '../agent-llamaindex';



const main = defineCommand({
  meta: {
    name: "agent",
    version: "0.0.0",
    description: "An example AI trader with human approval",
  },
  args: {
    message: {
      type: "positional",
      description: "A message to the agent",
      required: false,
    },
    username: {
      alias: "u",
      type: "string",
      description: "Identifier for the user",
    }
  },
  async run({ args }) {
    // Instantiate a CIBA authorizer, which is suitable for obtaining
    // authorization via out-of-band channels.  Since this daemon runs in the
    // background, use of direct channels (such as HTTP redirection, common in
    // "traditional" OAuth flows) is not possible.
    const authorizer = new Auth0PollingCIBAAuthorizer({
      domain: process.env['DOMAIN'],
      clientId: process.env['CLIENT_ID'],
      clientSecret: process.env['CLIENT_SECRET']
    });
    
    // Wrap the agent's `prompt` method for interaction with the user.  When
    // the agent encounters an authorization challenge, `interact` will
    // orchestrate the process of obtaining necessary credentials, including
    // human-in-the-loop interaction if necessary.
    const interactivePrompt = interact(prompt, authorizer);
    const user = {
      id: args.username
    }
    
    let rv = await interactivePrompt({ user: user }, args.message);
    console.log(rv.message);
  },
});

runMain(main);
