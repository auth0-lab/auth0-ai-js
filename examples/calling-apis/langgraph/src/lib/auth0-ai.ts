import { Auth0AI } from "@auth0/ai-langchain";

const auth0AI = new Auth0AI();

export const withCalendarFreeBusyAccess = auth0AI.withTokenForConnection({
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
});
