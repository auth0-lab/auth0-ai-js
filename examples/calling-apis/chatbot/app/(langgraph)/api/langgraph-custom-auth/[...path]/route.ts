import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

async function getAuthenticatedSession() {
  const session = await auth0.getSession();
  if (!session?.tokenSet?.accessToken) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function makeLangGraphRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
) {
  const langGraphUrl = `${process.env.LANGGRAPH_API_URL}${endpoint}`;
  const session = await getAuthenticatedSession();
  const requestOptions: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${session?.tokenSet?.refreshToken}`,
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

    if (!session?.tokenSet?.refreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const { path } = await params;
    
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";

    const response = await makeLangGraphRequest(endpoint, "POST", body);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await getAuthenticatedSession();
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const { path } = await params;
    
    let endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`;
    }

    const response = await makeLangGraphRequest(endpoint);
    
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
    console.error("Error in LangGraph GET:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
