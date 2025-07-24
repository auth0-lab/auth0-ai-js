import { Hono } from "hono";
import { cors } from "hono/cors";
import { decodeJwt } from "jose";

import { jwtAuthMiddleware } from "./middleware/auth";

import type { ApiResponse } from "shared/dist";
export const app = new Hono()

  .use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:3000"],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  )

  .get("/", (c) => {
    return c.text("Hello Hono!");
  })

  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello BHVR!",
      success: true,
    };
    console.log("✅ Success! Public /hello route called!");
    return c.json(data, { status: 200 });
  })

  // Protected API route
  .get("/api/external", jwtAuthMiddleware(), async (c) => {
    const user = c.get("user");

    // Extract and log the access token
    const authHeader = c.req.header("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    // console.log("🔑 Access Token:", accessToken);

    // Decode and log the JWT payload
    if (accessToken) {
      try {
        const decodedJwt = decodeJwt(accessToken);
        console.log("🔓 Decoded JWT:", JSON.stringify(decodedJwt, null, 2));
      } catch (error) {
        console.error("❌ Error decoding JWT:", error);
      }
    }

    const data: ApiResponse = {
      message: `Your access token was successfully validated! Welcome ${user.sub}`,
      success: true,
    };

    return c.json(data, { status: 200 });
  });

export default app;
