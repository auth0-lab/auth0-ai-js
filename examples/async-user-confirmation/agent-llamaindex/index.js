import { OpenAIAgent, FunctionTool } from "llamaindex";
import { user } from "@auth0/ai/user";
import { tokens } from "@auth0/ai/tokens";
import { AuthorizationError } from "@auth0/ai";
import { parseWWWAuthenticateHeader } from "http-auth-utils";

export async function prompt(params) {
  console.log("llama index prompt...");
  console.log(params);

  const buyTool = FunctionTool.from(
    async function ({ ticker, qty }) {
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        ticker: ticker,
        qty: qty,
      };

      const u = user();
      console.log("Buying stock for user: ");
      console.log(u);

      const accessToken = tokens().accessToken;
      if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken.value;
      }

      const response = await fetch("http://localhost:8081/", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });
      if (response.status == 401) {
        const challenge = parseWWWAuthenticateHeader(
          response.headers.get("WWW-Authenticate")
        );
        console.log(challenge);
        throw new AuthorizationError(
          "You need authorization to buy stock",
          "insufficient_scope",
          { scope: challenge.data.scope }
        );
      }

      var json = await response.json();
      return "OK";
    },
    {
      name: "buy",
      description: "Use this function to buy stock",
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "The ticker symbol",
          },
          qty: {
            type: "number",
            description: "The quantity",
          },
        },
        required: ["ticker", "qty"],
      },
    }
  );

  const agent = new OpenAIAgent({
    tools: [buyTool],
    verbose: true,
  });

  //return await agent.chat({ message: message });
  //try {
  return await agent.chat({ message: params });
  //} catch (ex) {
  //console.log('ex')
  //console.log(ex)
  //}
}
