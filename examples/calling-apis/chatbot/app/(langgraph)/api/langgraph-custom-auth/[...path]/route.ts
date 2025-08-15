import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

// Helper function to get authenticated session
async function getAuthenticatedSession() {
  const session = await auth0.getSession();
  if (!session?.tokenSet?.accessToken) {
    throw new Error("Unauthorized");
  }
  return session;
}

// Helper function to add authentication context to request body
function addAuthContext(body: any, session: any) {
  return {
    ...body,
    config: {
      configurable: {
        _credentials: {
          accessToken: session.tokenSet.accessToken,
          refreshToken: session.tokenSet.refreshToken,
          userId: session.user?.sub,
        },
      },
    },
  };
}

// Helper function to make authenticated request to LangGraph
async function makeLangGraphRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
) {
  const langGraphUrl = `${process.env.LANGGRAPH_API_URL}${endpoint}`;
  console.log("langGraphUrl!!!!!!!!!!!!!!!!!!!!!!!!!!!", `Bearer ${process.env.LANGSMITH_API_KEY}`);
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

// Handle POST requests (create runs, submit messages, create threads, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getAuthenticatedSession();
    const body = await request.json();
    
    // Await params before accessing its properties
    const { path } = await params;
    
    // Construct the endpoint from the path segments
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    let requestBody = body;

    // Handle different types of POST requests
    if (endpoint.includes("/runs")) {
      requestBody = addAuthContext(body, session);
    } else if (endpoint.includes("/threads")) {
      requestBody = body; // Thread creation doesn't need auth context
    } else {
      // For other endpoints, add auth context by default
      requestBody = addAuthContext(body, session);
    }

    const response = await makeLangGraphRequest(endpoint, "POST", requestBody);
    
    // Handle streaming responses
    if (endpoint.includes("/stream")) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Handle regular JSON responses
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

// Handle GET requests (streaming, thread info, run info, etc.)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await getAuthenticatedSession(); // Verify authentication
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Await params before accessing its properties
    const { path } = await params;
    
    // Construct the endpoint from the path segments
    let endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    // Add query parameters to endpoint
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`;
    }

    const response = await makeLangGraphRequest(endpoint);
    
    // Handle streaming responses
    if (endpoint.includes("/stream")) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Handle regular JSON responses
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

// Handle PUT requests (update runs, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getAuthenticatedSession();
    const body = await request.json();
    
    // Await params before accessing its properties
    const { path } = await params;
    
    // Construct the endpoint from the path segments
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    const requestBody = addAuthContext(body, session);
    const response = await makeLangGraphRequest(endpoint, "PUT", requestBody);
    
    const responseData = await response.json();
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error in LangGraph PUT:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle DELETE requests
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await getAuthenticatedSession(); // Verify authentication
    
    // Await params before accessing its properties
    const { path } = await params;
    
    // Construct the endpoint from the path segments
    const endpoint = path.length > 0 ? `/${path.join("/")}` : "/";
    
    const response = await makeLangGraphRequest(endpoint, "DELETE");
    
    const responseData = await response.json();
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error in LangGraph DELETE:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
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
