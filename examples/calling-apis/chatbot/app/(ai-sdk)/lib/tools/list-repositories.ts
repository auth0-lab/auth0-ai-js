import { tool } from "ai";
import { Octokit, RequestError } from "octokit";
import { z } from "zod/v3";

import { withGitHub } from "@/app/(ai-sdk)/lib/auth0-ai";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { TokenVaultError } from "@auth0/ai/interrupts";

export const listRepositories = withGitHub(
  tool({
    description: "List repositories for the current user on GitHub",
    inputSchema: z.object({}),
    execute: async () => {
      // Get the access token from Auth0 AI
      const accessToken = getAccessTokenFromTokenVault();

      // GitHub SDK
      try {
        const octokit = new Octokit({
          auth: accessToken,
        });
        const { data } = await octokit.rest.repos.listForAuthenticatedUser();

        return data.map((repo) => repo.name);
      } catch (error) {
        if (error instanceof RequestError) {
          if (error.status === 401) {
            throw new TokenVaultError(
              `Authorization required to access the Token Vault`
            );
          }
        }

        throw error;
      }
    },
  })
);
