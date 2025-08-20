import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

async function getAuthenticatedSession() {
  const session = await auth0.getSession();
  if (!session?.tokenSet?.accessToken) {
    throw new Error("Unauthorized");
  }
  return session;
}

function addAuthContext(body: any, session: any) {
  return {
    ...body,
    config: {
      configurable: {
        _credentials: {
          refreshToken: session.tokenSet.refreshToken,
        },
      },
    },
  };
}

async function makeLangGraphRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
) {
  const langGraphUrl = `${process.env.LANGGRAPH_API_URL}${endpoint}`;
  const requestOptions: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${process.env.LANGSMITH_API_KEY}`,
      ...headers,
    },
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
    throw new Error(`LangGraph request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getAuthenticatedSession();
    const body = await request.json();
    
    const { path } = await params;
    
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    let requestBody = body;

    if (endpoint.includes("/runs")) {
      requestBody = addAuthContext(body, session);
    } else if (endpoint.includes("/threads")) {
      requestBody = body;
    } else {
      requestBody = addAuthContext(body, session);
    }

    const response = await makeLangGraphRequest(endpoint, "POST", requestBody);
    
    if (endpoint.includes("/stream")) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
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
