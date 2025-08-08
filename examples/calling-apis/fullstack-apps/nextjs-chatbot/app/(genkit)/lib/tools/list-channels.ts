import { z } from "zod";

import { withSlack } from "@/app/(genkit)/lib/auth0-ai";
import { ai } from "@/app/(genkit)/lib/genkit";
import { getCredentialsForConnection } from "@auth0/ai-genkit";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { ErrorCode, WebClient } from "@slack/web-api";

export const listChannels = ai.defineTool(
  ...withSlack(
    {
      description: "List channels for the current user on Slack",
      inputSchema: z.object({}),
      name: "listChannels",
    },
    async () => {
      // Get the access token from Auth0 AI
      const credentials = getCredentialsForConnection();

      // Slack SDK
      try {
        const web = new WebClient(credentials?.accessToken);

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
    }
  )
);
