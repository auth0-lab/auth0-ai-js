import { tool } from "ai";
import { Octokit, RequestError } from "octokit";
import { z } from "zod";

import { withGitHub } from "@/lib/auth0-ai";
import { getAccessTokenForConnection } from "@auth0/ai-vercel";
import { FederatedConnectionError } from "@auth0/ai/interrupts";

export const listRepositories = withGitHub(
  tool({
    description: "List respositories for the current user on GitHub",
    parameters: z.object({}),
    execute: async () => {
      const credentials = getAccessTokenForConnection();

      try {
        // GitHub SDK
        const octokit = new Octokit({
          auth: credentials?.accessToken,
        });

        const { data } = await octokit.rest.repos.listForAuthenticatedUser();

        return data.map((repo) => repo.name);
      } catch (error) {
        console.log("Error", error);

        if (error instanceof RequestError) {
          if (error.status === 401) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            );
          }
        }

        throw error;
      }
    },
  })
);
