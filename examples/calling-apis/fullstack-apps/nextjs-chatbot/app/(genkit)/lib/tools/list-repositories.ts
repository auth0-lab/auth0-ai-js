import { Octokit, RequestError } from "octokit";
import { z } from "zod";

import { withGitHub } from "@/app/(genkit)/lib/auth0-ai";
import { ai } from "@/app/(genkit)/lib/genkit";
import { getCredentialsForConnection } from "@auth0/ai-genkit";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

export const listRepositories = ai.defineTool(
  ...withGitHub(
    {
      description: "List respositories for the current user on GitHub",
      inputSchema: z.object({}),
      name: "listRepositories",
    },
    async () => {
      // Get the access token from Auth0 AI
      const credentials = getCredentialsForConnection();

      // GitHub SDK
      try {
        const octokit = new Octokit({
          auth: credentials?.accessToken,
        });

        const { data } = await octokit.rest.repos.listForAuthenticatedUser();

        return data.map((repo) => repo.name);
      } catch (error) {
        if (error instanceof RequestError) {
          if (error.status === 401) {
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
