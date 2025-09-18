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
      const headers: Record<string, string> = {
        ...Object.fromEntries(req.headers.entries()),
      };

      // Remove Next.js session cookie header
      delete headers.Cookie;

      const accessToken = await getAccessToken();
      headers["Authorization"] = `Bearer ${accessToken}`;
      return headers;
    },
  });
