import { jsonSchema, Tool, tool } from "ai";
import { google } from "googleapis";

import { asAgenticSchema, isZodSchema } from "@agentic/core";
import { GoogleDriveClient } from "@agentic/google-drive";
import { getAccessTokenForConnection } from "@auth0/ai-vercel";

import { withGoogleDriveTools } from "../auth0-ai";

const auth = new google.auth.OAuth2();
const drive = google.drive({ version: "v3", auth });
const client = new GoogleDriveClient({ drive });

export const googleDriveTools = Object.fromEntries(
  client.functions.map((fn) => [
    fn.spec.name,
    withGoogleDriveTools(
      tool({
        description: fn.spec.description,
        parameters: isZodSchema(fn.inputSchema)
          ? fn.inputSchema
          : jsonSchema(asAgenticSchema(fn.inputSchema).jsonSchema),
        execute: async (args) => {
          // Get the access token from Auth0 AI
          const accessToken = getAccessTokenForConnection();

          auth.setCredentials({
            access_token: accessToken,
          });

          // Execute Google Drive function from `@agentic`
          return fn.execute(args);
        },
      }) as Tool
    ),
  ])
);
