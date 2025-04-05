import type { Connection, ConnectionContext } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";

export const REFRESH_HEADER = "x-refresh-token";

export abstract class FederatedConnectionChatAgent<
  Env = unknown,
  State = unknown,
> extends AIChatAgent<Env, State> {
  refreshToken: string = "";

  async onRequest(request: Request) {
    request = this.#extractRefreshToken(request);

    const { pathname, searchParams } = new URL(request.url);
    if (pathname.endsWith("/refresh")) {
      return Response.redirect(
        new URL(searchParams.get("returnTo") ?? "/", request.url)
      );
    }
    return super.onRequest(request);
  }

  onConnect(connection: Connection, ctx: ConnectionContext) {
    ctx.request = this.#extractRefreshToken(ctx.request);
    return super.onConnect(connection, ctx);
  }

  #extractRefreshToken(request: Request) {
    const refreshToken = request.headers.get(REFRESH_HEADER);
    if (refreshToken) {
      this.refreshToken = refreshToken;
      request = new Request(request, { headers: new Headers(request.headers) });
      request.headers.delete(REFRESH_HEADER);
    }
    return request;
  }
}
