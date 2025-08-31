import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

async function getAccessToken() {
  const tokenResult = await auth0.getAccessToken();

  if (!tokenResult?.token) {
    throw new Error("Error retrieving access token for langgraph api.");
  }

  return tokenResult.token;
}

function addAuthContext(body: any, accessToken: string) {
  return {
    ...body,
    config: {
      configurable: {
        _credentials: {
          accessToken,
        },
      },
    },
  };
}

async function makeLangGraphRequest(
  endpoint: string,
  method: string = "GET",
  accessToken: string,
  body?: any,
  additionalHeaders: Record<string, string> = {}
) {
  const langGraphUrl = `${process.env.LANGGRAPH_API_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    ...additionalHeaders,
  };

  // Pass Auth0 access token for the API in the Authorization header
  requestHeaders["Authorization"] = `Bearer ${accessToken}`;

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
    requestOptions.headers = {
      ...requestOptions.headers,
      "Content-Type": "application/json",
    };
  }

  const response = await fetch(langGraphUrl, requestOptions);

  if (!response.ok) {
    throw new Error(
      `LangGraph request failed: ${response.status} ${response.statusText}`
    );
  }

  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ _path: string[] }> }
) {
  try {
    const accessToken = await getAccessToken();
    const body = await request.json();

    const { _path } = await params;
    const path = _path || [];
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";

    let requestBody = body;

    if (endpoint.includes("/runs")) {
      requestBody = addAuthContext(body, accessToken);
    } else if (endpoint.includes("/threads")) {
      requestBody = body;
    } else {
      requestBody = addAuthContext(body, accessToken);
    }

    const response = await makeLangGraphRequest(
      endpoint,
      "POST",
      accessToken,
      requestBody
    );

    if (endpoint.includes("/stream")) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in LangGraph POST:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
