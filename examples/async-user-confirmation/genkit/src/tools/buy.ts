import { z } from "genkit";
import { GenkitBeta } from "genkit/beta";

import { getCIBACredentials } from "@auth0/ai-genkit";

import { useCIBA } from "../authorizers/ciba";
import { useDeviceFLow } from "../authorizers/deviceFlow";

export function buyTool(ai: GenkitBeta) {
  return ai.defineTool(
    ...useDeviceFLow(
      ...useCIBA(
        {
          name: "buy",
          description: "Use this function to buy stock",
          inputSchema: z.object({
            ticker: z.string(),
            qty: z.number(),
          }),
          outputSchema: z.string(),
        },
        async ({ ticker, qty }) => {
          const headers = {
            Authorization: "",
            "Content-Type": "application/json",
          };
          const body = {
            ticker: ticker,
            qty: qty,
          };

          const credentials = getCIBACredentials();
          const accessToken = credentials?.accessToken;

          if (accessToken) {
            headers["Authorization"] = "Bearer " + accessToken;
          }

          const response = await fetch(process.env["API_URL"]!, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
          });

          return response.statusText;
        }
      )
    )
  );
}
