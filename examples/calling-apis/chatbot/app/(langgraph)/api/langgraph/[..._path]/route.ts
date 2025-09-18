import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";
import { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";

async function getAccessToken() {
  const tokenResult = await auth0.getAccessToken();

  if (!tokenResult?.token) {
    throw new Error("Error retrieving access token for langgraph api.");
  }

  return tokenResult.token;
}

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    disableWarningLog: true,
    apiUrl: process.env.LANGGRAPH_API_URL,
    apiKey: process.env.LANGSMITH_API_KEY,
    runtime: "edge",
    baseRoute: "langgraph/",
    headers: async (req: NextRequest) => {
      const headers: Record<string, string> = {};

      // Only pass through essential headers for the LangGraph API
      const allowedHeaders = [
        "content-type",
        "content-length",
        "accept",
        "accept-encoding",
        "user-agent",
        "origin",
        "x-forwarded-for",
        "x-forwarded-host",
        "x-forwarded-port",
        "x-forwarded-proto",
      ];

      allowedHeaders.forEach((headerName) => {
        const value = req.headers.get(headerName);
        if (value) {
          headers[headerName] = value;
        }
      });

      const accessToken = await getAccessToken();
      headers["Authorization"] = `Bearer ${accessToken}`;
      return headers;
    },
  });
