import express from "express";
import crypto from "node:crypto";
import { auth } from "express-openid-connect";
import process from "node:process";
import open from "open";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "node:process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a server to authenticate the user.
 *
 * @param {object} params - The configuration object
 * @param {object} [params.auth0] - The configuration object
 * @param {string} [params.auth0.clientID] - The Auth0 client ID
 * @param {string} [params.auth0.clientSecret] - The Auth0 client secret
 * @param {string} [params.auth0.domain] - The Auth0 domain
 * @param {object} [params.authParams] - The authorization params
 * @param {string} [params.authParams.scope] - The scopes for the auth
 * @param {string} [params.authParams.audience] - The audience for the auth
 * @param {number} [params.port] - The port to run the server on
 *
 * @returns {Promise<{
 *  user: Record<string, any>,
 *  accessToken: string,
 *  refreshToken: string,
 *  idToken: string
 * }>}
 */
export const login = async ({ auth0, authParams, port }) => {
  port = port || 5123;

  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(
      auth({
        authRequired: false,
        secret: crypto.randomBytes(32).toString("base64"),
        baseURL: `http://localhost:${port}`,
        clientID: auth0?.clientID || process.env.AUTH0_CLIENT_ID,
        clientSecret: auth0?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
        issuerBaseURL: `https://${auth0?.domain || process.env.AUTH0_DOMAIN}`,
        authorizationParams: {
          response_type: "code",
          response_mode: "query",
          audience: authParams?.audience,
          scope: authParams?.scope ?? "openid",
        },
      })
    );

    app.get("/", async (req, res) => {
      if (!req.oidc.isAuthenticated()) {
        return res.oidc.login({
          returnTo: "/",
        });
      }
      resolve({
        user: req.oidc.user,
        accessToken: req.oidc.accessToken?.access_token,
        refreshToken: req.oidc.refreshToken,
        idToken: req.oidc.idToken,
      });
      res.send("Logged in. Please close this tab and return to the example...");
      await sleep(500);
      server.close();
    });

    const server = app.listen(port, async () => {
      await sleep(1000);
      const rl = createInterface({ input, output });
      await rl.question(`Press enter to start the login process...`);
      rl.close();
      open(`http://localhost:${port}/`);
    });
  });
};
