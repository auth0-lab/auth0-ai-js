import { Octokit, RequestError } from "octokit";
import { z } from "zod";

import { getAccessTokenForConnection } from "@auth0/ai-genkit";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

import { withGitHub } from "../auth0-ai";
import { ai } from "../genkit";

export const listRepositories = ai.defineTool(
  ...withGitHub(
    {
      description: "List respositories for the current user on GitHub",
      inputSchema: z.object({}),
      name: "listRepositories",
    },
    async () => {
      const credentials = getAccessTokenForConnection();

      try {
        // GitHub SDK
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
