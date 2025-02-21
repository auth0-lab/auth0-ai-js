import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  // authorizationParameters: {
  //   // scope: 'openid profile offline_access email',
  //   access_type: 'offline',
  //   prompt: 'consent'
  // },
  async beforeSessionSaved(session, idToken) {
    return {
      ...session,
    }
  },
});
