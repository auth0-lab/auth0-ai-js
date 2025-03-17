import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

import { auth0 } from "@/lib/auth0";

const getRefreshToken = async () => {
  const session = await auth0.getSession();
  const refreshToken = session?.tokenSet.refreshToken as string;
  return refreshToken;
};

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl: process.env.LANGGRAPH_API_URL,
    apiKey: process.env.LANGSMITH_API_KEY,
    runtime: "edge",
    baseRoute: "langgraph/",
    bodyParameters: async (req, body) => {
      if (
        req.nextUrl.pathname.endsWith("/runs/stream") &&
        req.method === "POST"
      ) {
        return {
          ...body,
          config: {
            configurable: {
              _credentials: {
                refreshToken: await getRefreshToken(),
              },
            },
          },
        };
      }

      return body;
    },
  });
