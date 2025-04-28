import { z } from "zod";

import { getCredentialsForConnection } from "@auth0/ai-langchain";
import { FederatedConnectionError } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";
import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";

import { withGitHub } from "../auth0-ai";

export const listRepositories = withGitHub(
  tool(
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
    {
      name: "list_github_repositories",
      description: "List respositories for the current user on GitHub",
      schema: z.object({}),
    }
  )
);
