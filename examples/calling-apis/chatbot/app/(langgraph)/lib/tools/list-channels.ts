import { z } from "zod/v3";

import { getAccessTokenForConnection } from "@auth0/ai-langchain";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";
import { ErrorCode, WebClient } from "@slack/web-api";

import { withSlack } from "../auth0-ai";

export const listChannels = withSlack(
  tool(
    async () => {
      // Get the access token from Auth0 AI
      const accessToken = getAccessTokenForConnection();

      // Slack SDK
      try {
        const web = new WebClient(accessToken);

        const result = await web.conversations.list({
          exclude_archived: true,
          types: "public_channel,private_channel",
          limit: 10,
        });

        return result.channels?.map((channel) => channel.name);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === ErrorCode.HTTPError) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            );
          }
        }

        throw error;
      }
    },
    {
      name: "list_slack_channels",
      description: "List channels for the current user on Slack",
      schema: z.object({}),
    }
  )
);
