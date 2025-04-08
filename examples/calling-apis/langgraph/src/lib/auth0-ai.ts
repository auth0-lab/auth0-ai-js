import { Auth0AI } from "@auth0/ai-langchain";

const auth0AI = new Auth0AI();

export const withGoogleCalendar = auth0AI.withTokenForConnection({
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});

export const withGitHub = auth0AI.withTokenForConnection({
  connection: "github",
  scopes: ["repo"],
});

export const withSlack = auth0AI.withTokenForConnection({
  connection: "sign-in-with-slack",
  scopes: ["channels:read", "groups:read"],
});
